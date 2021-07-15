"use strict"

import * as LatLonUtils from "../../utils/utils-latlon"
import * as MapdDraw from "@mapd/mapd-draw/dist/mapd-draw"
import simplify from "simplify-js"
import { logger } from "../../utils/logger"

const { AABox2d, Mat2, Mat2d, Point2d, Vec2d } = MapdDraw
const MathExt = MapdDraw.Math

/* istanbul ignore next */
let LatLonCircleClass = null
let LatLonPolyClass = null

const LatLonViewIntersectUtils = {
  /**
   * @typedef {object} ProjectedPointData
   * Maintains the various projection states for a specific point
   *
   * @property {Point2d} merc_point 2D point defined in web-mercator projected space
   * @property {Point2d} screen_point 2D point defined in screen space
   * @property {Point2d} lonlat_point 2D point defined in lat/lon WGS84 space
   * @property {Point2d} [radians_point] Optional 2D point that is a copy of the lonlat_point,
   *                                     but defined in radians rather than degrees
   */

  /**
   * Initializes a structure that is meant to define a point/vertex projected
   * in 3-different spaces, lat/lon WGS84, web-mercator-projected, and screen-space
   * coordinates. This only builds struct. The point has not been defined or projected
   * yet.
   *
   * @returns {ProjectedPointData}
   */
  buildProjectedPointData: (include_radians = false) => {
    const rtn_obj = {
      merc_point: Point2d.create(),
      screen_point: Point2d.create(),
      lonlat_point: Point2d.create()
    }
    if (include_radians) {
      rtn_obj.radians_point = Point2d.create()
    }
    return rtn_obj
  },

  /**
   * Using a point defined in web-mercator space as input, initializes a ProjectedPointData struct
   * by transforming that merc point into lat/lon WGS84 (in degrees and optionally radians) and screen space.
   * @param {Point2d} initial_merc_point Initial web-mercator projected point to transform
   * @param {ProjectedPointData} out_point_data Struct to be initialized with the various projections of the input point
   * @param {Mat2d} model_matrix The affine transformation matrix of the parent of the initial mercator point
   * @param {Mat2d} worldToScreenMatrix The transformation matrix defining the world-to-screen space transformation
   * @returns {ProjectedPointData} returns the input out_point_data argument after it has been initialized
   */
  projectPoint: (
    initial_merc_point,
    out_point_data,
    model_matrix,
    worldToScreenMatrix
  ) => {
    if (model_matrix === null) {
      Point2d.copy(out_point_data.merc_point, initial_merc_point)
    } else {
      Point2d.transformMat2d(
        out_point_data.merc_point,
        initial_merc_point,
        model_matrix
      )
    }

    if (worldToScreenMatrix !== null) {
      Point2d.transformMat2d(
        out_point_data.screen_point,
        out_point_data.merc_point,
        worldToScreenMatrix
      )
    }

    LatLonUtils.conv900913To4326(
      out_point_data.lonlat_point,
      out_point_data.merc_point
    )

    if (out_point_data.radians_point !== undefined) {
      Vec2d.scale(
        out_point_data.radians_point,
        out_point_data.lonlat_point,
        MathExt.DEG_TO_RAD
      )
    }

    return out_point_data
  },

  /**
   * Does an initial check to see if two line segments might intersect. The numerator/denominator
   * arguments refer to the numerator/denominator of using a bezier form for describing the line intersection:
   * https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line_segment
   * This can check the numerator/denominator of the linear system of equations to determine if
   * they can intersect, avoiding the actual division. This is further detailed in "Chapter IV.6: Faster Line Segment Intersection"
   * of the book Graphics Gems III. Academic Press, Inc. pp. 199–202.
   * @param {number} numerator Numerator of the linear system of equations for bezier-based line segment intersections
   * @param {number} denominator Denominator of the linear system of equations for basier-based line segment intersections
   * @returns {boolean}
   */
  canIntersect: (numerator, denominator) => {
    if (denominator > 0) {
      if (
        numerator >= 0 &&
        (numerator < denominator ||
          MathExt.floatingPtEquals(numerator, denominator))
      ) {
        return true
      }
    } else if (
      numerator <= 0 &&
      (numerator > denominator ||
        MathExt.floatingPtEquals(numerator, denominator))
    ) {
      return true
    }
    return false
  },

  /**
   * @typedef {object} ViewBoundsIntersectData
   *
   * Describes intersection data defined by intersecting a specific line segment
   * against a view. This intersection data will include points that either
   * intersect or is contained by a view. The arrays of intersection points will
   * either be of size 2 (line segment intersects or is contained by a view) or
   * be size 0 (line segment does not intersect or is not contained by a view)
   *
   * @property {Point2d[]} latlon_pts Array of points defined in WGS84 lat/lon space that either intersect or are contained by a view
   * @property {Point2d[]} screen_pts Array of points defined in screen space that either intersect or are contained by a view
   *                                           This is the same set of points as latlon_pts above, but transformed into screen space.
   * @property {number[]} pts_t Array of real numbers between [0-1] indicating the normalized distance of the intersection pts relative to
   *                            the original line segment. For example, if t=0, the intersection point is the starting point of the line
   *                            segment. If t=1, it is the end point of the line segment, and if t=0.5, it is the midpoint of the
   *                            line segment. This will be in ascending sorted order.
   * @property {boolean} subdivide Set to true if the caller should subdivide the insection points found here.
   *                               For instance, We may not want to subdivide if the intersection line segment is completely horizontal or vertical
   */

  /**
   * Determines the intersect/contained points of a line segment
   * defined by a start/end point against the bounds of a view
   * Returns a struct describing any intersection points (will either be 2 or 0 points)
   * as well as a flag indicating whether the line segment defined by the intersection
   * points should be subdivided for draw.
   * @param {ProjectedPointData} start_point_data The start point of the line segment
   * @param {ProjectedPointData} end_point_data The end point of the line segment
   * @param {AABox2d} view_aabox Axis-aligned bounding box describing the
   *                                      intersection between the aabox of the current shape
   *                                      and the current view
   * @param {Mat2d} worldToScreenMatrix The world-to-screen transformation matrix
   * @returns {ViewBoundsIntersectData}
   */
  intersectViewBounds: (
    start_point_data,
    end_point_data,
    view_aabox,
    worldToScreenMatrix
  ) => {
    const x1 = start_point_data.lonlat_point[0]
    const y1 = start_point_data.lonlat_point[1]
    const x2 = end_point_data.lonlat_point[0]
    const y2 = end_point_data.lonlat_point[1]

    const line_aabox = AABox2d.create()
    AABox2d.encapsulatePt(line_aabox, line_aabox, start_point_data.lonlat_point)
    AABox2d.encapsulatePt(line_aabox, line_aabox, end_point_data.lonlat_point)

    const intersect_aabox = AABox2d.create()
    AABox2d.intersection(intersect_aabox, view_aabox, line_aabox)

    // The current stored t value for bounds intersection points.
    // The max t for intersection points will be 1, so setting this to
    // 2 as an initial value. Reminder we will return with 2 points, and
    // those 2 points should be returned in t ascending order to be continuous
    // with the start-point/end-point arguments passed. So when the 2nd intersect
    // point has been found, the comparison of the t for that intersection and
    // current_t (which would be associated with the first interesection
    // point) will determine whether to insert the new intersection point to the
    // front or the back of the array
    let current_t = 2.0

    /**
     * The returned object. It will either be empty (no interesections with the
     * view bounds) or it will have exactly 2 intersection points.
     */
    const rtn_obj = {
      /** intersect points in lat/lon space */
      latlon_pts: [],

      /** intersect points in screen space */
      screen_pts: [],

      // the normalized distance of each intersection point relative to the original
      // line segment. This will be in ascending sorted order.
      pts_t: [],

      /** whether the caller should subdivide the line segments between the
       * intersection points found here */
      subdivide: false
    }

    if (AABox2d.isEmpty(intersect_aabox)) {
      // no intersection with the view bounds
      // return empty intersection object
      return rtn_obj
    }

    const delta_x = x1 - x2
    const delta_y = y1 - y2

    if (delta_x === 0 || delta_y === 0) {
      // Early out:
      // The line segment lies on a line of latitude or longitude
      // Such lines do not need to be subdivided in web-mercator-projected
      // space because they will be vertical/horizontal when projected (i.e.
      // they will not exhibit any curvature)
      // Return empty object.
      // TODO(croot): support other projections?
      return rtn_obj
    }

    if (AABox2d.equals(intersect_aabox, line_aabox)) {
      // Early out: the intersection bounding box equals the
      // line segment's bounding box, meaning the entire line
      // segment is in view. Add the start/end points as intersection
      // points and mark the segment as needing subdividing.
      rtn_obj.latlon_pts.push(start_point_data.lonlat_point)
      rtn_obj.screen_pts.push(start_point_data.screen_point)
      rtn_obj.pts_t.push(0)
      rtn_obj.latlon_pts.push(end_point_data.lonlat_point)
      rtn_obj.screen_pts.push(end_point_data.screen_point)
      rtn_obj.pts_t.push(1)
      rtn_obj.subdivide = true
    } else {
      // need to do intersection checks against the side of the intersection bounds. There will be
      // exactly 2 intersections. The intersection check is a slightly simplified version of a
      // bezier-based line segment intersection formula:
      // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line_segment
      // This formula can be slightly simplified due to the intersection bounds being axis-aligned.
      // Ultimately you can eliminate some operations knowing that coordinate differences will be 0

      if (
        intersect_aabox[AABox2d.MINX] === intersect_aabox[AABox2d.MAXX] ||
        intersect_aabox[AABox2d.MINY] === intersect_aabox[AABox2d.MAXY]
      ) {
        // early out: there's no intersection with the view bounds
        // if the intersection aabox has no size in either dimension
        // by the time we reach here. The case where the line is horizontal/vertical
        // or the line is fully contained by the view should already be handled.
        // return empty intersection object
        return rtn_obj
      }

      const x3 = intersect_aabox[AABox2d.MINX]
      const x4 = intersect_aabox[AABox2d.MAXX]
      const y3 = intersect_aabox[AABox2d.MINY]
      const y4 = intersect_aabox[AABox2d.MAXY]

      const check_full_intersect = (
        numerator_t_functor,
        denominator_t_functor,
        numerator_u_functor,
        denominator_u_functor
      ) => {
        const denominator_t = denominator_t_functor()
        if (denominator_t === 0) {
          // colinear
          // TODO(croot): this needs filling out in the general case
          // NOTE: this should never be hit in the LonLatPoly case because of
          // the delta_x/delta_y === 0 check.
          console.assert(false, `Collinear intersection needs completing`)
          return true
        }
        const numerator_t = numerator_t_functor()
        if (
          LatLonViewIntersectUtils.canIntersect(numerator_t, denominator_t) &&
          LatLonViewIntersectUtils.canIntersect(
            numerator_u_functor(),
            denominator_u_functor()
          )
        ) {
          // NOTE: denominator_t should never be zero. There's an early out for
          // that case.
          const t = numerator_t / denominator_t

          if (MathExt.floatingPtEquals(t, current_t)) {
            // already found this specific interesection, so don't re-add
            // In this specific use case, since we're doing intersection tests
            // against each wall of an axis-aligned bounding box, the original
            // line-segment can intersect two walls that meet at a corner. In
            // that case one of the endpoitns of the original line defines the
            // bounds at that corner. That can result in recalculating the same
            // t at the corner for the two separate walls, so avoiding adding
            // a duplicate intersection point with this test.
            return false
          }

          let lonlat_pt = null
          let screen_pt = null
          if (MathExt.floatingPtEquals(t, 0)) {
            // the intersection point is the start point of the original segment, so
            // just re-use the start coord
            lonlat_pt = start_point_data.lonlat_point
            screen_pt = start_point_data.screen_point
          } else if (MathExt.floatingPtEquals(t, 1)) {
            // the intersection point is the end point of the original segment, so
            // just re-use the end coord
            lonlat_pt = end_point_data.lonlat_point
            screen_pt = end_point_data.screen_point
          } else {
            // calculate the lon/lat and screen point for the
            // intersection point given t
            const new_latlon_pt = Point2d.create(-delta_x * t, -delta_y * t)
            Point2d.addVec2(
              new_latlon_pt,
              start_point_data.lonlat_point,
              new_latlon_pt
            )
            lonlat_pt = new_latlon_pt

            const new_screen_pt = Point2d.clone(new_latlon_pt)
            // conver the new segment point back to mercator for drawing
            LatLonUtils.conv4326To900913(new_screen_pt, new_screen_pt)

            // now convert to screen space
            Point2d.transformMat2d(
              new_screen_pt,
              new_screen_pt,
              worldToScreenMatrix
            )
            screen_pt = new_screen_pt
          }
          rtn_obj.subdivide = true

          // insersection points must be stored by t in ascending order.
          // There will be exactly 2 points in the end, so just need to check
          // whether to insert this new intersection point at the front or back
          // of the returned point array
          if (t < current_t) {
            rtn_obj.latlon_pts.splice(0, 0, lonlat_pt)
            rtn_obj.screen_pts.splice(0, 0, screen_pt)
            rtn_obj.pts_t.splice(0, 0, t)
          } else {
            rtn_obj.latlon_pts.push(lonlat_pt)
            rtn_obj.screen_pts.push(screen_pt)
            rtn_obj.pts_t.push(t)
          }
          current_t = t
          return true
        }
        return false
      }

      // check left-edge of the bounds first, we know that delta_x = 0 for the points defining the left edge
      let delta_edge = x1 - x3
      check_full_intersect(
        () => delta_edge,
        () => delta_x,
        () => -delta_x * (y1 - y3) - -delta_y * delta_edge,
        () => delta_x * (y3 - y4)
      )

      // bounds top-edge
      delta_edge = y1 - y3
      check_full_intersect(
        () => -delta_edge,
        () => -delta_y,
        () => -delta_x * delta_edge - -delta_y * (x1 - x3),
        () => -delta_y * (x3 - x4)
      )

      if (rtn_obj.latlon_pts.length < 2) {
        // bounds right-edge, we know that delta_x = 0 for the points defining the right edge
        delta_edge = x1 - x4
        check_full_intersect(
          () => delta_edge,
          () => delta_x,
          () => -delta_x * (y1 - y3) - -delta_y * delta_edge,
          () => delta_x * (y3 - y4)
        )

        if (rtn_obj.latlon_pts.length < 2) {
          // bounds top edge
          delta_edge = y1 - y4
          check_full_intersect(
            () => -delta_edge,
            () => -delta_y,
            () => -delta_x * delta_edge - -delta_y * (x1 - x3),
            () => -delta_y * (x3 - x4)
          )
        }
      }
    }

    return rtn_obj
  }
}

