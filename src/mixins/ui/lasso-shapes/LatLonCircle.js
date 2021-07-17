import * as LatLonUtils from "../../../utils/utils-latlon"
import * as MapdDraw from "@mapd/mapd-draw/dist/mapd-draw"
import LatLonViewIntersectUtils from "./LatLonViewIntersectUtils"

const { AABox2d, Mat2d, Point2d, Vec2d } = MapdDraw
const MathExt = MapdDraw.Math

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
 * @param {number} max_segment_pixel_distance The max distance in pixels of line segments representing
 *                                            the circle when drawing.
 * @param {number} degrees_between_points The angle difference in degrees between consecutive points of
 *                                        a LatLonCircle
 * @returns
 */

/**
 * Creates a descriptor of a LatLonCircle instance
 * @param {LatLonCircle} latlon_circle An instance of the LatLonCircle class to build a descriptor for.
 * @returns {CircleDescriptor}
 */
function createCircleDescriptor(latlon_circle) {
  const center_mercator = Point2d.create()
  Mat2d.svd(center_mercator, null, null, latlon_circle.globalXform)

  // the 'true' argument below indicates to include the lonlat point defined
  // in radians as well as degrees
  const point_data = LatLonViewIntersectUtils.buildProjectedPointData(true)
  LatLonViewIntersectUtils.projectPoint(center_mercator, point_data, null, null)

  // convert to a circle-centeric descriptor form
  return {
    center_mercator: point_data.merc_point,
    center_lonlat: point_data.lonlat_point,
    center_radians: point_data.radians_point,
    radius_radians: getDistanceInRadians(latlon_circle.radius),
    max_segment_pixel_distance: latlon_circle._max_segment_pixel_distance,
    degrees_between_points: latlon_circle._degrees_between_points
  }
}

/**
 * Creates a new 2d lat/lon point that lies on a LatLonCircle at a specific angle about
 * the center of the circle.
 * @param {CircleDescriptor} circle_descriptor An object describing the various geometric/geographic states of a lon/lat-defined circle.
 * @param {Point2d} output_point The coordinates of the new point will be stored in this object
 * @param {number} angle_radians The angle about the center point to position the new point in radians
 * @returns {Point2d} A new lon/lat point that is protruded a specific distance away from a center point at the specified angle
 */
