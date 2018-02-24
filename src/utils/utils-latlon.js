"use strict"

import * as MapdDraw from "@mapd/mapd-draw/dist/mapd-draw"

/**
 * Calculates the distance in meters between two lon/lat coordinates
 * @param  {number} fromlon Longitude to start from
 * @param  {number} fromlat Latitude to start from
 * @param  {number} tolon   Longitude to end at
 * @param  {number} tolat   Latitude to end at
 * @return {number}         Distance in meters from two lon/lat coords
 */
export function distance_in_meters(fromlon, fromlat, tolon, tolat) {
  const latitudeArc = (fromlat - tolat) * MapdDraw.Math.DEG_TO_RAD
  const longitudeArc = (fromlon - tolon) * MapdDraw.Math.DEG_TO_RAD
  let latitudeH = Math.sin(latitudeArc * 0.5)
  latitudeH = latitudeH * latitudeH
  let lontitudeH = Math.sin(longitudeArc * 0.5)
  lontitudeH = lontitudeH * lontitudeH
  const tmp =
    Math.cos(fromlat * MapdDraw.Math.DEG_TO_RAD) *
    Math.cos(tolat * MapdDraw.Math.DEG_TO_RAD)
  return (
    6372797.560856 * (2.0 * Math.asin(Math.sqrt(latitudeH + tmp * lontitudeH)))
  )
}

/**
 * Converts mercator x coordinate to longitude
 * @param  {number} x X coordinate in mercator projected space
 * @return {number}   Longitude
 */
export function conv900913To4326X(x) {
  return x / 111319.490778
}

/**
 * Converts mercator y coordinate to latitude
 * @param  {number} y Y coordinate in mercator projected space
 * @return {number}   Latitude
 */
export function conv900913To4326Y(y) {
  return (
    57.295779513 * (2 * Math.atan(Math.exp(y / 6378136.99911)) - 1.570796327)
  )
}

/**
 * Converts 2d point in mercator projected space to a lon/lat coordinate
 * @param  {Point2d} out   2d point to store the converted lat/lon coordinate
 * @param  {Point2d} coord 2d point in mercator projected space to convert
 * @return {Point2d}       Point referred to by the out arg
 */
export function conv900913To4326(out, coord) {
  return MapdDraw.Point2d.set(
    out,
    conv900913To4326X(coord[0]),
    conv900913To4326Y(coord[1])
  )
}

/**
 * Converts a longitude coordinate to an x coordinate in mercator projected space
 * @param  {number} x Longitude
 * @return {number}   X coordinate in mercator projected space
 */
export function conv4326To900913X(x) {
  return x * 111319.490778
}

/**
 * Converts a latitude coordinate to a y coordinate in mercator projected space
 * @param  {number} x Latitude
 * @return {number}   Y coordinate in mercator projected space
 */
export function conv4326To900913Y(y) {
  return 6378136.99911 * Math.log(Math.tan(0.00872664626 * y + 0.785398163397))
}

/**
 * Converts 2d lon/lat point to a point in mercator projected space
 * @param  {Point2d} out   2d point to store the converted mercator coordinate
 * @param  {Point2d} coord 2d point in lon/lat to convert
 * @return {Point2d}       Point referred to by the out arg
 */
export function conv4326To900913(out, coord) {
  return MapdDraw.Point2d.set(
    out,
    conv4326To900913X(coord[0]),
    conv4326To900913Y(coord[1])
  )
}