/* istanbul ignore next */
export function getLatLonCircleClass() {
  if (!LatLonCircleClass) {
    LatLonCircleClass = class LatLonCircle extends MapdDraw.Circle {
      constructor(draw_engine, opts) {
        super(opts)

        this._draw_engine = draw_engine

        this._geomDirty = true
        this._viewDirty = true

        const that = this
        this._draw_engine.camera.on("changed", event => {
          that._viewDirty = true
        })

        // maximum length of subdivided line segment in pixels
        this._maxSegmentPixelDistance = 40

        this._initialRadius = this._radius

        // degrees between successive points in the drawn
        // segmented circle
        this._degrees_between_points = 6.0

        // Now calculate a baseline axis-aligned bounding box area based on the
        // max segment distance for subdividing. This will be used to do quick
        // checks on whether subdivision is needed or not.

        // obviously this circumferences is just an estimate, but good enough
        const base_screen_space_circumference =
          (360.0 / this._degrees_between_points) * this._maxSegmentPixelDistance

        const base_screen_space_diameter =
          base_screen_space_circumference / Math.PI

        // w * h
        this._base_screen_area =
          base_screen_space_diameter * base_screen_space_diameter

        this._segmented_circle_points = []
        this._subdivided_screen_points = []

        const number_of_points = Math.floor(360 / this._degrees_between_points)

        for (let i = 0; i < number_of_points; ++i) {
          this._segmented_circle_points.push(
            LatLonViewIntersectUtils.buildProjectedPointData()
          )
        }
      }

      setScale(scale) {
        this.radius = this._initialRadius * Math.min(scale[0], scale[1])
      }

      set initialRadius(radius) {
        this.radius = radius
        this._initialRadius = radius
      }

      resetInitialRadius() {
        this._initialRadius = this.radius
      }

      /**
       * Creates a new 2d lat/lon point that lies on a LatLonCircle at a specific angle about
       * the center of the circle.
       * @param {CircleDescriptor} circle_descriptor An object describing the various geometric/geographic states of a lon/lat-defined circle.
       * @param {Point2d} output_point The coordinates of the new point will be stored in this object
       * @param {number} angle_radians The angle about the center point to position the new point in radians
       * @returns {Point2d} A new lon/lat point that is protruded a specific distance away from a center point at the specified angle
       */
      static initializePointOnCircle(
        circle_descriptor,
        output_point,
        angle_radians
      ) {
        const { center_radians, radius_radians } = circle_descriptor
        const cos_radius = Math.cos(radius_radians)
        const sin_radius = Math.sin(radius_radians)

        const [center_lon_radians, center_lat_radians] = center_radians
        const cos_lat = Math.cos(center_lat_radians)
        const sin_lat = Math.sin(center_lat_radians)

        const point_lat_radians = Math.asin(
          sin_lat * cos_radius + cos_lat * sin_radius * Math.cos(angle_radians)
        )
        const point_lon_radians =
          center_lon_radians +
          Math.atan2(
            Math.sin(angle_radians) * sin_radius * cos_lat,
            cos_radius - sin_lat * Math.sin(point_lat_radians)
          )

        // convert back to degrees
        Point2d.set(output_point, point_lon_radians, point_lat_radians)
        Vec2d.scale(output_point, output_point, MathExt.RAD_TO_DEG)
      }

      /**
       * Gets the angle of a specific point about the center of a circle.
       * @param {CircleDescriptor} circle_descriptor An object describing the various geometry/geography states of a LatLonCircle
       * @param {Point2d} point_lonlat The position of the point in lon/lat WGS84 coords in degrees
       * @param {Point2d} point_radians The position of the same point as point_lonlat but in radians instead of degrees
       * @returns {number} The angle of the point about the circle's center, in radians, in the range of [-PI, PI]
       */
      static getAngleOfPointAboutCircle(
        circle_descriptor,
        point_lonlat,
        point_radians
      ) {
        const { center_lonlat, center_radians } = circle_descriptor

        // distance between the points in kilometers using haversine
        const distance =
          LatLonUtils.distance_in_meters(
            center_lonlat[0],
            center_lonlat[1],
            point_lonlat[0],
            point_lonlat[1]
          ) / 1000.0

        // get the distance between the points in radians
        const dist_radians = LatLonCircle.getDistanceInRadians(distance)

        // solve for the new angle in radians, which is the inverse of finding the latitude in
        // initializePointDistanceFromCenter() method above
        const numerator =
          Math.sin(point_radians[1]) -
          Math.sin(center_radians[1]) * Math.cos(dist_radians)
        const denominator = Math.cos(center_radians[1]) * Math.sin(dist_radians)
        console.assert(
          denominator !== 0,
          `${center_lonlat}, ${center_radians}, ${point_lonlat}, ${point_radians}, ${distance}`
        )
        let divide = numerator / denominator
        if (divide > 1) {
          // should never get a ratio > 1, but if we do, check that it is approximately 1
          // and clamp
          console.assert(
            MathExt.floatingPtEquals(divide, 1),
            `${center_lonlat}, ${center_radians}, ${point_lonlat}, ${point_radians}, ${distance}`
          )
          divide = 1
        } else if (divide < -1) {
          // should never get a ratio < -1, but if we do, check that it is approximately -1
          // and clamp
          console.assert(
            MathExt.floatingPtEquals(divide, -1),
            `${center_lonlat}, ${center_radians}, ${point_lonlat}, ${point_radians}, ${distance}`
          )
          divide = -1
        }

        // make sure to return in a range of [-PI, PI], to do that, just check which side of the
        // center point the point to check falls.
        const angle = Math.acos(divide)
        if (point_lonlat[0] - center_lonlat[0] >= 0) {
          return angle
        }
        return MathExt.TWO_PI - angle
      }

      /**
       * @typedef ClosestCirclePointData
       * Data describing the closest point on a LatLonCircle
       *
       * @property {number} angle_degrees The angle of the closest point on the circle arc
       *                                  about the center of the circle.
       * @property {ProjectedPointData} closest_point_data The various projection/conversion states of the
       *                                                   closest point on a LatLonCircle
       */

      /**
       * Calculates the closest point on a circle's arc from a specific point in 2D space
       * @param {CircleDescriptor} circle_descriptor A descriptor of varions geometric/geographic properties of a LatLonCircle
       * @param {Point2d} point_lonlat A point in lon/lat WGS84 space to find the closest point to, in degrees
       * @param {Point2d} point_radians The same point as point_lonlat, but in radians rather than degrees
       * @param {Mat2d} worldToScreenMatrix Matrix describing the projection from web-mercator world space
       *                                    to screen space.
       * @returns {ClosestCirclePointData}
       */
      static getClosestPointOnCircleArc(
        circle_descriptor,
        point_lonlat,
        point_radians,
        worldToScreenMatrix
      ) {
        // get the angle from the center of the circle to the potential subdivide point
        let angle_radians = LatLonCircle.getAngleOfPointAboutCircle(
          circle_descriptor,
          point_lonlat,
          point_radians
        )
        const angle_degrees = angle_radians * MathExt.RAD_TO_DEG

        const closest_point_data = LatLonViewIntersectUtils.buildProjectedPointData()
        closest_point_data.angle_degrees = angle_degrees
        LatLonCircle.initializePointOnCircle(
          circle_descriptor,
          closest_point_data.lonlat_point,
          angle_radians
        )
        // convert from lon/lat to mercator
        LatLonUtils.conv4326To900913(
          closest_point_data.merc_point,
          closest_point_data.lonlat_point
        )
        Point2d.transformMat2d(
          closest_point_data.screen_point,
          closest_point_data.merc_point,
          worldToScreenMatrix
        )

        return {
          angle_degrees,
          closest_point_data
        }
      }

      /**
       * Returns a given distance in kilometers in radians
       * @param {number} distance Distance in kilometers
       * @returns {number} the distance in radians around the globe
       */
      static getDistanceInRadians(distance) {
        // radius is stored in kilometers, so convert kilometers to radians.
        // See: https://stackoverflow.com/questions/12180290/convert-kilometers-to-radians
        // for a discussion.
        // The 6372.79756 number is the earth's radius in kilometers and aligns with the
        // earth radius used in distance_in_meters in utils-latlon
        return distance / 6372.797560856
      }

      _updateGeom(circle_descriptor = null) {
        if (this._geomDirty || this._boundsOutOfDate) {
          if (circle_descriptor === null) {
            circle_descriptor = LatLonCircle.createCircleDescriptor(
              this.globalXform,
              this._radius
            )
          }

          AABox2d.initEmpty(this._aabox)

          for (
            let index = 0;
            index < this._segmented_circle_points.length;
            ++index
          ) {
            const point_data = this._segmented_circle_points[index]
            const { lonlat_point, merc_point } = point_data
            const angle_degrees = index * this._degrees_between_points
            const angle_radians = angle_degrees * MathExt.DEG_TO_RAD

            // store the angle for later validation
            point_data.angle_degrees = angle_degrees

            // rotate the sample point around the circle center using the radius distance in radians
            LatLonCircle.initializePointOnCircle(
              circle_descriptor,
              lonlat_point,
              angle_radians
            )

            // convert from lon/lat to mercator
            LatLonUtils.conv4326To900913(merc_point, lonlat_point)

            AABox2d.encapsulatePt(this._aabox, this._aabox, merc_point)
          }

          const pivot = Point2d.create(0, 0)
          AABox2d.getCenter(pivot, this._aabox)
          Point2d.sub(pivot, pivot, circle_descriptor.center_mercator)
          this.pivot = pivot

          this._geomDirty = false
          this._boundsOutOfDate = false
        }
      }

      /**
       * @typedef LatLonCircleSegmentEndpoints
       * Object describing the endpoints of a LatLonCircle line segment defining an
       * arc.
       * @param {number} start_angle Angle about the center of a LatLonCircle for the start point of the segment
       * @param {ProjectedPointData} start_point The start point of the LatLonCircle segment
       * @param {number} end_angle Angle about the center of a LatLonCircle for the end point of the segment
       * @param {ProjectedPointData} end_point The end point of the LatLonCircle segment
       */

      /**
       * Callback to retrieve the two endpoints of a LonLatCircle segment.
       *
       * @callback GetEndpointsFunctor
       * @param {ClosestCirclePointData} closest_point_data The point on a LatLonCircle arc used to determine the segment
       *                                                    of the LatLonCircle that defines that arc.
       * @returns {LatLonCircleSegmentEndpoints}
       */

      /**
       * Subdivides a line-segment of a LatLonCircle arc at the closest point on the circle to a
       * specific point in 2D space.
       * @param {CircleDescriptor} circle_descriptor Describes various geometric/geographic states of a LatLonCircle
       * @param {Point2d} point_lonlat Point in lon/lat WGS84 to drive the subdivision, in degrees.
       * @param {Point2d} point_radians The same point as point_lonlat, but in radians rather than degrees.
       * @param {AABox2d} shape_view_intersect_aabox Axis-aligned bounding box describing the
       *                                             intersection between the shape and the current view
       *                                             in WGS84 lat/lon coords
       * @param {Mat2d} worldToScreenMatrix 2D matrix describing the web-mercator to screen space transform.
       * @param {GetEndpointsFunctor} get_endpoints_functor
       * @returns
       */
      _subdivideCircleArcAtPoint(
        circle_descriptor,
        point_lonlat,
        point_radians,
        shape_view_intersect_aabox,
        worldToScreenMatrix,
        get_endpoints_functor
      ) {
        const {
          angle_degrees,
          closest_point_data
        } = LatLonCircle.getClosestPointOnCircleArc(
          circle_descriptor,
          point_lonlat,
          point_radians,
          worldToScreenMatrix
        )

        // Be sure that the view bounding box includes the closest point found on the circle.
        // But keep the original view bounding box untouched
        // NOTE: if zoomed in tight enough, the closest point on the circle here could end up off-screen,
        // and therefore cause the new bounds calculated here to not be fully contained by the original
        // view bounds.  Keep in mind that the 'shape_view_interseect_aabox' argument represents the
        // bounds intersection between the view bounds and the shape's bounding box. As a result this
        // may create unnecessary points that end up being drawn off-screen, but that's generally not
        // be a big deal as it should only generate a handful of points. And in fact, those extra points
        // may keep the circle arc protruded enough to prevent an unwanted jump in the render of the shape.
        // For example, if the closest point on the circle calculated here were off screen, the line segment
        // between this extra point and the original line segment points could still intersect the view, but
        // the arc of the circle may not. We want to prevent this. The potential extra points can prevent
        // this.
        const new_intersect_bounds = AABox2d.clone(shape_view_intersect_aabox)
        AABox2d.encapsulatePt(
          new_intersect_bounds,
          new_intersect_bounds,
          closest_point_data.lonlat_point
        )

        const {
          start_angle,
          start_point,
          end_angle,
          end_point
        } = get_endpoints_functor(angle_degrees, closest_point_data)

        const new_subdivided_points = []
        this._subdivideArc(
          new_subdivided_points,
          circle_descriptor,
          start_point,
          closest_point_data,
          start_angle,
          angle_degrees - start_angle,
          new_intersect_bounds,
          worldToScreenMatrix
        )

        new_subdivided_points.push(
          Point2d.clone(closest_point_data.screen_point)
        )

        this._subdivideArc(
          new_subdivided_points,
          circle_descriptor,
          closest_point_data,
          end_point,
          angle_degrees,
          end_angle - angle_degrees,
          new_intersect_bounds,
          worldToScreenMatrix
        )

        return new_subdivided_points
      }

      /**
       * Determines whether a line segment that represents an arc of a circle defined
       * by a start/end point should be further subdivided for drawing.
       * If the segment should be subdivided, will append subdivided points representing
       * the subdivided arc into the array of screen-projected points for drawing.
       * @param {Point2d[]} subdivided_points_array Array to append the subdivided points to
       * @param {Point2d} center_latlon Center of circle in WGS84 lon/lat coords
       * @param {Point2d} center_radians Center of the circle in lon/lat coords converted to radians
       * @param {ProjectedPointData} start_point_data Start point of the line segment
       * @param {ProjectedPointData} end_point_data End point of the line segment
       * @param {number} start_angle The angle about the center of the circle for the starting point of
       *                             this segment. In degrees.
       * @param {number} angle_diff The angle difference between the start point and the end point of this
       *                            segment. In degrees.
       * @param {AABox2d} shape_view_intersect_aabox Axis-aligned bounding box describing the
       *                                             intersection between the shape and the current view
       *                                             in WGS84 lat/lon coords
       * @param {Mat2d} worldToScreenMatrix Matrix defining world-to-screen transformation
       * @returns
       */
      _subdivideArc(
        subdivided_points_array,
        circle_descriptor,
        start_point_data,
        end_point_data,
        start_angle,
        angle_diff,
        shape_view_intersect_aabox,
        worldToScreenMatrix,
        do_extra_subdivide = false
      ) {
        const view_intersect_data = LatLonViewIntersectUtils.intersectViewBounds(
          start_point_data,
          end_point_data,
          shape_view_intersect_aabox,
          worldToScreenMatrix
        )

        if (!view_intersect_data.subdivide) {
          return
        }

        console.assert(
          view_intersect_data.latlon_pts.length === 2,
          `start_point: [${start_point_data.lonlat_point[0]}, ${start_point_data.lonlat_point[1]}], end_point: [${end_point_data.lonlat_point[0]}, ${end_point_data.lonlat_point[1]}], view_aabox: [${shape_view_intersect_aabox[0]}, ${shape_view_intersect_aabox[1]}, ${shape_view_intersect_aabox[2]}, ${shape_view_intersect_aabox[3]}], worldToScreenMatrix: [${worldToScreenMatrix[0]}, ${worldToScreenMatrix[1]}, ${worldToScreenMatrix[2]}, ${worldToScreenMatrix[3]}, ${worldToScreenMatrix[4]}, ${worldToScreenMatrix[5]}]`
        )

        const [start_screen_pt, end_screen_pt] = view_intersect_data.screen_pts
        const [start_latlon_pt, end_latlon_pt] = view_intersect_data.latlon_pts
        const [start_t, end_t] = view_intersect_data.pts_t

        const distance = Point2d.distance(start_screen_pt, end_screen_pt)
        if (distance > this._maxSegmentPixelDistance) {
          // TODO(croot); the 0.25 threshold is just an empirical "good enough". A more clever
          // metric could be used
          if (
            do_extra_subdivide &&
            !MathExt.floatingPtEquals(start_t, 0) &&
            !MathExt.floatingPtEquals(end_t, 1) &&
            end_t - start_t < 0.25
          ) {
            // get the angle from the center of the circle to the potential subdivide point
            const tmp_point = Point2d.clone(start_latlon_pt)
            const start_radians_pt = tmp_point
            Vec2d.scale(start_radians_pt, start_radians_pt, MathExt.DEG_TO_RAD)

            const {
              closest_point_data
            } = LatLonCircle.getClosestPointOnCircleArc(
              circle_descriptor,
              start_latlon_pt,
              start_radians_pt,
              worldToScreenMatrix
            )

            if (
              Point2d.distance(
                start_screen_pt,
                closest_point_data.screen_point
              ) > this._maxSegmentPixelDistance
            ) {
              const line_center_lonlat = tmp_point
              Point2d.lerp(
                line_center_lonlat,
                start_latlon_pt,
                end_latlon_pt,
                0.5
              )
              const line_center_radians = Point2d.clone(line_center_lonlat)
              Vec2d.scale(
                line_center_radians,
                line_center_radians,
                MathExt.DEG_TO_RAD
              )

              const that = this
              const new_subdivided_points = this._subdivideCircleArcAtPoint(
                circle_descriptor,
                line_center_lonlat,
                line_center_radians,
                shape_view_intersect_aabox,
                worldToScreenMatrix,
                (angle_degrees, new_point_data) => {
                  const start_angle = start_point_data.angle_degrees
                  const end_angle = start_angle + that._degrees_between_points
                  return {
                    start_angle,
                    start_point: start_point_data,
                    end_angle,
                    end_point: end_point_data
                  }
                }
              )

              subdivided_points_array.push(...new_subdivided_points)
              return
            }
          }

          const num_subdivisions = Math.ceil(
            distance / this._maxSegmentPixelDistance
          )

          const point_radians = Point2d.clone(start_latlon_pt)
          Vec2d.scale(point_radians, point_radians, MathExt.DEG_TO_RAD)
          const start_angle = LatLonCircle.getAngleOfPointAboutCircle(
            circle_descriptor,
            start_latlon_pt,
            point_radians
          )
          Point2d.copy(point_radians, end_latlon_pt)
          Vec2d.scale(point_radians, point_radians, MathExt.DEG_TO_RAD)
          const end_angle = LatLonCircle.getAngleOfPointAboutCircle(
            circle_descriptor,
            end_latlon_pt,
            point_radians
          )
          const angle_diff = (end_angle - start_angle) / num_subdivisions
          for (
            let current_angle = start_angle;
            current_angle <= end_angle;
            current_angle += angle_diff
          ) {
            // create a new subdivided point rotated around the circle center using the radius distance in radians
            const new_point = Point2d.create()
            LatLonCircle.initializePointOnCircle(
              circle_descriptor,
              new_point,
              current_angle
            )

            // convert from lon/lat to mercator
            LatLonUtils.conv4326To900913(new_point, new_point)

            // now convert to screen space
            Point2d.transformMat2d(new_point, new_point, worldToScreenMatrix)
            subdivided_points_array.push(new_point)
          }
        }
      }

      static getBoundsDistanceData(center_lonlat, view_bounds_lonlat) {
        const view_bounds_distances = new Array(4)
        for (let i = 0; i < 4; ++i) {
          let bounds_lon =
            i & 1
              ? view_bounds_lonlat[AABox2d.MAXX]
              : view_bounds_lonlat[AABox2d.MINX]
          let bounds_lat =
            i > 1
              ? view_bounds_lonlat[AABox2d.MAXY]
              : view_bounds_lonlat[AABox2d.MINY]
          const point = Point2d.create(bounds_lon, bounds_lat)
          // distance from center to corner of bounds in kilometers
          let distance =
            LatLonUtils.distance_in_meters(
              center_lonlat[0],
              center_lonlat[1],
              bounds_lon,
              bounds_lat
            ) / 1000.0
          view_bounds_distances[i] = {
            distance,
            point
          }
        }

        view_bounds_distances.sort((a, b) => {
          return a.distance - b.distance
        })

        return {
          min_bounds_dist: view_bounds_distances[0].distance,
          max_bounds_dist: view_bounds_distances[3].distance,
          view_bounds_distances
        }
      }

      static boundsConv900913to4326(output_bounds, input_bounds) {
        output_bounds[AABox2d.MINX] = LatLonUtils.conv900913To4326X(
          input_bounds[AABox2d.MINX]
        )
        output_bounds[AABox2d.MAXX] = LatLonUtils.conv900913To4326X(
          input_bounds[AABox2d.MAXX]
        )
        output_bounds[AABox2d.MINY] = LatLonUtils.conv900913To4326Y(
          input_bounds[AABox2d.MINY]
        )
        output_bounds[AABox2d.MAXY] = LatLonUtils.conv900913To4326Y(
          input_bounds[AABox2d.MAXY]
        )

        return output_bounds
      }

      /**
       * @typedef CircleDescriptor
       * An object describing various geometric/geographic states of a LatLonCircle that is a
       * simplified form of the LatLonCircle class that can be passed around to various static
       * methods
       *
       * @param {Point2d} center_mercator The center of the circle in web-mercator coordinates
       * @param {Point2d} center_lonlat The center of the circle in lon/lat WGS84 coordinates, in degrees
       * @param {Point2d} center_radians The same point as center_lonlat but in radians, not degrees
       * @param {number} radius_radians The radius of the circle in radians
       * @returns
       */

      /**
       * Creates a descriptor of a LatLonCircle instance
       * @param {Mat2d} xform Matrix describing the transformation from object-local space to web-mercator world space.
       * @param {number} radius The radius of the circle in kilometers
       * @returns {CircleDescriptor}
       */
      static createCircleDescriptor(xform, radius) {
        const center_mercator = Point2d.create()
        Mat2d.svd(center_mercator, null, null, xform)

        // the 'true' argument below indicates to include the lonlat point defined
        // in radians as well as degrees
        const point_data = LatLonViewIntersectUtils.buildProjectedPointData(
          true
        )
        LatLonViewIntersectUtils.projectPoint(
          center_mercator,
          point_data,
          null,
          null
        )

        // convert to a circle-centeric descriptor form
        return {
          center_mercator: point_data.merc_point,
          center_lonlat: point_data.lonlat_point,
          center_radians: point_data.radians_point,
          radius_radians: LatLonCircle.getDistanceInRadians(radius)
        }
      }

      _updateGeomForView(worldToScreenMatrix) {
        if (this._viewDirty || this._geomDirty || this._boundsOutOfDate) {
          const circle_descriptor = LatLonCircle.createCircleDescriptor(
            this.globalXform,
            this._radius
          )
          this._updateGeom(circle_descriptor)

          this._subdivided_screen_points = []
          if (this._segmented_circle_points.length === 0) {
            return
          }

          // calculate the bounds intersection between the current view bounds
          // and the bounds of this shape
          const world_bounds = this._draw_engine.camera.worldViewBounds
          const world_intersect_bounds = AABox2d.create()

          // NOTE: this._aabox would have already been updated in the above _updateGeom()
          // call, so can go directly to the _aabox member rather than throw the this.aabox
          // getter
          AABox2d.intersection(
            world_intersect_bounds,
            this._aabox,
            world_bounds
          )
          if (AABox2d.isEmpty(world_intersect_bounds)) {
            return
          }

          const screen_aabox = AABox2d.clone(this._aabox)
          AABox2d.transformMat2d(
            screen_aabox,
            screen_aabox,
            worldToScreenMatrix
          )
          const shape_screen_area = AABox2d.area(screen_aabox)

          const screen_intersect_box = AABox2d.clone(world_intersect_bounds)
          AABox2d.transformMat2d(
            screen_intersect_box,
            screen_intersect_box,
            worldToScreenMatrix
          )
          const screen_intersect_area = AABox2d.area(screen_intersect_box)

          // convert our intersection bounds to WGS84 lon/lat
          LatLonCircle.boundsConv900913to4326(world_bounds, world_bounds)
          LatLonCircle.boundsConv900913to4326(
            world_intersect_bounds,
            world_intersect_bounds
          )

          let subdivide = shape_screen_area > this._base_screen_area

          let start_point_data = this._segmented_circle_points[0]
          let end_point_data = null

          Point2d.transformMat2d(
            start_point_data.screen_point,
            start_point_data.merc_point,
            worldToScreenMatrix
          )

          this._subdivided_screen_points.push(
            Point2d.clone(start_point_data.screen_point)
          )

          if (subdivide) {
            const initial_point_data = start_point_data
            for (let i = 1; i < this._segmented_circle_points.length; i += 1) {
              end_point_data = this._segmented_circle_points[i]
              Point2d.transformMat2d(
                end_point_data.screen_point,
                end_point_data.merc_point,
                worldToScreenMatrix
              )

              this._subdivideArc(
                this._subdivided_screen_points,
                circle_descriptor,
                start_point_data,
                end_point_data,
                start_point_data.angle_degrees,
                this._degrees_between_points,
                world_intersect_bounds,
                worldToScreenMatrix,
                true
              )
              this._subdivided_screen_points.push(
                Point2d.clone(end_point_data.screen_point)
              )

              start_point_data = end_point_data
            }

            end_point_data = initial_point_data
            this._subdivideArc(
              this._subdivided_screen_points,
              circle_descriptor,
              start_point_data,
              initial_point_data,
              start_point_data.angle_degrees,
              this._degrees_between_points,
              world_intersect_bounds,
              worldToScreenMatrix,
              true
            )

            if (
              this._subdivided_screen_points.length ===
              this._segmented_circle_points.length
            ) {
              // this means no subdivision was actually performed. We need to double check the edge case where you
              // are zoomed in far enough where the line segment for the circle doesn't cross the view bounds, but
              // its arc would
              const {
                min_bounds_dist,
                max_bounds_dist,
                view_bounds_distances
              } = LatLonCircle.getBoundsDistanceData(
                circle_descriptor.center_lonlat,
                world_bounds
              )

              if (
                this._radius >= min_bounds_dist &&
                this._radius <= max_bounds_dist
              ) {
                // The arc of the circle actually crosses the view. We need to add a new point to the original list of
                // segmented circle points to give more precision in the area we are zoomed in on. To do this we will
                // get the angle between the center of the circle and the center of the bounds. This will tell us which
                // two original segmented points are its neighbors, and then subdivide with the two new line segments.
                const bounds_center = Point2d.create()
                AABox2d.getCenter(bounds_center, world_bounds)
                const bounds_center_radians = Point2d.clone(bounds_center)
                Vec2d.scale(
                  bounds_center_radians,
                  bounds_center_radians,
                  MathExt.DEG_TO_RAD
                )

                const that = this
                let start_segment_idx = -1
                const new_subdivided_points = this._subdivideCircleArcAtPoint(
                  circle_descriptor,
                  bounds_center,
                  bounds_center_radians,
                  world_bounds,
                  worldToScreenMatrix,
                  (angle_degrees, new_point_data) => {
                    start_segment_idx = Math.floor(
                      angle_degrees / that._degrees_between_points
                    )
                    const start_point =
                      that._segmented_circle_points[start_segment_idx]
                    const start_angle = start_point.angle_degrees
                    const end_angle = start_angle + that._degrees_between_points
                    const end_segment_idx =
                      start_segment_idx ===
                      that._segmented_circle_points.length - 1
                        ? 0
                        : start_segment_idx + 1
                    const end_point =
                      that._segmented_circle_points[end_segment_idx]
                    return { start_angle, start_point, end_angle, end_point }
                  }
                )

                this._subdivided_screen_points.splice(
                  start_segment_idx + 1,
                  0,
                  ...new_subdivided_points
                )
              } else if (this._radius > max_bounds_dist) {
                // hit an edge case here where you zoomed in far enough that both the original circle line segment and its respective arc
                // are not visible in the view but end up on opposite sides of the view bounds. In other words,
                // the original line-segmented circle does not overlap the view but the real circle does. So you've zoomed in
                // far enough to be completely inside that gap. To handle this case, we just need to add new points
                // so that the view is fully covered.

                // the last element in the view_bounds_distance array will have the max distance
                const bounds_point_lonlat =
                  view_bounds_distances[view_bounds_distances.length - 1].point
                const bounds_point_radians = Point2d.clone(bounds_point_lonlat)
                Vec2d.scale(
                  bounds_point_radians,
                  bounds_point_radians,
                  MathExt.DEG_TO_RAD
                )

                const {
                  angle_degrees,
                  closest_point_data
                } = LatLonCircle.getClosestPointOnCircleArc(
                  circle_descriptor,
                  bounds_point_lonlat,
                  bounds_point_radians,
                  worldToScreenMatrix
                )

                const start_segment_idx = Math.floor(
                  angle_degrees / this._degrees_between_points
                )

                this._subdivided_screen_points.splice(
                  start_segment_idx + 1,
                  0,
                  closest_point_data.screen_point
                )
              }
            }
          } else {
            for (let i = 1; i < this._segmented_circle_points.length; i += 1) {
              const point_data = this._segmented_circle_points[i]
              Point2d.transformMat2d(
                point_data.screen_point,
                point_data.merc_point,
                worldToScreenMatrix
              )

              this._subdivided_screen_points.push(
                Point2d.clone(point_data.screen_point)
              )
            }
          }

          // NOTE: we are not re-adding the first point as the draw call will close the loop

          console.assert(!this._geomDirty)
          // console.assert(!this._boundsOutOfDate)
          this._viewDirty = false
        }
      }

      getDimensions() {
        return [this.width, this.height]
      }

      get width() {
        this._updateAABox()
        return this._aabox[2] - this._aabox[0]
      }

      get height() {
        this._updateAABox()
        return this._aabox[3] - this._aabox[1]
      }

      _updateAABox() {
        this._updateGeom()
      }

      _draw(ctx) {
        // separate the model-view-matrix (this._fullXform) into the model matrix (globalXform)
        // and the view-projection matrix for separable components and to minimize
        // the amount of math applied.

        // invert the model matrix
        const xform = Mat2d.clone(this.globalXform)
        Mat2d.invert(xform, xform)

        // and multiply w/ model-view-projection matrix resulting in just the
        // view-projection matrix, or, in other words, the world-space-to-screen-space
        // transformation matrix
        Mat2d.multiply(xform, this._fullXform, xform)

        ctx.setTransform(1, 0, 0, 1, 0, 0)

        this._updateGeomForView(xform)

        if (this._subdivided_screen_points.length) {
          ctx.moveTo(
            this._subdivided_screen_points[0][0],
            this._subdivided_screen_points[0][1]
          )
          for (let i = 1; i < this._subdivided_screen_points.length; i += 1) {
            ctx.lineTo(
              this._subdivided_screen_points[i][0],
              this._subdivided_screen_points[i][1]
            )
          }
          ctx.closePath()
        }
      }

      // _drawDebug(ctx) {
      //   if (this._segmented_circle_points.length) {
      //     ctx.save()

      //     ctx.strokeStyle = "white"
      //     ctx.beginPath()
      //     let curr_pt = this._segmented_circle_points[0]
      //     ctx.moveTo(curr_pt.screen_point[0], curr_pt.screen_point[1])
      //     for (let i = 1; i < this._segmented_circle_points.length; i += 1) {
      //       curr_pt = this._segmented_circle_points[i]
      //       ctx.lineTo(curr_pt.screen_point[0], curr_pt.screen_point[1])
      //     }
      //     ctx.closePath()
      //     ctx.stroke()

      //     ctx.fillStyle = "orange"
      //     this._subdivided_screen_points.forEach(point => {
      //       ctx.beginPath()
      //       ctx.arc(point[0], point[1], 3, 0, MathExt.TWO_PI, false)
      //       ctx.fill()
      //     })

      //     ctx.fillStyle = "red"
      //     this._segmented_circle_points.forEach(point_data => {
      //       ctx.beginPath()
      //       ctx.arc(
      //         point_data.screen_point[0],
      //         point_data.screen_point[1],
      //         5,
      //         0,
      //         MathExt.TWO_PI,
      //         false
      //       )
      //       ctx.fill()
      //     })

      //     ctx.restore()
      //   }
      // }

      toJSON() {
        return Object.assign(super.toJSON(), {
          type: "LatLonCircle" // this must match the name of the class
        })
      }
    }
  }
  return LatLonCircleClass
}

