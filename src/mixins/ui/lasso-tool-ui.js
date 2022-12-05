"use strict"

import * as LatLonUtils from "../../utils/utils-latlon"
import * as Draw from "@heavyai/draw/dist/draw"
import simplify from "simplify-js"
import { logger } from "../../utils/logger"
import LatLonCircle from "./lasso-shapes/LatLonCircle"
import LatLonPoly from "./lasso-shapes/LatLonPoly"
import LatLonPolyLine from "./lasso-shapes/LatLonPolyLine"
import assert from "assert"
import {
  LassoShapeEventConstants,
  LassoGlobalEventConstants
} from "./lasso-event-constants"
import LassoToolSetTypes from "./lasso-tool-set-types"

const { AABox2d, Mat2, Point2d, Vec2d } = Draw
const MathExt = Draw.Math
const DragEpsilon = 0.1 // this is a screen-space epsilon to validate that drag events are doing something
// this can be relatively big since we're talking about screen coords

/**
 * Enum class that defines the different contexts in which a shape handler's destroy() method
 * might be called. The enum context can be used in ShapeHandler-derived detroy() method to
 * destroy the appropriate shapes that may have been created by the handler. For example,
 * temporary shapes may be created while creating a new shape (i.e. a simple circle for each
 * vertex for visual emphasis). The shape handler may want to only delete the temporary shapes
 * in its destroy() method and not its primary shape.
 */
class DestroyType {
  // NOTE: the below no-undef disabling is due to the outdated nature of
  // the babel-eslint package and its apparent inappropriate handling of.
  // static member variables

  /**
   * Signifies that the DestroyType is undefined.
   * @enum
   */
  // eslint-disable-next-line no-undef
  static kUndefined = new DestroyType(0, "unefined")

  /**
   * Signifies that destroy was called as a result of
   * the shape handler successfully completing a shape
   * @enum
   */
  // eslint-disable-next-line no-undef
  static kCompleted = new DestroyType(1, "completed")

  /**
   * Signifies that destroy was called as a result of
   * the shape handler creation being cancelled for some
   * reason
   * @enum
   */
  // eslint-disable-next-line no-undef
  static kCancelled = new DestroyType(2, "cancelled")

  /**
   * Signifies that destroy was called as a result of
   * the shape handler's parent tool control being
   * deactivated
   * @enum
   */
  // eslint-disable-next-line no-undef
  static kDeactivated = new DestroyType(3, "deactivated")

  /**
   * Signifies that destroy was called as the tool being reset
   * for some reason
   * @enum
   */
  // eslint-disable-next-line no-undef
  static kReset = new DestroyType(4, "reset")

  /**
   * Returns true if the destroy type is a cancellable type (i.e. cancelled or reset)
   * @param {*} destroy_type
   * @return {Boolean}
   */
  static isCancellableDestroyType(destroy_type) {
    return (
      destroy_type === DestroyType.kCancelled ||
      destroy_type === DestroyType.kReset
    )
  }

  /**
   * Constructs a new DestroyType enum. Should only be called to instantiate static
   * items.
   * @param {Number} value
   * @param {String} description
   */
  constructor(value, description) {
    this.value = value
    this.description_str = description
  }

  valueOf() {
    return this.value
  }

  toString() {
    return this.description_str
  }
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

  /**
   * @returns {LassoToolSetTypes}
   */
  getLassoToolType() {
    assert(
      false,
      `${ShapeHandler.name}::getLassoToolType() needs to be overridden by derived class`
    )
  }

  fireEvent(event_signal, event_obj = {}) {
    this.drawEngine.fire(event_signal, {
      ...event_obj,
      lasso_tool_type: this.getLassoToolType()
    })
  }

  disableBasemapEvents(options = {}) {
    this.chart.hidePopup(true)
    this.chart.enableInteractions(false, options)
  }

  enableBasemapEvents(options = {}) {
    this.chart.enableInteractions(true, options)
  }

  addShape(shape, selectOpts = {}) {
    shape.registerEvents(Object.values(LassoShapeEventConstants))
    this.drawEngine.addShape(shape, selectOpts)
    this.drawEngine.moveShapeToTop(shape)

    // now tag the shape to the originating tool, which may be useful
    // for callback handlers to know
    shape.lasso_tool_type = this.getLassoToolType()
  }

