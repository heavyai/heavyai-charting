import MapboxDraw from "@mapbox/mapbox-gl-draw";
import isEventAtCoordinates from "@mapbox/mapbox-gl-draw/src/lib/is_event_at_coordinates";

const SimpleLineMode = { ...MapboxDraw.modes.draw_line_string }

SimpleLineMode.clickAnywhere = function(state, e) {
    // Stop editing line after second click
    if (state.currentVertexPosition === 1) {
        state.line.addCoordinate(1, e.lngLat.lng, e.lngLat.lat);
        return this.changeMode('simple_select', { featureIds: [state.line.id] });
    }

    if (state.currentVertexPosition > 0 && isEventAtCoordinates(e, state.line.coordinates[state.currentVertexPosition - 1]) ||
        state.direction === 'backwards' && isEventAtCoordinates(e, state.line.coordinates[state.currentVertexPosition + 1])) {
        return this.changeMode('simple_select', { featureIds: [state.line.id] });
    }
    this.updateUIClasses({ mouse: "add" });
    state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
    if (state.direction === 'forward') {
        state.currentVertexPosition++;
        state.line.updateCoordinate(state.currentVertexPosition, e.lngLat.lng, e.lngLat.lat);
    } else {
        state.line.addCoordinate(0, e.lngLat.lng, e.lngLat.lat);
    }

    return null;
}

export default SimpleLineMode