/* istanbul ignore next */
export function getLatLonPolyClass() {
  if (!LatLonPolyClass) {
    LatLonPolyClass = class LatLonPoly extends MapdDraw.Poly {
      constructor(draw_engine, opts) {
        super(opts)
        this._draw_engine = draw_engine

        this._screenPts = []
        this._geomDirty = true
        this._viewDirty = true

        const that = this
        this._draw_engine.camera.on("changed", event => {
          that._viewDirty = true
        })

        // maximum length of subdivided line segment in pixels
        this._maxSegmentPixelDistance = 40
      }

      /**
       * Determines whether a line segment defined by a start/end point
       * should be subdivided for drawing. If the segment should be subdivided,
       * will append subdivided points the array of screen-projected points
       * to draw.
       * @param {ProjectedPointData} start_point_data Start point of the line segment
       * @param {ProjectedPointData} end_point_data End point of the line segment
       * @param {AABox2d} view_aabox Axis-aligned bounding box describing the
       *                                      intersection between the shape and the current view
       *                                      in WGS84 lat/lon coords
       * @param {Mat2d} worldToScreenMatrix Matrix defining world-to-screen transformation
       * @returns
       */
      _subdivideLineSegment(
        start_point_data,
        end_point_data,
        view_aabox,
        worldToScreenMatrix
      ) {
        const view_intersect_data = LatLonViewIntersectUtils.intersectViewBounds(
          start_point_data,
          end_point_data,
          view_aabox,
          worldToScreenMatrix
        )

        if (!view_intersect_data.subdivide) {
          return
        }

        console.assert(view_intersect_data.latlon_pts.length === 2)

        const start_latlon_pt = view_intersect_data.latlon_pts[0]
        const end_latlon_pt = view_intersect_data.latlon_pts[1]
        const start_screen_pt = view_intersect_data.screen_pts[0]
        const end_screen_pt = view_intersect_data.screen_pts[1]

        const distance = Point2d.distance(start_screen_pt, end_screen_pt)
        if (distance > this._maxSegmentPixelDistance) {
          // do subdivisions in a cartesian space using lon/lat
          // This is how ST_Contains behaves in the server right now
          const num_subdivisions = Math.ceil(
            distance / this._maxSegmentPixelDistance
          )
          for (let i = 1; i < num_subdivisions; i += 1) {
            const new_segment_point = Point2d.create()
            Point2d.lerp(
              new_segment_point,
              start_latlon_pt,
              end_latlon_pt,
              i / num_subdivisions
            )
            // conver the new segment point back to mercator for drawing
            LatLonUtils.conv4326To900913(new_segment_point, new_segment_point)

            // now convert to screen space
            Point2d.transformMat2d(
              new_segment_point,
              new_segment_point,
              worldToScreenMatrix
            )
            this._screenPts.push(Point2d.clone(new_segment_point))
          }
        }
      }

      _updateGeom(worldToScreenMatrix) {
        if (this._viewDirty || this._geomDirty || this._boundsOutOfDate) {
          this._screenPts = []
          if (this._verts.length === 0) {
            return
          }

          // calculate the bounds intersection between the current view bounds
          // and the bounds of this shape
          const world_bounds = this._draw_engine.camera.worldViewBounds
          const aabox = this.aabox
          AABox2d.intersection(world_bounds, aabox, world_bounds)
          if (AABox2d.isEmpty(aabox)) {
            return
          }

          // convert our intersection bounds to WGS84 lon/lat
          world_bounds[AABox2d.MINX] = LatLonUtils.conv900913To4326X(
            world_bounds[AABox2d.MINX]
          )
          world_bounds[AABox2d.MAXX] = LatLonUtils.conv900913To4326X(
            world_bounds[AABox2d.MAXX]
          )
          world_bounds[AABox2d.MINY] = LatLonUtils.conv900913To4326Y(
            world_bounds[AABox2d.MINY]
          )
          world_bounds[AABox2d.MAXY] = LatLonUtils.conv900913To4326Y(
            world_bounds[AABox2d.MAXY]
          )

          const initial_point_data = LatLonViewIntersectUtils.buildProjectedPointData()
          let start_point_data = LatLonViewIntersectUtils.buildProjectedPointData()
          let end_point_data = LatLonViewIntersectUtils.buildProjectedPointData()

          const model_xform = this.globalXform

          LatLonViewIntersectUtils.projectPoint(
            this._verts[0],
            initial_point_data,
            model_xform,
            worldToScreenMatrix
          )

          Point2d.copy(
            start_point_data.merc_point,
            initial_point_data.merc_point
          )
          Point2d.copy(
            start_point_data.screen_point,
            initial_point_data.screen_point
          )
          Point2d.copy(
            start_point_data.lonlat_point,
            initial_point_data.lonlat_point
          )

          this._screenPts.push(Point2d.clone(start_point_data.screen_point))

          let swap_tmp = null
          for (let i = 1; i < this._verts.length; i += 1) {
            LatLonViewIntersectUtils.projectPoint(
              this._verts[i],
              end_point_data,
              model_xform,
              worldToScreenMatrix
            )
            this._subdivideLineSegment(
              start_point_data,
              end_point_data,
              world_bounds,
              worldToScreenMatrix
            )
            this._screenPts.push(Point2d.clone(end_point_data.screen_point))

            // now swap the endpoints
            swap_tmp = start_point_data
            start_point_data = end_point_data
            end_point_data = swap_tmp
          }

          this._subdivideLineSegment(
            start_point_data,
            initial_point_data,
            world_bounds,
            worldToScreenMatrix
          )

          // NOTE: we are not re-adding the first point as the draw call will close the loop

          this._geomDirty = false
          this._boundsOutOfDate = false
          this._viewDirty = false
        }
      }

      _draw(ctx) {
        // separate the model-view-matrix (this._fullXform) into the model matrix (globalXform)
        // and the view-projection matrix for separable components and to minimize
        // the amount of math applied.

        // invert the model matrix
        const xform = Mat2d.clone(this.globalXform)
        Mat2d.invert(xform, xform)

        // and multiply w/ model-view-projection matrix resulting in just the
        // view-projection matrix, or, in other words, the world-space-to-screen-space
        // transformation matrix
        Mat2d.multiply(xform, this._fullXform, xform)
        ctx.setTransform(1, 0, 0, 1, 0, 0)

        this._updateGeom(xform)

        if (this._screenPts.length) {
          ctx.moveTo(this._screenPts[0][0], this._screenPts[0][1])
          for (let i = 1; i < this._screenPts.length; i += 1) {
            ctx.lineTo(this._screenPts[i][0], this._screenPts[i][1])
          }
          ctx.closePath()
        }
      }

      // _drawDebug(ctx) {
      //   if (this._screenPts.length) {
      //     ctx.save()

      //     ctx.fillStyle = "orange"
      //     this._screenPts.forEach(point => {
      //       ctx.beginPath()
      //       ctx.arc(point[0], point[1], 3, 0, MathExt.TWO_PI, false)
      //       ctx.fill()
      //     })

      //     ctx.restore()
      //   }
      // }

      toJSON() {
        return Object.assign(super.toJSON(), {
          type: "LatLonPoly" // this must match the name of the class
        })
      }
    }
  }
  return LatLonPolyClass
}