function initializePointOnCircle(
  circle_descriptor,
  output_point,
  angle_radians
) {
  // essentially the inverse of LatLonUtils.distance_in_meters
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
function getAngleOfPointAboutCircle(
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
  const dist_radians = getDistanceInRadians(distance)

  // solve for the new angle in radians, which is the inverse of finding the latitude in
  // initializePointOnCircle() method
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
 * @param {Mat2d} world_to_screen_matrix Matrix describing the projection from web-mercator world space
 *                                       to screen space.
 * @returns {ClosestCirclePointData}
 */
function getClosestPointOnCircleArc(
  circle_descriptor,
  point_lonlat,
  point_radians,
  world_to_screen_matrix
) {
  // get the angle from the center of the circle to the potential subdivide point
  const angle_radians = getAngleOfPointAboutCircle(
    circle_descriptor,
    point_lonlat,
    point_radians
  )
  const angle_degrees = angle_radians * MathExt.RAD_TO_DEG

  // get the closest point on the circle's arc in lon/lat
  const closest_point_data = LatLonViewIntersectUtils.buildProjectedPointData()
  closest_point_data.angle_degrees = angle_degrees
  initializePointOnCircle(
    circle_descriptor,
    closest_point_data.lonlat_point,
    angle_radians
  )

  // convert from lon/lat to mercator
  LatLonUtils.conv4326To900913(
    closest_point_data.merc_point,
    closest_point_data.lonlat_point
  )

  // get the point in screen space
  Point2d.transformMat2d(
    closest_point_data.screen_point,
    closest_point_data.merc_point,
    world_to_screen_matrix
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
function getDistanceInRadians(distance) {
  // radius is stored in kilometers, so convert kilometers to radians.
  // See: https://stackoverflow.com/questions/12180290/convert-kilometers-to-radians
  // for a discussion.
  // The 6372.79756 number is the earth's radius in kilometers and aligns with the
  // earth radius used in distance_in_meters in utils-latlon
  return distance / 6372.797560856
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
 * @param {Mat2d} world_to_screen_matrix 2D matrix describing the web-mercator to screen space transform.
 * @param {GetEndpointsFunctor} get_endpoints_functor
 * @returns
 */
function subdivideCircleArcAtPoint(
  circle_descriptor,
  point_lonlat,
  point_radians,
  shape_view_intersect_aabox,
  world_to_screen_matrix,
  get_endpoints_functor
) {
  // Calculate the closest point on the circle arc to a point.
  // This will be used as a new line break.
  const { angle_degrees, closest_point_data } = getClosestPointOnCircleArc(
    circle_descriptor,
    point_lonlat,
    point_radians,
    world_to_screen_matrix
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

  // get the endpoints and respective angles of the line segment we're subdividing
  const {
    start_angle,
    start_point,
    end_angle,
    end_point
  } = get_endpoints_functor(angle_degrees, closest_point_data)

  // create the new subdivided points with the new point break
  const new_subdivided_points = []
  subdivideArc(
    new_subdivided_points,
    circle_descriptor,
    start_point,
    closest_point_data,
    start_angle,
    angle_degrees - start_angle,
    new_intersect_bounds,
    world_to_screen_matrix,
    false
  )

  new_subdivided_points.push(Point2d.clone(closest_point_data.screen_point))

  subdivideArc(
    new_subdivided_points,
    circle_descriptor,
    closest_point_data,
    end_point,
    angle_degrees,
    end_angle - angle_degrees,
    new_intersect_bounds,
    world_to_screen_matrix,
    false
  )

  return new_subdivided_points
}

/**
 * Determines whether a line segment that represents an arc of a circle defined
 * by a start/end point should be further subdivided for drawing.
 * If the segment should be subdivided, will append subdivided points representing
 * the subdivided arc into the array of screen-projected points for drawing.
 * @param {Point2d[]} subdivided_points_array Array to append the subdivided points to
 * @param {CircleDescriptor} circle_descriptor An object describing the various geometric/geographic properties and states
 *                                             of a LatLonCircle instance.
 * @param {ProjectedPointData} start_point_data Start point of the line segment
 * @param {ProjectedPointData} end_point_data End point of the line segment
 * @param {number} start_angle The angle about the center of the circle for the starting point of
 *                             this segment. In degrees.
 * @param {number} angle_diff The angle difference between the start point and the end point of this
 *                            segment. In degrees.
 * @param {AABox2d} shape_view_intersect_aabox Axis-aligned bounding box describing the
 *                                             intersection between the shape and the current view
 *                                             in WGS84 lat/lon coords
 * @param {Mat2d} world_to_screen_matrix Matrix defining world-to-screen transformation
 * @param {boolean} do_extra_subdivide If true, an extra subdivision point will be added to break up
 *                                     the original line segment in order to give enough extra detail
 *                                     to build out the circle arc with respect to the current view.
 *                                     This is used to differentiate between an outside call, and a recursive
 *                                     call. This should be true for an outside call and false for recursive.
 * @returns
 */
function subdivideArc(
  subdivided_points_array,
  circle_descriptor,
  start_point_data,
  end_point_data,
  start_angle,
  angle_diff,
  shape_view_intersect_aabox,
  world_to_screen_matrix,
  do_extra_subdivide = true
) {
  // get any intersection info for the intersection between a line segment defined by
  // start/end_point_data and the current view.
  const view_intersect_data = LatLonViewIntersectUtils.intersectViewBounds(
    start_point_data,
    end_point_data,
    shape_view_intersect_aabox,
    world_to_screen_matrix
  )

  if (!view_intersect_data.subdivide) {
    // early out. It is determined no subdivision is required.
    return
  }

  console.assert(
    view_intersect_data.lonlat_pts.length === 2,
    `start_point: [${start_point_data.lonlat_point[0]}, ${start_point_data.lonlat_point[1]}], end_point: [${end_point_data.lonlat_point[0]}, ${end_point_data.lonlat_point[1]}], view_aabox: [${shape_view_intersect_aabox[0]}, ${shape_view_intersect_aabox[1]}, ${shape_view_intersect_aabox[2]}, ${shape_view_intersect_aabox[3]}], worldToScreenMatrix: [${world_to_screen_matrix[0]}, ${world_to_screen_matrix[1]}, ${world_to_screen_matrix[2]}, ${world_to_screen_matrix[3]}, ${world_to_screen_matrix[4]}, ${world_to_screen_matrix[5]}]`
  )

  const [start_screen_pt, end_screen_pt] = view_intersect_data.screen_pts
  const [start_lonlat_pt, end_lonlat_pt] = view_intersect_data.lonlat_pts
  const [start_t, end_t] = view_intersect_data.pts_t

  const distance = Point2d.distance(start_screen_pt, end_screen_pt)
  if (distance > circle_descriptor.max_segment_pixel_distance) {
    // This segment should be subdivided. But first check whether we should add a point
    // break to add more detail to this line segment before further subdivision. For example,
    // if at the right zoom, the endpoints of a line could be way off screen, but a small sliver
    // of the line could cross the view, but the arc of the circle represented by that line
    // segment could be quite a distance away in pixels and cover a larger area of screen.
    // Or, in other words, the pixel coverage for the line segment/view intersection may be small
    // compared to the arc that is represented, leading to an undersampling of points for the arc.
    // To fix this, subdivide the line segment at a point that is in/near the view bounds so we
    // get two new line segments that are more appropriately sampled, therefore not leading to
    // an undersampled arc.

    // TODO(croot); the 0.25 threshold is just an empirical "good enough" for the ratio
    // of the full line segment length and it's view-intersection length. A more clever
    // metric could be used
    if (
      do_extra_subdivide &&
      !MathExt.floatingPtEquals(start_t, 0) &&
      !MathExt.floatingPtEquals(end_t, 1) &&
      end_t - start_t < 0.25
    ) {
      // get the angle from the center of the circle to the potential subdivide point
      const tmp_point = Point2d.clone(start_lonlat_pt)
      const start_radians_pt = tmp_point
      Vec2d.scale(start_radians_pt, start_radians_pt, MathExt.DEG_TO_RAD)

      const { closest_point_data } = getClosestPointOnCircleArc(
        circle_descriptor,
        start_lonlat_pt,
        start_radians_pt,
        world_to_screen_matrix
      )

      // If the distance between the line segment and the circle arc it represents
      // is greater than the set threshold, than add the new point break for better
      // sampling.
      if (
        Point2d.distance(start_screen_pt, closest_point_data.screen_point) >
        circle_descriptor.max_segment_pixel_distance
      ) {
        // subdivde the line segment at the midpoint of the in-view line segment
        // TODO(croot): This seems to work 99.5% of the time but could see a jump in the rare case that
        // the line segment crosses very close to a corner.
        const line_center_lonlat = tmp_point
        Point2d.lerp(line_center_lonlat, start_lonlat_pt, end_lonlat_pt, 0.5)
        const line_center_radians = Point2d.clone(line_center_lonlat)
        Vec2d.scale(
          line_center_radians,
          line_center_radians,
          MathExt.DEG_TO_RAD
        )

        const new_subdivided_points = subdivideCircleArcAtPoint(
          circle_descriptor,
          line_center_lonlat,
          line_center_radians,
          shape_view_intersect_aabox,
          world_to_screen_matrix,
          (angle_degrees, new_point_data) => {
            const start_angle = start_point_data.angle_degrees
            const end_angle =
              start_angle + circle_descriptor.degrees_between_points
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

    // number of subdivisions determined for this line segment.
    const num_subdivisions = Math.ceil(
      distance / circle_descriptor.max_segment_pixel_distance
    )

    // start iterating over the number of subdivided points,
    // and reprojecting each one

    const point_radians = Point2d.clone(start_lonlat_pt)
    Vec2d.scale(point_radians, point_radians, MathExt.DEG_TO_RAD)
    const start_angle = getAngleOfPointAboutCircle(
      circle_descriptor,
      start_lonlat_pt,
      point_radians
    )
    Point2d.copy(point_radians, end_lonlat_pt)
    Vec2d.scale(point_radians, point_radians, MathExt.DEG_TO_RAD)
    const end_angle = getAngleOfPointAboutCircle(
      circle_descriptor,
      end_lonlat_pt,
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
      initializePointOnCircle(circle_descriptor, new_point, current_angle)

      // convert from lon/lat to mercator
      LatLonUtils.conv4326To900913(new_point, new_point)

      // now convert to screen space
      Point2d.transformMat2d(new_point, new_point, world_to_screen_matrix)
      subdivided_points_array.push(new_point)
    }
  }
}

/**
 * @typedef PointDistanceFromCircle
 * Describes a point in 2D WGS84 lon/lat degree coordinates with a distance from the
 * center of a LatLonCircle instance.
 * @param {number} distance Distance of this point to the center of a LatLonCircle instance.
 * @param {Point2d} point 2d point in WGS84 lon/lat degree coordinates.
 */

/**
 * @typedef BoundsDistanceFromCircle
 * @param {number} min_bounds_dist Minimum distance to the 4 corners of an axis-aligned bounding box
 *                                 from the center of a LatLonCircle.
 * @param {number} max_bounds_dist Maximum distance to the 4 cornders of an axis-aligned bounding box
 *                                 from the center of a LatLonCircle.
 * @param {PointDistanceFromCircle[]} bounds_distances Array of points & distances of the 4 corners of the
 *                                                     input bounding box. The distance is the distance to
 *                                                     the center of a LatLonCircle instance. The array is
 *                                                     sorted by distance in ascending order.
 */

/**
 * Returns a data structure object that represents a list of the corners
 * of a WGS84 lon/lat axis-aligned bounding box sorted by distance from
 * the center of a LatLonCircle.
 * @param {Point2d} center_lonlat The center of a LatLonCircle in WGS84 lon/lat degree coordinates.
 * @param {AABox2d} bounds_lonlat An axis-aligned bounding box in WGS84 lon/lat degree coordinates.
 * @returns {BoundsDistanceFromCircle}
 */
function getBoundsDistanceData(center_lonlat, bounds_lonlat) {
  const bounds_distances = new Array(4)
  for (let i = 0; i < 4; ++i) {
    const bounds_lon =
      i & 1 ? bounds_lonlat[AABox2d.MAXX] : bounds_lonlat[AABox2d.MINX]
    const bounds_lat =
      i > 1 ? bounds_lonlat[AABox2d.MAXY] : bounds_lonlat[AABox2d.MINY]
    const point = Point2d.create(bounds_lon, bounds_lat)
    // distance from center to corner of bounds in kilometers
    const distance =
      LatLonUtils.distance_in_meters(
        center_lonlat[0],
        center_lonlat[1],
        bounds_lon,
        bounds_lat
      ) / 1000.0
    bounds_distances[i] = {
      distance,
      point
    }
  }

  bounds_distances.sort((a, b) => a.distance - b.distance)

  return {
    min_bounds_dist: bounds_distances[0].distance,
    max_bounds_dist: bounds_distances[3].distance,
    bounds_distances
  }
}

export default class LatLonCircle extends MapdDraw.Circle {
  constructor(draw_engine, opts) {
    if (opts.debug === undefined) {
      // if true, will activate the use of the _drawDebug method for drawing
      // extra debug info on top of the original shape draw.
      opts.debug = false
    }
    super(opts)

    this._draw_engine = draw_engine

    this._geomDirty = true
    this._viewDirty = true

    const that = this
    this._draw_engine.camera.on("changed", event => {
      that._viewDirty = true
    })

    // maximum length of subdivided line segment in pixels
    this._max_segment_pixel_distance = 40

    this._initial_radius = this._radius

    // degrees between successive points in the drawn
    // segmented circle
    this._degrees_between_points = 6.0

    // Now calculate a baseline axis-aligned bounding box area based on the
    // max segment distance for subdividing. This will be used to do quick
    // checks on whether subdivision is needed or not.

    // obviously this circumferences is just an estimate, but good enough
    const base_screen_space_circumference =
      (360.0 / this._degrees_between_points) * this._max_segment_pixel_distance

    const base_screen_space_diameter = base_screen_space_circumference / Math.PI

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
    this.radius = this._initial_radius * Math.min(scale[0], scale[1])
  }

  set initialRadius(radius) {
    this.radius = radius
    this._initial_radius = radius
  }

  resetInitialRadius() {
    this._initial_radius = this.radius
  }

  /**
   * Updates the static points initially approximating the full circle arc
   * @param {CircleDescriptor} [circle_descriptor] Optional circle descriptor for this LatLonCircle instance used
   *                                               as input for point-on-circle initialization routines
   */
  _updateGeom(circle_descriptor = null) {
    if (this._geomDirty || this._boundsOutOfDate) {
      if (circle_descriptor === null) {
        circle_descriptor = createCircleDescriptor(this)
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
        initializePointOnCircle(circle_descriptor, lonlat_point, angle_radians)

        // convert from lon/lat to mercator
        LatLonUtils.conv4326To900913(merc_point, lonlat_point)

        // update the bounds
        AABox2d.encapsulatePt(this._aabox, this._aabox, merc_point)
      }

      // re-adjust the pivot as it's not necessarily right in the center of the bounds.
      const pivot = Point2d.create(0, 0)
      AABox2d.getCenter(pivot, this._aabox)
      Point2d.sub(pivot, pivot, circle_descriptor.center_mercator)
      this.pivot = pivot

      this._geomDirty = false
      this._boundsOutOfDate = false
    }
  }

  /**
   * Updates the internal subdivided geometry representation of the circle for drawing.
   * This method will auto-subdivide the initial set of line segments approximating the
   * circle where appropriate.
   *
   * @param {Mat2d} world_to_screen_matrix web-mercator-to-pixel transformation matrix for the current view
   * @returns
   */
  _updateGeomForView(world_to_screen_matrix) {
    if (this._viewDirty || this._geomDirty || this._boundsOutOfDate) {
      const circle_descriptor = createCircleDescriptor(this)

      // update the initial set of line segments to start with
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
      AABox2d.intersection(world_intersect_bounds, this._aabox, world_bounds)
      if (AABox2d.isEmpty(world_intersect_bounds)) {
        // Early out, can skip any subdivision checks if the circle is out-of-view.
        // This is guaranteed to work as long as the _degrees_between_points is a
        // a divisor of 90 degrees.
        return
      }

      // calculate the screen area of the circle. If it's small in screen space, we
      // know we don't have to subdivide and can skip the more costly per-line-segment
      // subdivision checks.
      const screen_aabox = AABox2d.clone(this._aabox)
      AABox2d.transformMat2d(screen_aabox, screen_aabox, world_to_screen_matrix)
      const shape_screen_area = AABox2d.area(screen_aabox)
      const subdivide = shape_screen_area > this._base_screen_area

      // convert our intersection bounds to WGS84 lon/lat
      LatLonViewIntersectUtils.boundsConv900913to4326(
        world_bounds,
        world_bounds
      )
      LatLonViewIntersectUtils.boundsConv900913to4326(
        world_intersect_bounds,
        world_intersect_bounds
      )

      let start_point_data = this._segmented_circle_points[0]
      let end_point_data = null

      // update the screen-space projection of the point. Note: this is not done in _updateGeom.
      // Only the mercator/WGS84 coords are updated there.
      Point2d.transformMat2d(
        start_point_data.screen_point,
        start_point_data.merc_point,
        world_to_screen_matrix
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
            world_to_screen_matrix
          )

          // subdivide this line segment if necessary
          subdivideArc(
            this._subdivided_screen_points,
            circle_descriptor,
            start_point_data,
            end_point_data,
            start_point_data.angle_degrees,
            this._degrees_between_points,
            world_intersect_bounds,
            world_to_screen_matrix
          )
          this._subdivided_screen_points.push(
            Point2d.clone(end_point_data.screen_point)
          )

          start_point_data = end_point_data
        }

        end_point_data = initial_point_data

        // subdivide the line segment that closes the circle loop
        subdivideArc(
          this._subdivided_screen_points,
          circle_descriptor,
          start_point_data,
          initial_point_data,
          start_point_data.angle_degrees,
          this._degrees_between_points,
          world_intersect_bounds,
          world_to_screen_matrix
        )

        if (
          this._subdivided_screen_points.length ===
          this._segmented_circle_points.length
        ) {
          // this means no subdivision was actually performed. We need to double check the edge case where you
          // are zoomed in far enough where there are no line segments for the circle that intersect the view bounds,
          // but its arc does

          // So first calculate real distances for each corner of the bounds.
          const {
            min_bounds_dist,
            max_bounds_dist,
            bounds_distances
          } = getBoundsDistanceData(
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
            const new_subdivided_points = subdivideCircleArcAtPoint(
              circle_descriptor,
              bounds_center,
              bounds_center_radians,
              world_bounds,
              world_to_screen_matrix,
              (angle_degrees, new_point_data) => {
                // we now know the angle to the center of the view bounds.
                // We can then easily determine which two original static
                // points would represent the circle arc that covers that
                // angle.
                start_segment_idx = Math.floor(
                  angle_degrees / that._degrees_between_points
                )
                const start_point =
                  that._segmented_circle_points[start_segment_idx]
                const start_angle = start_point.angle_degrees
                const end_angle = start_angle + that._degrees_between_points
                const end_segment_idx =
                  start_segment_idx === that._segmented_circle_points.length - 1
                    ? 0
                    : start_segment_idx + 1
                const end_point = that._segmented_circle_points[end_segment_idx]
                return { start_angle, start_point, end_angle, end_point }
              }
            )

            // insert the new subdivided points in the appropriate place
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
              bounds_distances[bounds_distances.length - 1].point
            const bounds_point_radians = Point2d.clone(bounds_point_lonlat)
            Vec2d.scale(
              bounds_point_radians,
              bounds_point_radians,
              MathExt.DEG_TO_RAD
            )

            const {
              angle_degrees,
              closest_point_data
            } = getClosestPointOnCircleArc(
              circle_descriptor,
              bounds_point_lonlat,
              bounds_point_radians,
              world_to_screen_matrix
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
        // no subdivision, so just carry on transforming the rest of the static points
        // to screen space.
        for (let i = 1; i < this._segmented_circle_points.length; i += 1) {
          const point_data = this._segmented_circle_points[i]
          Point2d.transformMat2d(
            point_data.screen_point,
            point_data.merc_point,
            world_to_screen_matrix
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

  /**
   * Extra debug draw function to visualize the extra subdivided points and the original
   * line segments.
   * @param {CanvasRenderingContext2d} ctx
   */
  _drawDebug(ctx) {
    if (this._segmented_circle_points.length) {
      ctx.save()

      ctx.strokeStyle = "white"
      ctx.beginPath()
      let curr_pt = this._segmented_circle_points[0]
      ctx.moveTo(curr_pt.screen_point[0], curr_pt.screen_point[1])
      for (let i = 1; i < this._segmented_circle_points.length; i += 1) {
        curr_pt = this._segmented_circle_points[i]
        ctx.lineTo(curr_pt.screen_point[0], curr_pt.screen_point[1])
      }
      ctx.closePath()
      ctx.stroke()

      ctx.fillStyle = "orange"
      this._subdivided_screen_points.forEach(point => {
        ctx.beginPath()
        ctx.arc(point[0], point[1], 3, 0, MathExt.TWO_PI, false)
        ctx.fill()
      })

      ctx.fillStyle = "red"
      this._segmented_circle_points.forEach(point_data => {
        ctx.beginPath()
        ctx.arc(
          point_data.screen_point[0],
          point_data.screen_point[1],
          5,
          0,
          MathExt.TWO_PI,
          false
        )
        ctx.fill()
      })

      ctx.restore()
    }
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      type: "LatLonCircle" // this must match the name of the class
    })
  }
}
