import * as LatLonUtils from "../../../utils/utils-latlon"
import * as MapdDraw from "@mapd/mapd-draw/dist/mapd-draw"
import LatLonViewIntersectUtils from "./LatLonViewIntersectUtils"

const { AABox2d, Mat2d, Point2d } = MapdDraw
const MathExt = MapdDraw.Math

export default class LatLonPoly extends MapdDraw.Poly {
  constructor(draw_engine, opts) {
    if (opts.debug === undefined) {
      // if true, will activate the use of the _drawDebug method for drawing
      // extra debug info on top of the original shape draw.
      opts.debug = true
    }
    super(opts)
    this._draw_engine = draw_engine

    this._screenPts = []
    this._geomDirty = true
    this._viewDirty = true

    // set the viewDirty flag to force a rebuild of the drawn vertices when
    // the camera changes. This is required because we are doing a screen-space-based
    // line subdivision that is obviously dependent on the view.
    const that = this
    this._draw_engine.camera.on("changed", event => {
      that._viewDirty = true
    })

    // maximum length of subdivided line segment in pixels
    this._max_segment_pixel_distance = 40
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
   * @param {Mat2d} world_to_screen_matrix Matrix defining world-to-screen transformation
   * @returns
   */
  _subdivideLineSegment(
    start_point_data,
    end_point_data,
    view_aabox,
    world_to_screen_matrix
  ) {
    const view_intersect_data = LatLonViewIntersectUtils.intersectViewBounds(
      start_point_data,
      end_point_data,
      view_aabox,
      world_to_screen_matrix
    )

    if (!view_intersect_data.subdivide) {
      return
    }

    console.assert(view_intersect_data.lonlat_pts.length === 2)

    const [start_lonlat_pt, end_lonlat_pt] = view_intersect_data.lonlat_pts
    const [start_screen_pt, end_screen_pt] = view_intersect_data.screen_pts

    const distance = Point2d.distance(start_screen_pt, end_screen_pt)
    if (distance > this._max_segment_pixel_distance) {
      // do subdivisions in a cartesian space using lon/lat
      // This is how ST_Contains behaves in the server right now
      const num_subdivisions = Math.ceil(
        distance / this._max_segment_pixel_distance
      )
      for (let i = 1; i < num_subdivisions; i += 1) {
        const new_segment_point = Point2d.create()
        Point2d.lerp(
          new_segment_point,
          start_lonlat_pt,
          end_lonlat_pt,
          i / num_subdivisions
        )
        // conver the new segment point back to mercator for drawing
        LatLonUtils.conv4326To900913(new_segment_point, new_segment_point)

        // now convert to screen space
        Point2d.transformMat2d(
          new_segment_point,
          new_segment_point,
          world_to_screen_matrix
        )
        this._screenPts.push(Point2d.clone(new_segment_point))
      }
    }
  }

  /**
   * Updates the internal geometry representation of the polygon for drawing.
   * This means auto-subdividing line segments that are in view and are larger
   * than the max screen-space distance threshold.
   * @param {Mat2d} world_to_screen_matrix web-mercator-to-pixel transformation matrix
   */
  _updateGeom(world_to_screen_matrix) {
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
        // Early out. Shape is not in view
        return
      }

      // convert our intersection bounds to WGS84 lon/lat
      LatLonViewIntersectUtils.boundsConv900913to4326(
        world_bounds,
        world_bounds
      )

      // Work on 2 points at a time, swapping as we interate.
      // Keep the first point around to close the polygon loop as the final iteration
      const first_point_data = LatLonViewIntersectUtils.buildProjectedPointData()
      let start_point_data = LatLonViewIntersectUtils.buildProjectedPointData()
      let end_point_data = LatLonViewIntersectUtils.buildProjectedPointData()

      const model_xform = this.globalXform

      // projected point data for the first vert. The point data includes the point in
      // web-mercator, wgs84 lon/lat, and screen space coordinates
      LatLonViewIntersectUtils.projectPoint(
        this._verts[0],
        first_point_data,
        model_xform,
        world_to_screen_matrix
      )

      LatLonViewIntersectUtils.copyProjectedPoint(
        start_point_data,
        first_point_data
      )

      this._screenPts.push(Point2d.clone(start_point_data.screen_point))

      let swap_tmp = null
      for (let i = 1; i < this._verts.length; i += 1) {
        LatLonViewIntersectUtils.projectPoint(
          this._verts[i],
          end_point_data,
          model_xform,
          world_to_screen_matrix
        )

        // check if this line segment needs subdividing
        this._subdivideLineSegment(
          start_point_data,
          end_point_data,
          world_bounds,
          world_to_screen_matrix
        )
        this._screenPts.push(Point2d.clone(end_point_data.screen_point))

        // now swap the endpoints
        swap_tmp = start_point_data
        start_point_data = end_point_data
        end_point_data = swap_tmp
      }

      // check if the final line segment that closes the loop needs subdividing
      this._subdivideLineSegment(
        start_point_data,
        first_point_data,
        world_bounds,
        world_to_screen_matrix
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

  /**
   * Debug draw routine that visualizes the subdivided verts that are auto-generated.
   * Only works if the 'debug' option is set to true in the constructor
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawDebug(ctx) {
    if (this._screenPts.length) {
      ctx.save()

      ctx.fillStyle = "orange"
      this._screenPts.forEach(point => {
        ctx.beginPath()
        ctx.arc(point[0], point[1], 3, 0, MathExt.TWO_PI, false)
        ctx.fill()
      })

      ctx.restore()
    }
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      type: "LatLonPoly" // this must match the name of the class
    })
  }
}