/* istanbul ignore next */
class ShapeHandler {
  constructor(
    parent,
    drawEngine,
    chart,
    buttonGroup,
    buttonId,
    defaultStyle,
    defaultSelectStyle
  ) {
    this.parent = parent
    this.drawEngine = drawEngine
    this.canvas = drawEngine.getCanvas()
    this.chart = chart
    this.baseMap = chart.map()
    this.buttonGroup = buttonGroup
    this.buttonId = buttonId
    this.defaultStyle = defaultStyle
    this.defaultSelectStyle = defaultSelectStyle
    this.mousedownCB = this.mousedownCB.bind(this)
    this.mouseupCB = this.mouseupCB.bind(this)
    this.mousemoveCB = this.mousemoveCB.bind(this)
    this.mouseoverCB = this.mouseoverCB.bind(this)
    this.clickCB = this.clickCB.bind(this)
    this.dblclickCB = this.dblclickCB.bind(this)
    this.keydownCB = this.keydownCB.bind(this)
    this.active = false

    this.useLonLat =
      typeof this.chart.useLonLat === "function" && this.chart.useLonLat()
  }

  disableBasemapEvents(options = {}) {
    this.chart.hidePopup(true)
    this.chart.enableInteractions(false, options)
  }

  enableBasemapEvents(options = {}) {
    this.chart.enableInteractions(true, options)
  }

