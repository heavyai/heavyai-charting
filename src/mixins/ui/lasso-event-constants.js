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
