"use strict"

import * as LatLonUtils from "../../utils/utils-latlon"
import * as MapdDraw from "@mapd/mapd-draw/dist/mapd-draw"
import simplify from "simplify-js"
import { logger } from "../../utils/logger"

/* istanbul ignore next */
let LatLonCircleClass = null

/* istanbul ignore next */
export function getLatLonCircleClass() {
  if (!LatLonCircleClass) {
    LatLonCircleClass = class LatLonCircle extends MapdDraw.Circle {
      constructor(opts) {
        super(opts)
        this._mercatorPts = []
        this._geomDirty = true
        this._initialRadius = this._radius
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

      _updateGeom() {
        if (this._geomDirty || this._boundsOutOfDate) {
          const centerMerc = [0, 0]
          const centerLatLon = [0, 0]
          const scale = [0, 0]
          const xform = this.globalXform
          MapdDraw.Mat2d.svd(centerMerc, scale, null, xform)

          const degrees_between_points = 6.0
          const number_of_points = Math.floor(360 / degrees_between_points)
          const dist_radians = this._radius / 6250

          // convert from mercator to lat/lon
          LatLonUtils.conv900913To4326(centerLatLon, centerMerc)
          const center_lat_radians = centerLatLon[1] * MapdDraw.Math.DEG_TO_RAD
          const center_lon_radians = centerLatLon[0] * MapdDraw.Math.DEG_TO_RAD

          MapdDraw.AABox2d.initEmpty(this._aabox)
          this._mercatorPts = []
          for (let index = 0; index < number_of_points; index = index + 1) {
            const degrees = index * degrees_between_points
            const degree_radians = degrees * Math.PI / 180
            const point_lat_radians = Math.asin(
              Math.sin(center_lat_radians) * Math.cos(dist_radians) +
                Math.cos(center_lat_radians) *
                  Math.sin(dist_radians) *
                  Math.cos(degree_radians)
            )
            const point_lon_radians =
              center_lon_radians +
              Math.atan2(
                Math.sin(degree_radians) *
                  Math.sin(dist_radians) *
                  Math.cos(center_lat_radians),
                Math.cos(dist_radians) -
                  Math.sin(center_lat_radians) * Math.sin(point_lat_radians)
              )
            const point_lat = point_lat_radians * 180 / Math.PI
            const point_lon = point_lon_radians * 180 / Math.PI
            const point = MapdDraw.Point2d.create(point_lon, point_lat)

            // convert from lon/lat to mercator
            LatLonUtils.conv4326To900913(point, point)

            MapdDraw.AABox2d.encapsulatePt(this._aabox, this._aabox, point)
            this._mercatorPts.push(point)
          }

          const pivot = MapdDraw.Point2d.create(0, 0)
          MapdDraw.AABox2d.getCenter(pivot, this._aabox)
          MapdDraw.Point2d.sub(pivot, pivot, centerMerc)
          this.pivot = pivot

          this._geomDirty = false
          this._boundsOutOfDate = false
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
        // only need the mercator to screen projection -- pull out any
        // local transforms here
        const xform = MapdDraw.Mat2d.clone(this.globalXform)
        MapdDraw.Mat2d.invert(xform, xform)
        MapdDraw.Mat2d.multiply(xform, this._fullXform, xform)
        ctx.setTransform(
          xform[0],
          xform[1],
          xform[2],
          xform[3],
          xform[4],
          xform[5]
        )

        this._updateGeom()

        if (this._mercatorPts.length) {
          ctx.moveTo(this._mercatorPts[0][0], this._mercatorPts[0][1])
          for (let i = 1; i < this._mercatorPts.length; i = i + 1) {
            ctx.lineTo(this._mercatorPts[i][0], this._mercatorPts[i][1])
          }
          ctx.closePath()
        }
      }

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
    const mousepos = MapdDraw.Point2d.create(diffX, diffY)

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
    this.startmousepos = MapdDraw.Point2d.create(0, 0)
    this.startmouseworldpos = MapdDraw.Point2d.create(0, 0)

    this.useLonLat =
      typeof this.chart.useLonLat === "function" && this.chart.useLonLat()

    if (this.useLonLat) {
      this.startmouselatlonpos = MapdDraw.Point2d.create(0, 0)
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
    MapdDraw.Point2d.copy(
      this.startmousepos,
      this.getRelativeMousePosFromEvent(event)
    )
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
      const mousescreenpos = MapdDraw.Point2d.create(0, 0)
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
        const radius = MapdDraw.Point2d.distance(
          this.startmouseworldpos,
          mousescreenpos
        )
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
    this.startPosAABox = MapdDraw.AABox2d.create()
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
    MapdDraw.AABox2d.initEmpty(this.startPosAABox)
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
      !MapdDraw.Point2d.equals(verts[0], verts[verts.length - 1]) &&
      this.lastVert &&
      !MapdDraw.Point2d.equals(
        verts[verts.length - 1],
        this.lastVert.getPositionRef()
      )
    if (verts.length > 2 && (!removeLastVert || verts.length > 3)) {
      // Check if there is a loop in the current verts, remove the last point
      // if so
      if (removeLastVert) {
        verts.pop()
      }

      const poly = new MapdDraw.Poly(
        Object.assign(
          {
            verts
          },
          this.defaultStyle
        )
      )
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
      const mouseworldpos = MapdDraw.Point2d.create(0, 0)
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
        MapdDraw.AABox2d.initCenterExtents(this.startPosAABox, startpos, [
          10,
          10
        ])
        if (MapdDraw.AABox2d.containsPt(this.startPosAABox, mousepos)) {
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
      const mouseworldpos = MapdDraw.Point2d.create(0, 0)
      this.drawEngine.project(mouseworldpos, mousepos)
      this.activeIdx = this.appendVertex(mousepos, mouseworldpos)
    }

    if (this.activeShape || this.activeIdx >= 0) {
      const mousepos = this.getRelativeMousePosFromEvent(event)
      const mouseworldpos = MapdDraw.Point2d.create(0, 0)
      this.drawEngine.project(mouseworldpos, mousepos)

      if (event.shiftKey) {
        if (this.activeIdx === 1) {
          const diff = [0, 0]
          const prevmousepos = [0, 0]
          const verts = this.lineShape.vertsRef
          this.drawEngine.unproject(prevmousepos, verts[0])
          MapdDraw.Point2d.sub(diff, mousepos, prevmousepos)
          let angle = Math.atan2(diff[1], diff[0])
          angle =
            MapdDraw.Math.round(angle / MapdDraw.Math.QUATER_PI) *
            MapdDraw.Math.QUATER_PI
          const transformDir = [Math.cos(angle), Math.sin(angle)]
          MapdDraw.Vec2d.scale(
            diff,
            transformDir,
            MapdDraw.Vec2d.dot(diff, transformDir)
          )
          MapdDraw.Point2d.addVec2(mousepos, prevmousepos, diff)
          this.drawEngine.project(mouseworldpos, mousepos)
        } else if (this.activeIdx > 1) {
          const verts = this.lineShape.vertsRef
          const pt1 = [0, 0]
          this.drawEngine.unproject(pt1, verts[this.activeIdx - 2])
          const pt2 = [0, 0]
          this.drawEngine.unproject(pt2, verts[this.activeIdx - 1])
          const dir1 = [0, 0]
          MapdDraw.Point2d.sub(dir1, pt2, pt1)
          MapdDraw.Vec2d.normalize(dir1, dir1)
          const dir2 = [0, 0]
          MapdDraw.Point2d.sub(dir2, mousepos, pt2)
          // MapdDraw.Vec2d.normalize(dir2, dir2)
          let angle = MapdDraw.Vec2d.angle(dir1, dir2)
          angle =
            MapdDraw.Math.round(angle / MapdDraw.Math.QUATER_PI) *
            MapdDraw.Math.QUATER_PI
          const matrix = MapdDraw.Mat2.create()
          MapdDraw.Mat2.fromRotation(matrix, angle)
          const transformDir = [0, 0]
          MapdDraw.Vec2d.transformMat2(transformDir, dir1, matrix)
          MapdDraw.Vec2d.scale(
            transformDir,
            transformDir,
            MapdDraw.Vec2d.dot(dir2, transformDir)
          )
          MapdDraw.Point2d.addVec2(mousepos, pt2, transformDir)
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
    this.lastWorldPos = MapdDraw.Point2d.create(0, 0)
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
      const currWorldPos = MapdDraw.Point2d.create(0, 0)
      this.drawEngine.project(currWorldPos, currPos)
      if (!MapdDraw.Point2d.equals(currPos, this.lastPos)) {
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
        MapdDraw.Point2d.copy(this.lastPos, currPos)
        MapdDraw.Point2d.copy(this.lastWorldPos, currWorldPos)
        this.canvas.focus()
      }
      event.preventDefault()
    }
  }

  mouseupCB(event) {
    if (this.activeShape) {
      const verts = this.activeShape.vertsRef
      const screenVert = MapdDraw.Point2d.create(0, 0)
      const worldVert = MapdDraw.Point2d.create(0, 0)
      let simpleVerts = verts.map(vert => {
        this.drawEngine.unproject(screenVert, vert)
        return {
          x: screenVert[0],
          y: screenVert[1]
        }
      })
      simpleVerts = simplify(simpleVerts, 4, true)
      const newverts = simpleVerts.map(vert => {
        MapdDraw.Point2d.set(screenVert, vert.x, vert.y)
        this.drawEngine.project(worldVert, screenVert)
        return MapdDraw.Point2d.clone(worldVert)
      })

      if (newverts.length < 3) {
        logger.warn(
          "The resulting lasso shape is a point or a straight line. Cannot build a polygon from it. Please try again"
        )
        this.drawEngine.deleteShape(this.activeShape)
        this.activeShape = null
      } else {
        const poly = new MapdDraw.Poly(
          Object.assign(
            {
              verts: newverts
            },
            this.defaultStyle
          )
        )
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