  addShape(shape, selectOpts = {}) {
    this.drawEngine.addShape(shape, selectOpts)
    this.drawEngine.moveShapeToTop(shape)
  }

  setupFinalShape(shape, selectOpts = {}) {
    // deactivate the button associated with this shape handler
    // first to make sure that when the shape is selected,
    // the selection event handler is run. The selection event
    // handler is only run when all the button are deactivated,
    // so need to deactivate the button first, and the select
    // the new shape
    this.buttonGroup.deactivateButton(this.buttonId)
    if (this.drawEngine.hasShape(shape)) {
      this.drawEngine.selectShape(shape)
    } else {
      this.drawEngine.addShape(shape, selectOpts, true)
      this.drawEngine.moveShapeToTop(shape)
    }
    this.chart.addFilterShape(shape)
    this.canvas.focus()
  }

  mousedownCB(event) {}
  mouseupCB(event) {}
  mousemoveCB(event) {}
  mouseoverCB(event) {}
  clickCB(event) {}
  dblclickCB(event) {}
  keydownCB(event) {}

  isMouseEventInCanvas(mouseEvent) {
    const width = this.canvas.offsetWidth
    const height = this.canvas.offsetHeight
    const rect = this.canvas.getBoundingClientRect()

    const diffX = mouseEvent.clientX - rect.left - this.canvas.clientLeft
    const diffY = mouseEvent.clientY - rect.top - this.canvas.clientTop

    return diffX >= 0 && diffX < width && diffY >= 0 && diffY < height
  }

