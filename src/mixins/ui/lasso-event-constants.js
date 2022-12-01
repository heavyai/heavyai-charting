export const LassoShapeEventConstants = {
  /**
   * triggered from an individual shape when a draggable edit
   * event starts on that shape
   */
  LASSO_SHAPE_EDIT_BEGIN: "lasso:shape:edit:begin",

  /**
   * triggered from an individual shape when a draggable edit
   * event completes on that shape
   */
  LASSO_SHAPE_EDIT_END: "lasso:shape:edit:end"
}

export const LassoGlobalEventConstants = {
  /**
   * triggered when a new lasso tool is activated by pressing its
   * corresponding button in the lasso tool set ui
   */
  LASSO_TOOL_TYPE_ACTIVATED: "lasso:tool:activated",

  /**
   * triggered when a lasso tool is deactivated. This can happen
   * when a shape finishes drawing, when a user cancels a drawing
   * (via esc key) or when the user clicks on its corresponding button
   * in the lasso tool set ui to manually deactivate it.
   */
  LASSO_TOOL_TYPE_DEACTIVATED: "lasso:tool:deactivated",

  /**
   * triggered when a new shape is being drawn via a lasso tool
   */
  LASSO_TOOL_CREATE_STARTED: "lasso:tool:create:started",

  /**
   * triggered when a new shape draw ends for some reason,
   * either the shape is successfully completed, or cancelled
   */
  LASSO_TOOL_CREATE_ENDED: "lasso:tool:create:ended",

  /**
   * triggered when a new lasso shape is created
   */
  LASSO_SHAPE_CREATE: "lasso:shape:create",

  /**
   * triggered when a lasso shape is destroyed
   */
  LASSO_SHAPE_DESTROY: "lasso:shape:destroy",

  /**
   * triggered when a draggable edit event starts.
   * The draggable event could be applied to one or many
   * shapes
   */
  LASSO_SHAPE_EDITS_BEGIN: "lasso:shape:edits:begin",

  /**
   * triggered when a draggable edit event completes.
   * The draggable event could be applied to one or many
   * shapes
   */
  LASSO_SHAPE_EDITS_END: "lasso:shape:edits:end"
}
