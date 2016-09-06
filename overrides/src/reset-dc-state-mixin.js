export default function resetDCStateMixin (dc) {
  dc.resetState = function () {
    dc.resetRedrawStack()
    dc.resetRenderStack()
    return dc
  }

  return dc
}