  getRelativeMousePosFromEvent(mouseEvent) {
    const width = this.canvas.offsetWidth
    const height = this.canvas.offsetHeight
    const rect = this.canvas.getBoundingClientRect()

    const diffX = mouseEvent.clientX - rect.left - this.canvas.clientLeft
    const diffY = mouseEvent.clientY - rect.top - this.canvas.clientTop
    const mousepos = Point2d.create(diffX, diffY)

    return mousepos
  }

  activate() {
    if (!this.active) {
      document.addEventListener("mousedown", this.mousedownCB)
      document.addEventListener("mouseup", this.mouseupCB)
      document.addEventListener("mousemove", this.mousemoveCB)
      document.addEventListener("mouseover", this.mouseoverCB)
      document.addEventListener("click", this.clickCB)
      document.addEventListener("dblclick", this.dblclickCB)

      // NOTE: canvas div was setup to be focusable
      // and handle keyboard events in initControls()
      // function
      this.canvas.addEventListener("keydown", this.keydownCB)
      this.canvas.focus()

      this.active = true
    }
  }

  deactivate() {
    if (this.active) {
      this.destroy()
      document.removeEventListener("mousedown", this.mousedownCB)
      document.removeEventListener("mouseup", this.mouseupCB)
      document.removeEventListener("mousemove", this.mousemoveCB)
      document.removeEventListener("mouseover", this.mouseoverCB)
      document.removeEventListener("click", this.clickCB)
      document.removeEventListener("dblclick", this.dblclickCB)

      this.canvas.removeEventListener("keydown", this.keydownCB)
      this.canvas.blur()

      this.active = false
    }
  }
}

/* istanbul ignore next */
class CircleShapeHandler extends ShapeHandler {
  constructor(
    parent,
    drawEngine,
    chart,
    buttonGroup,
    buttonId,
    defaultStyle,
    defaultSelectStyle
  ) {
    super(
      parent,
      drawEngine,
      chart,
      buttonGroup,
      buttonId,
      defaultStyle,
      defaultSelectStyle
    )
    this.startmousepos = Point2d.create(0, 0)
    this.startmouseworldpos = Point2d.create(0, 0)
    if (this.useLonLat) {
      this.startmouselatlonpos = Point2d.create(0, 0)
    }
    this.activeshape = null
    this.timer = null
  }

  deactivateShape() {
    if (this.activeShape) {
      const shape = this.activeShape
      if (performance.now() - this.timer < 500) {
        // this is a click, so give the circle a default radius
        const bounds = this.chart.getDataRenderBounds()
        const currXRange = [bounds[0][0], bounds[1][0]]
        const currYRange = [bounds[0][1], bounds[2][1]]
        const projDims = [
          0.1 * Math.abs(currXRange[1] - currXRange[0]),
          0.1 * Math.abs(currYRange[1] - currYRange[0])
        ]
        if (this.useLonLat) {
          const pos = shape.getPosition()
          // convert from mercator to lat/lon
          LatLonUtils.conv900913To4326(pos, pos)

          projDims[0] =
            LatLonUtils.distance_in_meters(
              pos[0],
              pos[1],
              pos[0] + projDims[0],
              pos[1]
            ) / 1000.0
          projDims[1] =
            LatLonUtils.distance_in_meters(
              pos[0],
              pos[1],
              pos[0],
              pos[1] + projDims[1]
            ) / 1000.0
          shape.initialRadius = Math.min(projDims[0], projDims[1])
        } else {
          shape.radius = Math.min(projDims[0], projDims[1])
        }
      }
      // need to unset the active shape here first
      // before calling setupFinalShape, because
      // inside that call it's going to call destroy()
      this.activeShape = null
      shape.setStyle(this.defaultStyle)
      this.setupFinalShape(shape)
    }
  }

  destroy() {
    if (this.activeShape) {
      this.drawEngine.deleteShape(this.activeShape)
      this.activeShape = null
    }
  }

  mousedownCB(event) {
    if (!this.isMouseEventInCanvas(event)) {
      return
    }

    this.disableBasemapEvents()
    Point2d.copy(this.startmousepos, this.getRelativeMousePosFromEvent(event))
    this.drawEngine.project(this.startmouseworldpos, this.startmousepos)
    this.timer = performance.now()

    // convert from mercator to lat/lon
    const selectOpts = {}
    if (this.useLonLat) {
      LatLonUtils.conv900913To4326(
        this.startmouselatlonpos,
        this.startmouseworldpos
      )

      const CircleClass = getLatLonCircleClass()
      this.activeShape = new CircleClass(
        this.drawEngine,
        Object.assign(
          {
            position: this.startmouseworldpos,
            radius: 0
          },
          this.defaultSelectStyle
        )
      )

      selectOpts.uniformScaleOnly = true
      selectOpts.centerScaleOnly = true
      selectOpts.rotatable = false
    } else {
      this.activeShape = new MapdDraw.Circle(
        Object.assign(
          {
            position: this.startmouseworldpos,
            radius: 0
          },
          this.defaultSelectStyle
        )
      )
    }
    this.canvas.focus()
    this.addShape(this.activeShape, selectOpts)
    event.stopImmediatePropagation()
    event.preventDefault()
  }

  mouseupCB(event) {
    this.deactivateShape()
  }