  /**
   * Tags whether this particular shape is a filterable shape or not
   * If it is a filterable shape, the shape will be registered with
   * the parent chart in order to generate a SQL filter expression.
   * If false, the shape will not be registered as a filter with the
   * chart and therefore will not be used to generate a SQL filter
   * expression.
   * @returns {Boolean}
   */
  isFilterableShape() {
    return true
  }

  setupFinalShape(shape, selectOpts = {}) {
    // deactivate the button associated with this shape handler
    // first to make sure that when the shape is selected,
    // the selection event handler is run. The selection event
    // handler is only run when all the button are deactivated,
    // so need to deactivate the button first, and the select
    // the new shape

    // destroying other, temp shapes first, then notifying
    // the stop event later
    this.destroy(DestroyType.kCompleted)
    this.buttonGroup.deactivateButton(this.buttonId)
    if (this.drawEngine.hasShape(shape)) {
      this.drawEngine.selectShape(shape)
    } else {
      this.drawEngine.addShape(shape, selectOpts, true)
      this.drawEngine.moveShapeToTop(shape)
    }

    if (this.isFilterableShape()) {
      this.chart.addFilterShape(shape)
    }

    this.fireEvent(LassoGlobalEventConstants.LASSO_SHAPE_CREATE, {
      shape
    })

    this.notifyDrawStop(DestroyType.kCompleted)

    this.canvas.focus()
  }

  /* eslint-disable no-unused-vars, no-empty-function */
  mousedownCB(event) {}
  mouseupCB(event) {}
  mousemoveCB(event) {}
  mouseoverCB(event) {}
  clickCB(event) {}
  dblclickCB(event) {}
  keydownCB(event) {}
  /* eslint-enable no-unused-vars, no-empty-function */

  isMouseEventInCanvas(mouseEvent) {
    const width = this.canvas.offsetWidth
    const height = this.canvas.offsetHeight
    const rect = this.canvas.getBoundingClientRect()

    const diffX = mouseEvent.clientX - rect.left - this.canvas.clientLeft
    const diffY = mouseEvent.clientY - rect.top - this.canvas.clientTop

    return diffX >= 0 && diffX < width && diffY >= 0 && diffY < height
  }

  getRelativeMousePosFromEvent(mouseEvent) {
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

      this.fireEvent(LassoGlobalEventConstants.LASSO_TOOL_TYPE_ACTIVATED)
    }
  }

  deactivate() {
    if (this.active) {
      if (this.destroy(DestroyType.kDeactivated)) {
        this.notifyDrawStop(DestroyType.kDeactivated)
      }
      document.removeEventListener("mousedown", this.mousedownCB)
      document.removeEventListener("mouseup", this.mouseupCB)
      document.removeEventListener("mousemove", this.mousemoveCB)
      document.removeEventListener("mouseover", this.mouseoverCB)
      document.removeEventListener("click", this.clickCB)
      document.removeEventListener("dblclick", this.dblclickCB)

      this.canvas.removeEventListener("keydown", this.keydownCB)
      this.canvas.blur()

      this.active = false

      this.fireEvent(LassoGlobalEventConstants.LASSO_TOOL_TYPE_DEACTIVATED)
    }
  }

  /**
   * Called under various contexts to destroy either temporary shapes that might have
   * been created during the shape draw and optionally destroy the primary shape that
   * may have been drawn
   * @param {DestroyType} destroy_type Enum describing the context under which destroy()
   *                                   was called.
   */
  // eslint-disable-next-line no-unused-vars
  destroy(destroy_type) {
    assert(
      false,
      `${ShapeHandler.name}::destroy() needs to be overridden by derived class`
    )
  }

  /**
   * Called to fire a tool-create-ended event signal, using a destroy type to provide
   * some extra metadata as to why the draw stopped.
   * @param {DestroyType} destroy_type Enum describing the context under why the draw stopped
   */
  notifyDrawStop(destroy_type) {
    this.fireEvent(LassoGlobalEventConstants.LASSO_TOOL_DRAW_ENDED, {
      ended_reason: destroy_type.toString()
    })
  }

  /**
   * Should be called when a shape draw is cancelled for some reason
   */
  cancelDraw() {
    if (this.destroy(DestroyType.kCancelled)) {
      this.notifyDrawStop(DestroyType.kCancelled)
    }
  }
}

/* istanbul ignore next */
class CircleShapeHandler extends ShapeHandler {
  // eslint-disable-next-line no-undef
  static lasso_tool_type = LassoToolSetTypes.kCircle

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

