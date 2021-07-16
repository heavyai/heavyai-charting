import * as LatLonUtils from "../../../utils/utils-latlon"
import * as MapdDraw from "@mapd/mapd-draw/dist/mapd-draw"

const { AABox2d, Mat2d, Point2d, Vec2d } = MapdDraw
const MathExt = MapdDraw.Math

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
function canIntersect(numerator, denominator) {
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
}

export default {
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
   * Copies projected point data.
   * @param {ProjectedPointData} out_point_data The data to be copied to
   * @param {ProjectedPointData} in_point_data  The data to be copied from
   */
  copyProjectedPoint: (out_point_data, in_point_data) => {
    Point2d.copy(out_point_data.merc_point, in_point_data.merc_point)
    Point2d.copy(out_point_data.screen_point, in_point_data.screen_point)
    Point2d.copy(out_point_data.lonlat_point, in_point_data.lonlat_point)
    if (in_point_data.include_radians !== undefined) {
      Point2d.copy(out_point_data.radians_point, in_point_data.radians_point)
    } else {
      delete out_point_data.radians_point
    }
  },

  /**
   * Using a point defined in web-mercator space as input, initializes a ProjectedPointData struct
   * by transforming that merc point into lat/lon WGS84 (in degrees and optionally radians) and screen space.
   * @param {Point2d} initial_merc_point Initial web-mercator projected point to transform
   * @param {ProjectedPointData} out_point_data Struct to be initialized with the various projections of the input point
   * @param {Mat2d} model_matrix The affine transformation matrix of the parent of the initial mercator point
   * @param {Mat2d} world_to_screen_matrix The transformation matrix defining the world-to-screen space transformation
   * @returns {ProjectedPointData} returns the input out_point_data argument after it has been initialized
   */
  projectPoint: (
    initial_merc_point,
    out_point_data,
    model_matrix,
    world_to_screen_matrix
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

    if (world_to_screen_matrix !== null) {
      Point2d.transformMat2d(
        out_point_data.screen_point,
        out_point_data.merc_point,
        world_to_screen_matrix
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
   * @typedef {object} ViewBoundsIntersectData
   *
   * Describes intersection data defined by intersecting a specific line segment
   * against a view. This intersection data will include points that either
   * intersect or is contained by a view. The arrays of intersection points will
   * either be of size 2 (line segment intersects or is contained by a view) or
   * be size 0 (line segment does not intersect or is not contained by a view)
   *
   * @property {Point2d[]} lonlat_pts Array of points defined in WGS84 lat/lon space that either intersect or are contained by a view
   * @property {Point2d[]} screen_pts Array of points defined in screen space that either intersect or are contained by a view
   *                                           This is the same set of points as lonlat_pts above, but transformed into screen space.
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
   * @param {Mat2d} world_to_screen_matrix The world-to-screen transformation matrix
   * @returns {ViewBoundsIntersectData}
   */
  intersectViewBounds: (
    start_point_data,
    end_point_data,
    view_aabox,
    world_to_screen_matrix
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
      lonlat_pts: [],

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
      rtn_obj.lonlat_pts.push(start_point_data.lonlat_point)
      rtn_obj.screen_pts.push(start_point_data.screen_point)
      rtn_obj.pts_t.push(0)
      rtn_obj.lonlat_pts.push(end_point_data.lonlat_point)
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
          canIntersect(numerator_t, denominator_t) &&
          canIntersect(numerator_u_functor(), denominator_u_functor())
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
            const new_lonlat_pt = Point2d.create(-delta_x * t, -delta_y * t)
            Point2d.addVec2(
              new_lonlat_pt,
              start_point_data.lonlat_point,
              new_lonlat_pt
            )
            lonlat_pt = new_lonlat_pt

            const new_screen_pt = Point2d.clone(new_lonlat_pt)
            // conver the new segment point back to mercator for drawing
            LatLonUtils.conv4326To900913(new_screen_pt, new_screen_pt)

            // now convert to screen space
            Point2d.transformMat2d(
              new_screen_pt,
              new_screen_pt,
              world_to_screen_matrix
            )
            screen_pt = new_screen_pt
          }
          rtn_obj.subdivide = true

          // insersection points must be stored by t in ascending order.
          // There will be exactly 2 points in the end, so just need to check
          // whether to insert this new intersection point at the front or back
          // of the returned point array
          if (t < current_t) {
            rtn_obj.lonlat_pts.splice(0, 0, lonlat_pt)
            rtn_obj.screen_pts.splice(0, 0, screen_pt)
            rtn_obj.pts_t.splice(0, 0, t)
          } else {
            rtn_obj.lonlat_pts.push(lonlat_pt)
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

      if (rtn_obj.lonlat_pts.length < 2) {
        // bounds right-edge, we know that delta_x = 0 for the points defining the right edge
        delta_edge = x1 - x4
        check_full_intersect(
          () => delta_edge,
          () => delta_x,
          () => -delta_x * (y1 - y3) - -delta_y * delta_edge,
          () => delta_x * (y3 - y4)
        )

        if (rtn_obj.lonlat_pts.length < 2) {
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
  },

  /**
   * Converts an axis-aligned bounding box in web-mercator (srid 900913) coordinates
   * to WGS84 (srid: 4326) coordinates.
   * @param {AABox2d} output_bounds The bounds to store the results of the 900913->4326 conversion
   * @param {AABox2d} input_bounds The bounds in 900913 coordinate to convert to 4326
   * @returns {AABox2d} Returns output_bounds. The return can be useful for chaining.
   */
  boundsConv900913to4326(output_bounds, input_bounds) {
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
}