  mousemoveCB(event) {
    if (this.activeShape) {
      const mousepos = this.getRelativeMousePosFromEvent(event)
      const mousescreenpos = Point2d.create(0, 0)
      this.drawEngine.project(mousescreenpos, mousepos)

      if (this.useLonLat) {
        // convert from mercator to lat/lon
        LatLonUtils.conv900913To4326(mousescreenpos, mousescreenpos)
        const radius = LatLonUtils.distance_in_meters(
          this.startmouselatlonpos[0],
          this.startmouselatlonpos[1],
          mousescreenpos[0],
          mousescreenpos[1]
        )
        this.activeShape.initialRadius = radius / 1000
      } else {
        const radius = Point2d.distance(this.startmouseworldpos, mousescreenpos)
        this.activeShape.radius = radius
      }

      // stopping all mousemove events, namely to stop hover callbacks
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  }

  clickCB(event) {
    this.deactivateShape()
  }

  keydownCB(event) {
    if (
      event.key === "Escape" ||
      event.code === "Escape" ||
      event.keyCode === 27
    ) {
      this.destroy()
      this.enableBasemapEvents()
    }
  }
}

/* istanbul ignore next */
class PolylineShapeHandler extends ShapeHandler {
  constructor(
    parent,
    drawEngine,
    chart,
    buttonGroup,
    buttonId,
    defaultStyle,
    defaultSelectStyle
  ) {
    super(
      parent,
      drawEngine,
      chart,
      buttonGroup,
      buttonId,
      defaultStyle,
      defaultSelectStyle
    )
    this.activeShape = null
    this.startVert = null
    this.lastVert = null
    this.lineShape = null
    this.prevVertPos = null
    this.activeIdx = -1
    this.startPosAABox = AABox2d.create()
    this.timer = null

    this.enableBasemapDebounceFunc = chart.debounce(() => {
      if (this.active) {
        this.enableBasemapEvents()
      }
    }, 100)
  }

  destroy() {
    if (this.startVert) {
      this.drawEngine.deleteShape(this.startVert)
    }
    if (this.lastVert) {
      this.drawEngine.deleteShape(this.lastVert)
    }
    if (this.lineShape) {
      this.drawEngine.deleteShape(this.lineShape)
    }

    this.startVert = this.lastVert = this.lineShape = this.activeShape = this.prevVertPos = null
    AABox2d.initEmpty(this.startPosAABox)
    this.activeIdx = -1
  }

  appendVertex(mousepos, mouseworldpos) {
    if (this.lineShape) {
      if (
        !this.prevVertPos ||
        Math.abs(mousepos[0] - this.prevVertPos[0]) > 2 ||
        Math.abs(mousepos[1] - this.prevVertPos[1]) > 2
      ) {
        this.prevVertPos = mousepos
        return this.lineShape.appendVert(mouseworldpos)
      }
    }
    return -1
  }

  finishShape() {
    const verts = this.lineShape ? this.lineShape.vertsRef : []
    const removeLastVert =
      verts.length > 1 &&
      !Point2d.equals(verts[0], verts[verts.length - 1]) &&
      this.lastVert &&
      !Point2d.equals(verts[verts.length - 1], this.lastVert.getPositionRef())
    if (verts.length > 2 && (!removeLastVert || verts.length > 3)) {
      // Check if there is a loop in the current verts, remove the last point
      // if so
      if (removeLastVert) {
        verts.pop()
      }

      const args = []
      let PolyClass = null
      if (this.useLonLat) {
        PolyClass = getLatLonPolyClass()
        args.push(this.drawEngine)
      } else {
        PolyClass = MapdDraw.Poly
      }
      args.push(
        Object.assign(
          {
            verts
          },
          this.defaultStyle
        )
      )
      const poly = new PolyClass(...args)
      this.setupFinalShape(poly)

      // clear out all other shapes using our destroy method
      this.destroy()
    } else {
      this.destroy()
      this.enableBasemapEvents()
    }
  }

  mousedownCB(event) {
    if (!this.isMouseEventInCanvas(event)) {
      this.timer = null
      return
    }

    this.timer = performance.now()
  }

  mouseupCB(event) {
    if (this.timer && performance.now() - this.timer < 500) {
      this.disableBasemapEvents()

      let shapeBuilt = false
      const mousepos = this.getRelativeMousePosFromEvent(event)
      const mouseworldpos = Point2d.create(0, 0)
      this.drawEngine.project(mouseworldpos, mousepos)

      if (!this.startVert) {
        this.lineShape = new MapdDraw.PolyLine(
          Object.assign(
            {
              verts: [mouseworldpos]
            },
            this.defaultSelectStyle
          )
        )
        this.addShape(this.lineShape)
        this.startVert = new MapdDraw.Point({
          position: mouseworldpos,
          size: 5
        })
        this.addShape(this.startVert)
        this.activeShape = this.startVert
        this.prevVertPos = mousepos
        this.activeIdx = 0
      } else if (!this.lastVert && this.lineShape.numVerts > 1) {
        const verts = this.lineShape.vertsRef
        this.lastVert = new MapdDraw.Point({
          position: verts[1],
          size: 5
        })
        this.addShape(this.lastVert)
        this.activeShape = this.lastVert
        this.activeIdx = 1
      } else if (this.lastVert) {
        const startpos = this.startVert.getPosition()
        this.drawEngine.unproject(startpos, startpos)
        AABox2d.initCenterExtents(this.startPosAABox, startpos, [10, 10])
        if (AABox2d.containsPt(this.startPosAABox, mousepos)) {
          this.finishShape()
          shapeBuilt = true
        } else {
          const verts = this.lineShape.vertsRef
          this.lastVert.setPosition(verts[verts.length - 1])
          this.activeShape = this.lastVert
        }
      }

      if (!shapeBuilt) {
        this.enableBasemapDebounceFunc()
        this.canvas.focus()
        this.activeShape = null
        this.activeIdx = -1
      }
      event.preventDefault()
    }
  }

  mousemoveCB(event) {
    if (this.startVert && this.lineShape && this.activeIdx < 0) {
      const mousepos = this.getRelativeMousePosFromEvent(event)
      const mouseworldpos = Point2d.create(0, 0)
      this.drawEngine.project(mouseworldpos, mousepos)
      this.activeIdx = this.appendVertex(mousepos, mouseworldpos)
    }

    if (this.activeShape || this.activeIdx >= 0) {
      const mousepos = this.getRelativeMousePosFromEvent(event)
      const mouseworldpos = Point2d.create(0, 0)
      this.drawEngine.project(mouseworldpos, mousepos)

      if (event.shiftKey) {
        if (this.activeIdx === 1) {
          const diff = Vec2d.create()
          const prevmousepos = Point2d.create()
          const verts = this.lineShape.vertsRef
          this.drawEngine.unproject(prevmousepos, verts[0])
          Point2d.sub(diff, mousepos, prevmousepos)
          let angle = Math.atan2(diff[1], diff[0])
          angle = MathExt.round(angle / MathExt.QUATER_PI) * MathExt.QUATER_PI
          const transformDir = [Math.cos(angle), Math.sin(angle)]
          Vec2d.scale(diff, transformDir, Vec2d.dot(diff, transformDir))
          Point2d.addVec2(mousepos, prevmousepos, diff)
          this.drawEngine.project(mouseworldpos, mousepos)
        } else if (this.activeIdx > 1) {
          const verts = this.lineShape.vertsRef
          const pt1 = Point2d.create()
          this.drawEngine.unproject(pt1, verts[this.activeIdx - 2])
          const pt2 = Point2d.create()
          this.drawEngine.unproject(pt2, verts[this.activeIdx - 1])
          const dir1 = Vec2d.create()
          Point2d.sub(dir1, pt2, pt1)
          Vec2d.normalize(dir1, dir1)
          const dir2 = [0, 0]
          Point2d.sub(dir2, mousepos, pt2)
          // Vec2d.normalize(dir2, dir2)
          let angle = Vec2d.angle(dir1, dir2)
          angle = MathExt.round(angle / MathExt.QUATER_PI) * MathExt.QUATER_PI
          const matrix = Mat2.create()
          Mat2.fromRotation(matrix, angle)
          const transformDir = [0, 0]
          Vec2d.transformMat2(transformDir, dir1, matrix)
          Vec2d.scale(transformDir, transformDir, Vec2d.dot(dir2, transformDir))
          Point2d.addVec2(mousepos, pt2, transformDir)
          this.drawEngine.project(mouseworldpos, mousepos)
        }
      }

      if (this.activeShape) {
        this.activeShape.setPosition(mouseworldpos)
      }

      if (this.activeIdx >= 0) {
        this.lineShape.setVertPosition(this.activeIdx, mouseworldpos)
        this.canvas.focus()
      }
      event.preventDefault()
    }
  }

  dblclickCB(event) {
    if (!this.isMouseEventInCanvas(event)) {
      return
    }

    this.finishShape()
  }

  keydownCB(event) {
    if (
      event.key === "Escape" ||
      event.code === "Escape" ||
      event.keyCode === 27
    ) {
      this.destroy()
      this.enableBasemapEvents()
    } else if (
      event.key === "Enter" ||
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      event.keyCode === 13
    ) {
      this.finishShape()
    }
  }
}

/* istanbul ignore next */
class LassoShapeHandler extends ShapeHandler {
  constructor(
    parent,
    drawEngine,
    chart,
    buttonGroup,
    buttonId,
    defaultStyle,
    defaultSelectStyle
  ) {
    super(
      parent,
      drawEngine,
      chart,
      buttonGroup,
      buttonId,
      defaultStyle,
      defaultSelectStyle
    )
    this.activeShape = null
    this.lastPos = null
    this.lastWorldPos = null
  }

  destroy() {
    if (this.activeShape) {
      this.drawEngine.deleteShape(this.activeShape)
      this.activeShape = null
    }
    this.lastPos = this.lastWorldPos = null
  }

  mousedownCB(event) {
    if (!this.isMouseEventInCanvas(event)) {
      return
    }

    this.disableBasemapEvents()
    this.activeShape = null
    this.lastPos = this.getRelativeMousePosFromEvent(event)
    this.lastWorldPos = Point2d.create(0, 0)
    this.drawEngine.project(this.lastWorldPos, this.lastPos)
    event.preventDefault()
  }

  mousemoveCB(event) {
    if (!this.isMouseEventInCanvas(event)) {
      if (this.activeShape) {
        this.drawEngine.deleteShape(this.activeShape)
        this.activeShape = null
        this.lastPos = null
        this.lastWorldPos = null
        this.enableBasemapEvents()
      }
      return
    }

    if (this.lastPos) {
      const currPos = this.getRelativeMousePosFromEvent(event)
      const currWorldPos = Point2d.create(0, 0)
      this.drawEngine.project(currWorldPos, currPos)
      if (!Point2d.equals(currPos, this.lastPos)) {
        if (!this.activeShape) {
          this.activeShape = new MapdDraw.PolyLine(
            Object.assign(
              {
                verts: [this.lastWorldPos, currWorldPos]
              },
              this.defaultSelectStyle
            )
          )
          this.addShape(this.activeShape)
        } else {
          this.activeShape.appendVert(currWorldPos)
        }
        Point2d.copy(this.lastPos, currPos)
        Point2d.copy(this.lastWorldPos, currWorldPos)
        this.canvas.focus()
      }
      event.preventDefault()
    }
  }