  getLassoToolType() {
    return CircleShapeHandler.lasso_tool_type
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
      shape.setStyle(this.defaultStyle)
      this.setupFinalShape(shape)
    }
  }

  /**
   * Called under various contexts to destroy either temporary shapes that might have
   * been created during the shape draw and optionally destroy the primary shape that
   * may have been drawn
   * @param {DestroyType} destroy_type Enum describing the context under which destroy()
   *                                   was called.
   * @returns {Boolean} returrns true if one or more shapes were deleted as part of the destroy
   */
  destroy(destroy_type) {
    let is_shape_deleted = false
    if (DestroyType.isCancellableDestroyType(destroy_type)) {
      if (this.activeShape) {
        this.drawEngine.deleteShape(this.activeShape)
        this.fireEvent(LassoGlobalEventConstants.LASSO_SHAPE_DESTROY, {
          shape: this.activeShape
        })
        this.activeShape = null
        is_shape_deleted = true
      }
    }
    return is_shape_deleted
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

      this.activeShape = new LatLonCircle(
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
      this.activeShape = new Draw.Circle(
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
    this.fireEvent(LassoGlobalEventConstants.LASSO_TOOL_DRAW_STARTED)
    event.stopImmediatePropagation()
    event.preventDefault()
  }

  mouseupCB() {
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

  clickCB() {
    this.deactivateShape()
  }

  keydownCB(event) {
    if (
      event.key === "Escape" ||
      event.code === "Escape" ||
      event.keyCode === 27
    ) {
      this.cancelDraw()
      this.enableBasemapEvents()
    }
  }
}

/* istanbul ignore next */
class PolylineShapeHandler extends ShapeHandler {
  // eslint-disable-next-line no-undef
  static lasso_tool_type = LassoToolSetTypes.kPolyLine

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
    this.polyShape = null
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

  getLassoToolType() {
    return PolylineShapeHandler.lasso_tool_type
  }

  /**
   * Called under various contexts to destroy either temporary shapes that might have
   * been created during the shape draw and optionally destroy the primary shape that
   * may have been drawn
   * @param {DestroyType} destroy_type Enum describing the context under which destroy()
   *                                   was called.
   * @returns {Boolean} returns true if one or more shapes were deleted as part of the destroy
   */
  destroy(destroy_type) {
    let is_shape_deleted = false
    if (this.startVert) {
      this.drawEngine.deleteShape(this.startVert)
      this.startVert = null
      is_shape_deleted = true
    }
    if (this.lastVert) {
      this.drawEngine.deleteShape(this.lastVert)
      this.lastVert = null
      is_shape_deleted = true
    }
    if (this.lineShape) {
      this.drawEngine.deleteShape(this.lineShape)
      this.lineShape = null
      is_shape_deleted = true
    }

    if (DestroyType.isCancellableDestroyType(destroy_type)) {
      if (this.polyShape) {
        this.drawEngine.deleteShape(this.polyShape)
        this.fireEvent(LassoGlobalEventConstants.LASSO_SHAPE_DESTROY, {
          shape: this.polyShape
        })
        this.polyShape = null
        is_shape_deleted = true
      }
    }

    AABox2d.initEmpty(this.startPosAABox)
    this.prevVertPos = null
    this.activeShape = null
    this.activeIdx = -1

    return is_shape_deleted
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
        PolyClass = LatLonPoly
        args.push(this.drawEngine)
      } else {
        PolyClass = Draw.Poly
      }
      args.push(
        Object.assign(
          {
            verts
          },
          this.defaultStyle
        )
      )

      this.polyShape = new PolyClass(...args)
      this.setupFinalShape(this.polyShape)
    } else {
      this.cancelDraw()
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
        this.lineShape = new Draw.PolyLine(
          Object.assign(
            {
              verts: [mouseworldpos]
            },
            this.defaultSelectStyle
          )
        )
        this.addShape(this.lineShape)
        this.startVert = new Draw.Point({
          position: mouseworldpos,
          size: 5
        })
        this.addShape(this.startVert)
        this.activeShape = this.startVert
        this.prevVertPos = mousepos
        this.activeIdx = 0

        this.fireEvent(LassoGlobalEventConstants.LASSO_TOOL_DRAW_STARTED)
      } else if (!this.lastVert && this.lineShape.numVerts > 1) {
        const verts = this.lineShape.vertsRef
        this.lastVert = new Draw.Point({
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
      this.cancelDraw()
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
  // eslint-disable-next-line no-undef
  static lasso_tool_type = LassoToolSetTypes.kLasso

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
    this.polyShape = null
    this.lastPos = null
    this.lastWorldPos = null
  }

  getLassoToolType() {
    return LassoShapeHandler.lasso_tool_type
  }

  /**
   * Called under various contexts to destroy either temporary shapes that might have
   * been created during the shape draw and optionally destroy the primary shape that
   * may have been drawn
   * @param {DestroyType} destroy_type Enum describing the context under which destroy()
   *                                   was called.
   * @returns {Boolean} returns true if one or more shapes were deleted as a result of the destroy call
   */
  destroy(destroy_type) {
    let is_shape_deleted = false
    if (this.activeShape) {
      this.drawEngine.deleteShape(this.activeShape)
      this.activeShape = null
      is_shape_deleted = true
    }

    if (DestroyType.isCancellableDestroyType(destroy_type)) {
      if (this.polyShape) {
        this.drawEngine.deleteShape(this.polyShape)
        this.fireEvent(LassoGlobalEventConstants.LASSO_SHAPE_DESTROY, {
          shape: this.polyShape
        })
        this.polyShape = null
        is_shape_deleted = true
      }
    }

    this.lastPos = this.lastWorldPos = null
    return is_shape_deleted
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
    this.fireEvent(LassoGlobalEventConstants.LASSO_TOOL_DRAW_STARTED)
    event.preventDefault()
  }

  mousemoveCB(event) {
    if (!this.isMouseEventInCanvas(event)) {
      if (this.activeShape) {
        this.cancelDraw()
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
          this.activeShape = new Draw.PolyLine(
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
        if (this.destroy(DestroyType.kReset)) {
          this.notifyDrawStop(DestroyType.kReset)
        }
      } else {
        const args = []
        let PolyClass = null
        if (this.useLonLat) {
          PolyClass = LatLonPoly
          args.push(this.drawEngine)
        } else {
          PolyClass = Draw.Poly
        }
        args.push(
          Object.assign(
            {
              verts: newverts
            },
            this.defaultStyle
          )
        )
        this.polyShape = new PolyClass(...args)
        this.setupFinalShape(this.polyShape)
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
      this.cancelDraw()
      this.enableBasemapEvents()
    }
  }
}

class CrossSectionLineShapeHandler extends ShapeHandler {
  // eslint-disable-next-line no-undef
  static lasso_tool_type = LassoToolSetTypes.kCrossSection

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
    this.startPosAABox = AABox2d.create()
    this.timer = null

    this.enableBasemapDebounceFunc = chart.debounce(() => {
      if (this.active) {
        this.enableBasemapEvents()
      }
    }, 100)
  }

  getLassoToolType() {
    return CrossSectionLineShapeHandler.lasso_tool_type
  }

  /**
   * Called under various contexts to destroy either temporary shapes that might have
   * been created during the shape draw and optionally destroy the primary shape that
   * may have been drawn
   * @param {DestroyType} destroy_type Enum describing the context under which destroy()
   *                                   was called.
   * @returns {Boolean} returns true if one or more shapes were deleted as part of the destroy
   */
  destroy(destroy_type) {
    let is_shape_deleted = false
    if (this.startVert) {
      this.drawEngine.deleteShape(this.startVert)
      this.startVert = null
      is_shape_deleted = true
    }
    if (this.lastVert) {
      this.drawEngine.deleteShape(this.lastVert)
      this.lastVert = null
      is_shape_deleted = true
    }

    if (DestroyType.isCancellableDestroyType(destroy_type)) {
      if (this.lineShape) {
        this.drawEngine.deleteShape(this.lineShape)
        this.fireEvent(LassoGlobalEventConstants.LASSO_SHAPE_DESTROY, {
          shape: this.lineShape
        })
        this.lineShape = null
        is_shape_deleted = true
      }
    }

    this.activeShape = null
    this.prevVertPos = null
    AABox2d.initEmpty(this.startPosAABox)

    return is_shape_deleted
  }

  isFilterableShape() {
    // by default, the cross section line shape will not generate any filters.
    // It is only used to generate a line to be used as an input to a
    // cross-section generation function
    return false
  }

  appendVertex(mousepos, mouseworldpos) {
    if (this.lineShape) {
      if (
        !this.prevVertPos ||
        Math.abs(mousepos[0] - this.prevVertPos[0]) > 2 ||
        Math.abs(mousepos[1] - this.prevVertPos[1]) > 2
      ) {
        this.prevVertPos = mousepos
        this.lineShape.appendVert(mouseworldpos)
      }
    }
  }

  finishShape() {
    if (this.lineShape.numVerts > 1) {
      this.lineShape.setStyle(this.defaultStyle)
      // tag the line shape as finished useful for
      // logic elsewhere
      this.lineShape.is_create_finished = true
      this.setupFinalShape(this.lineShape)
    } else {
      this.cancelDraw()
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
        // fire tool start event signal. This should be done
        // before the destroy below to allow users the ability
        // to check whether a shape-destroy signal is the result
        // of a new shape create, if they need that level of control
        this.fireEvent(LassoGlobalEventConstants.LASSO_TOOL_DRAW_STARTED)

        // call destroy to clear out any previously existing
        // lines as there can only be one cross-section line
        // at a time.
        // NOTE: not firing a LASSO_TOOL_DRAW_ENDED event signal here
        this.destroy(DestroyType.kReset)

        const args = []
        let PolyLineClass = null
        if (this.useLonLat) {
          PolyLineClass = LatLonPolyLine
          args.push(this.drawEngine)
        } else {
          PolyLineClass = Draw.PolyLine
        }
        args.push(
          Object.assign(
            {
              verts: [mouseworldpos]
            },
            this.defaultSelectStyle
          )
        )
        this.lineShape = new PolyLineClass(...args)
        // add a tag to the lineShape to determine if it is complete
        // or incomplete (still being created)
        // This will be set to true in the finishShape() method
        this.lineShape.is_create_finished = false

        this.addShape(this.lineShape)
        this.startVert = new Draw.Point({
          position: mouseworldpos,
          size: 5
        })
        this.addShape(this.startVert)
        this.activeShape = this.startVert
        this.prevVertPos = mousepos
      } else {
        const startpos = this.startVert.getPosition()
        this.drawEngine.unproject(startpos, startpos)
        AABox2d.initCenterExtents(this.startPosAABox, startpos, [10, 10])
        if (!AABox2d.containsPt(this.startPosAABox, mousepos)) {
          this.finishShape()
          shapeBuilt = true
        }
      }

      if (!shapeBuilt) {
        this.enableBasemapDebounceFunc()
        this.canvas.focus()
        this.activeShape = null
      }
      event.preventDefault()
    }
  }

  mousemoveCB(event) {
    if (this.lineShape && !this.lineShape.is_create_finished) {
      if (this.lineShape.numVerts === 1) {
        const mousepos = this.getRelativeMousePosFromEvent(event)
        const mouseworldpos = Point2d.create(0, 0)
        this.drawEngine.project(mouseworldpos, mousepos)
        this.activeIdx = this.appendVertex(mousepos, mouseworldpos)
      } else {
        const mousepos = this.getRelativeMousePosFromEvent(event)
        const mouseworldpos = Point2d.create(0, 0)
        this.drawEngine.project(mouseworldpos, mousepos)

        if (event.shiftKey) {
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
        }

        this.lineShape.setVertPosition(1, mouseworldpos)
        this.canvas.focus()
        event.preventDefault()
      }
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
      this.cancelDraw()
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
export default class LassoButtonGroupController {
  constructor(
    parentContainer,
    parentChart,
    parentDrawEngine,
    defaultStyle,
    defaultSelectStyle,
    lassoToolSetTypes = LassoToolSetTypes.kStandard
  ) {
    this._container = parentContainer
    this._chart = parentChart
    this._drawEngine = parentDrawEngine
    this._buttonElements = {}
    this._activeButton = null
    this._activeShape = null

    this._drawEngine.registerEvents(Object.values(LassoGlobalEventConstants))

    this._selectionchangedCB = this._selectionchangedCB.bind(this)
    this._dragbeginCB = this._dragbeginCB.bind(this)
    this._dragendCB = this._dragendCB.bind(this)
    this._keyboardCB = this._keyboardCB.bind(this)

    this._handlers = []
    this._initControls(defaultStyle, defaultSelectStyle, lassoToolSetTypes)
  }

  destroy() {
    if (this._controlsInitted) {
      const canvas = this._drawEngine.getCanvas()
      canvas.removeEventListener("keydown", this._keyboardCB)

      this._handlers.forEach(handler => handler.deactivate())

      this._drawEngine.off(
        Draw.ShapeBuilder.EventConstants.DRAG_END,
        this._dragendCB
      )
      this._drawEngine.off(
        Draw.ShapeBuilder.EventConstants.DRAG_END,
        this._dragbeginCB
      )
      this._drawEngine.off(
        Draw.ShapeBuilder.EventConstants.SELECTION_CHANGED,
        this._selectionchangedCB
      )

      this._controlContainer.removeChild(this._controlGroup)
      this._container.removeChild(this._controlContainer)
    }
  }

  _createControlButton(id, options = {}) {
    const button = document.createElement("button")
    button.className = `heavyai-draw-button ${options.className}`
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
      className: `heavyai-draw-button-${id}`,
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
      this._activeButton.button.classList.remove("heavyai-draw-active-button")
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
      button.classList.add("heavyai-draw-active-button")
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

  _dragbeginCB(event_obj) {
    if (!this._activeShape && !this._activeButton) {
      const canvas = this._drawEngine.getCanvas()
      canvas.focus()
    }

    this._drag_start_pt = event_obj.dragInfo.currentPos

    // fire a global shape edits begin event for all shapes
    this._drawEngine.fire(
      LassoGlobalEventConstants.LASSO_SHAPE_EDITS_BEGIN,
      event_obj
    )

    // as well as fire a shape-local edit event
    event_obj.shapes.forEach(shape => {
      shape.fire(LassoShapeEventConstants.LASSO_SHAPE_EDIT_BEGIN)
    })
  }

  _dragendCB(event) {
    const context = this

    const fire_drag_event =
      context._drag_start_pt &&
      Point2d.squaredDistance(
        context._drag_start_pt,
        event.dragInfo.currentPos
      ) > DragEpsilon

    if (fire_drag_event) {
      // fire a global shape edits end event for all shapes
      this._drawEngine.fire(
        LassoGlobalEventConstants.LASSO_SHAPE_EDITS_END,
        event
      )
    }

    event.shapes.forEach(shape => {
      if (shape instanceof LatLonCircle) {
        // need to reset the inital radius of the latlon circle
        // so that any rescaling is done relative to this
        // new radius
        shape.resetInitialRadius()
      }

      if (fire_drag_event) {
        // fire a shape local edit end event for each specific shape
        shape.fire(LassoShapeEventConstants.LASSO_SHAPE_EDIT_END)
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
          this._drawEngine.fire(LassoGlobalEventConstants.LASSO_SHAPE_DESTROY, {
            shape
          })
        })
      }
      event.preventDefault()
    }
  }

  _initControls(defaultStyle, defaultSelectStyle, lassoToolSetTypes) {
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
    this._controlContainer.className = "heavyai-draw-button-container"
    this._container.appendChild(this._controlContainer)

    const canvas = this._drawEngine.getCanvas()
    // make the canvas focusable so we can catch keyboard events
    // from it, but don't outline it when it is focused
    canvas.setAttribute("tabindex", -1)
    canvas.style.outline = "none"

    this._controlGroup = document.createElement("div")
    this._controlGroup.className = "heavyai-draw-button-control-group"
    this._controlContainer.appendChild(this._controlGroup)

    this._drawEngine.on(
      Draw.ShapeBuilder.EventConstants.SELECTION_CHANGED,
      this._selectionchangedCB
    )
    this._drawEngine.on(
      Draw.ShapeBuilder.EventConstants.DRAG_BEGIN,
      this._dragbeginCB
    )
    this._drawEngine.on(
      Draw.ShapeBuilder.EventConstants.DRAG_END,
      this._dragendCB
    )

    const context = this
    const add_handler = (handler_id_string, handler_class) => {
      context._handlers.push(
        context._createButtonControl(
          handler_id_string,
          handler_class,
          defaultStyle,
          defaultSelectStyle
        )
      )
    }

    const available_lasso_tools = {
      circle: CircleShapeHandler,
      polyline: PolylineShapeHandler,
      lasso: LassoShapeHandler,
      CrossSection: CrossSectionLineShapeHandler
    }

    for (const [lasso_tool_name, lasso_tool_class] of Object.entries(
      available_lasso_tools
    )) {
      if (lassoToolSetTypes & lasso_tool_class.lasso_tool_type) {
        add_handler(lasso_tool_name, lasso_tool_class)
      }
    }

    // NOTE: the canvas dom element needs to have a "tabindex" set to have
    // focusability, and best to have "outline: none" as part
    // of its style so an outline isn't shown when focused
    canvas.addEventListener("keydown", this._keyboardCB)

    this._controlsInitted = true
  }
}