  mouseupCB(event) {
    if (this.activeShape) {
      const verts = this.activeShape.vertsRef
      const screenVert = Point2d.create(0, 0)
      const worldVert = Point2d.create(0, 0)
      let simpleVerts = verts.map(vert => {
        this.drawEngine.unproject(screenVert, vert)
        return {
          x: screenVert[0],
          y: screenVert[1]
        }
      })
      simpleVerts = simplify(simpleVerts, 4, true)
      const newverts = simpleVerts.map(vert => {
        Point2d.set(screenVert, vert.x, vert.y)
        this.drawEngine.project(worldVert, screenVert)
        return Point2d.clone(worldVert)
      })

      if (newverts.length < 3) {
        logger.warn(
          "The resulting lasso shape is a point or a straight line. Cannot build a polygon from it. Please try again"
        )
        this.drawEngine.deleteShape(this.activeShape)
        this.activeShape = null
      } else {
        const args = []
        let PolyClass = null
        if (this.useLonLat) {
          PolyClass = getLatLonPolyClass()
          args.push(this.drawEngine)
        } else {
          PolyClass = MapdDraw.Poly
        }
        args.push(
          Object.assign(
            {
              verts: newverts
            },
            this.defaultStyle
          )
        )
        const poly = new PolyClass(...args)
        this.drawEngine.deleteShape(this.activeShape)
        this.setupFinalShape(poly)
        event.preventDefault()
      }
    }
    this.lastPos = null
    this.lastWorldPos = null
  }

  keydownCB(event) {
    if (
      event.key === "Escape" ||
      event.code === "Escape" ||
      event.keyCode === 27
    ) {
      this.destroy()
      this.enableBasemapEvents()
    }
  }
}

/* istanbul ignore next */
export default class LassoButtonGroupController {
  constructor(
    parentContainer,
    parentChart,
    parentDrawEngine,
    defaultStyle,
    defaultSelectStyle
  ) {
    this._container = parentContainer
    this._chart = parentChart
    this._drawEngine = parentDrawEngine
    this._buttonElements = {}
    this._activeButton = null
    this._activeShape = null

    this._selectionchangedCB = this._selectionchangedCB.bind(this)
    this._dragbeginCB = this._dragbeginCB.bind(this)
    this._dragendCB = this._dragendCB.bind(this)
    this._keyboardCB = this._keyboardCB.bind(this)
    this._initControls(defaultStyle, defaultSelectStyle)
  }

  destroy() {
    if (this._controlsInitted) {
      const canvas = this._drawEngine.getCanvas()
      canvas.removeEventListener("keydown", this._keyboardCB)

      this._circleHandler.deactivate()
      this._polylineHandler.deactivate()
      this._lassoHandler.deactivate()

      this._drawEngine.off(
        MapdDraw.ShapeBuilder.EventConstants.DRAG_END,
        this._dragendCB
      )
      this._drawEngine.off(
        MapdDraw.ShapeBuilder.EventConstants.DRAG_END,
        this._dragbeginCB
      )
      this._drawEngine.off(
        MapdDraw.ShapeBuilder.EventConstants.SELECTION_CHANGED,
        this._selectionchangedCB
      )

      this._controlContainer.removeChild(this._controlGroup)
      this._container.removeChild(this._controlContainer)
    }
  }

  _createControlButton(id, options = {}) {
    const button = document.createElement("button")
    button.className = `mapd-draw-button ${options.className}`
    button.setAttribute("title", options.title)
    this._controlGroup.appendChild(button)

    button.addEventListener(
      "click",
      e => {
        e.preventDefault()
        e.stopPropagation()

        const clickedButton = e.target
        if (this._activeButton && this._activeButton.button === clickedButton) {
          this.deactivateButtons()
          if (options.onDeactivate) {
            options.onDeactivate()
          }
          return
        }

        this.setActiveButton(id, options)
        options.onActivate()
      },
      true
    )

    button.addEventListener("mousedown", e => {
      this._chart.hidePopup(true)
      e.stopPropagation()
      e.preventDefault()
    })

    button.addEventListener("mouseover", e => {
      this._chart.hidePopup(true)
      this._chart.popupDisplayable(false)
      this._drawEngine.disableInteractions(false)
    })

    button.addEventListener("mouseout", e => {
      if (!this._activeShape && !this._activeButton) {
        this._chart.popupDisplayable(true)
        this._drawEngine.enableInteractions()
      }
    })

    button.addEventListener("mousemove", e => {
      e.stopImmediatePropagation()
      e.preventDefault()
    })

    return button
  }

  _createButtonControl(
    id,
    ShapeHandlerClass,
    defaultStyle,
    defaultSelectStyle,
    keybindingStr = ""
  ) {
    const shapeHandler = new ShapeHandlerClass(
      this._container,
      this._drawEngine,
      this._chart,
      this,
      id,
      defaultStyle,
      defaultSelectStyle
    )
    this._buttonElements[id] = this._createControlButton(id, {
      className: `mapd-draw-button-${id}`,
      title: `Create a ${id}${keybindingStr ? ` [${keybindingStr}]` : ""}`,
      onActivate: () => {
        this._drawEngine.disableInteractions()
        this._activeShape = shapeHandler
        this._activeShape.activate()
      },
      onDeactivate: () => {
        this._drawEngine.enableInteractions()
      }
    })
    return shapeHandler
  }

  isActive() {
    return Boolean(this._activeButton)
  }

  deactivateButton(id) {
    if (
      this._activeButton &&
      this._buttonElements[id] === this._activeButton.button
    ) {
      this.deactivateButtons()
      return true
    }
    return false
  }

  deactivateButtons() {
    if (this._activeButton) {
      this._activeButton.button.classList.remove("mapd-draw-active-button")
      if (
        this._activeButton.options &&
        this._activeButton.options.onDeactivate
      ) {
        this._activeButton.options.onDeactivate()
      }
      this._activeButton = null
    }

    if (this._activeShape) {
      this._activeShape.deactivate()
      this._activeShape = null
    }

    // NOTE: not setting popup displayable here.
    // Leaving that for the "mouseout" event
  }

  setActiveButton(id, options) {
    const button = this._buttonElements[id]
    if (!button) {
      return
    }

    if (button && id !== "trash") {
      this.deactivateButtons()
      button.classList.add("mapd-draw-active-button")
      this._activeButton = {
        button,
        id,
        options
      }
    }

    // NOTE: this does not stop chart.getClosestResult()
    // from being called, so there could be unnecessary
    // backend calls still although popups are disabled
    // We may want to consider a way to disable those as well
    this._chart.popupDisplayable(false)
  }

  _selectionchangedCB(event) {
    if (!this._activeShape && !this._activeButton) {
      const canvas = this._drawEngine.getCanvas()
      if (event.selectedShapes && event.selectedShapes.length) {
        this._chart.hidePopup(true)
        this._chart.popupDisplayable(false)

        // deactivate all map interactions except scroll zoom
        this._chart.enableInteractions(false, {
          scrollZoom: true
        })

        canvas.focus()
      } else {
        this._chart.popupDisplayable(true)
        this._chart.enableInteractions(true)
        canvas.blur()
      }
    }
  }

  _dragbeginCB(event) {
    if (!this._activeShape && !this._activeButton) {
      const canvas = this._drawEngine.getCanvas()
      canvas.focus()
    }
  }

  _dragendCB(event) {
    const CircleClass = getLatLonCircleClass()
    event.shapes.forEach(shape => {
      if (shape instanceof CircleClass) {
        // need to reset the inital radius of the latlon circle
        // so that any rescaling is done relative to this
        // new radius
        shape.resetInitialRadius()
      }
    })
  }

  _keyboardCB(event) {
    if (
      (event.key === "Backspace" ||
        event.code === "Backspace" ||
        event.keyCode === 8) &&
      this._drawEngine
    ) {
      const selectedShapes = this._drawEngine.selectedShapes
      if (selectedShapes.length) {
        this._drawEngine.deleteSelectedShapes()
        selectedShapes.forEach(shape => {
          this._chart.deleteFilterShape(shape)
        })
      }
      event.preventDefault()
    }
  }

  _initControls(defaultStyle, defaultSelectStyle) {
    let margins = null
    if (typeof this._chart.margins === "function") {
      margins = this._chart.margins()
    }

    this._controlContainer = document.createElement("div")
    this._controlContainer.style.top = `${
      margins && margins.top ? margins.top : 0
    }px`
    this._controlContainer.style.left = `${
      margins && margins.left ? margins.left : 0
    }px`
    this._controlContainer.style.position = "absolute"
    this._controlContainer.className = "mapd-draw-button-container"
    this._container.appendChild(this._controlContainer)

    const canvas = this._drawEngine.getCanvas()
    // make the canvas focusable so we can catch keyboard events
    // from it, but don't outline it when it is focused
    canvas.setAttribute("tabindex", -1)
    canvas.style.outline = "none"

    this._controlGroup = document.createElement("div")
    this._controlGroup.className = "mapd-draw-button-control-group"
    this._controlContainer.appendChild(this._controlGroup)

    this._drawEngine.on(
      MapdDraw.ShapeBuilder.EventConstants.SELECTION_CHANGED,
      this._selectionchangedCB
    )
    this._drawEngine.on(
      MapdDraw.ShapeBuilder.EventConstants.DRAG_BEGIN,
      this._dragbeginCB
    )
    this._drawEngine.on(
      MapdDraw.ShapeBuilder.EventConstants.DRAG_END,
      this._dragendCB
    )

    this._circleHandler = this._createButtonControl(
      "circle",
      CircleShapeHandler,
      defaultStyle,
      defaultSelectStyle
    )
    this._polylineHandler = this._createButtonControl(
      "polyline",
      PolylineShapeHandler,
      defaultStyle,
      defaultSelectStyle
    )
    this._lassoHandler = this._createButtonControl(
      "lasso",
      LassoShapeHandler,
      defaultStyle,
      defaultSelectStyle
    )

    // NOTE: the canvas dom element needs to have a "tabindex" set to have
    // focusability, and best to have "outline: none" as part
    // of its style so an outline isn't shown when focused
    canvas.addEventListener("keydown", this._keyboardCB)

    this._controlsInitted = true
  }
}
