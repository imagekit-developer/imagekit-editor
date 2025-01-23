import {ActionFn} from "../context";
import commitChange, {CommitChangeAction, COMMIT_CHANGE} from "./commitChange";
import discardChange, {DiscardChangeAction, DISCARD_CHANGE} from "./discardChange";
import generateImageKitUrlAction, {GenerateImageKitUrlAction, GENERATE_IMAGEKIT_URL} from "./generateImageKitUrl";
import redo, {REDO, RedoAction} from "./redo";
import resetHistory, {ResetHistoryAction, RESET_HISTORY} from "./resetHistory";
import setAdjustOptions, {SetAdjustOptionsAction, SET_ADJUST_OPTIONS} from "./setAdjustOptions";
import setAIImageExtenderOptions, {
  SetAIImageExtenderOptionsAction,
  SET_AI_IMAGE_EXTENDER_OPTIONS,
} from "./setAIImageExtenderOptions";
import setAIRetouchOptions, {SetAIRetouchOptionsAction, SET_AI_RETOUCH_OPTIONS} from "./setAIRetouchOptions";
import setAIUpscalerOptions, {SetAIUpscalerOptionsAction, SET_AI_UPSCALER_OPTIONS} from "./setAIUpscalerOptions";
import setBackgroundOptions, {SetBackgroundOptionsAction, SET_BACKGROUND_OPTIONS} from "./setBackgroundOptions";
import setCanvasSize, {SetCanvasSizeAction, SET_CANVAS_SIZE} from "./setCanvasSize";
import setCrop, {SetCropAction, SET_CROP} from "./setCrop";
import setImageDimensionsAction, {SetImageDimensionsAction, SET_IMAGE_DIMENSIONS} from "./setImageDimensions";
import setImageUrlAction, {SetImageUrlAction, SET_IMAGE_URL} from "./setImageUrl";
import setOriginalImageUrlAction, {SetOriginalImageUrlAction, SET_ORIGINAL_IMAGE_URL} from "./setOriginalImageUrl";
import setResizeOptions, {SetResizeOptions, SET_RESIZE_OPTIONS} from "./setResizeOptions";
import setRotation, {SetRotationAction, SET_ROTATION} from "./setRotation";
import setToolValue, {SetToolAction, SET_TOOL} from "./setTool";
import setZoomValue, {SetZoomAction, SET_ZOOM} from "./setZoomValue";
import undo, {UNDO, UndoAction} from "./undo";

const actions: Record<string, ActionFn<Action>> = {
  [COMMIT_CHANGE]: commitChange,
  [DISCARD_CHANGE]: discardChange,
  [GENERATE_IMAGEKIT_URL]: generateImageKitUrlAction,
  [REDO]: redo,
  [RESET_HISTORY]: resetHistory,
  [SET_ADJUST_OPTIONS]: setAdjustOptions,
  [SET_AI_IMAGE_EXTENDER_OPTIONS]: setAIImageExtenderOptions,
  [SET_AI_UPSCALER_OPTIONS]: setAIUpscalerOptions,
  [SET_AI_RETOUCH_OPTIONS]: setAIRetouchOptions,
  [SET_BACKGROUND_OPTIONS]: setBackgroundOptions,
  [SET_CANVAS_SIZE]: setCanvasSize,
  [SET_CROP]: setCrop,
  [SET_IMAGE_DIMENSIONS]: setImageDimensionsAction,
  [SET_IMAGE_URL]: setImageUrlAction,
  [SET_ORIGINAL_IMAGE_URL]: setOriginalImageUrlAction,
  [SET_RESIZE_OPTIONS]: setResizeOptions,
  [SET_ROTATION]: setRotation,
  [SET_TOOL]: setToolValue,
  [SET_ZOOM]: setZoomValue,
  [UNDO]: undo,
};

export default actions;

export type Action =
  | CommitChangeAction
  | DiscardChangeAction
  | GenerateImageKitUrlAction
  | RedoAction
  | ResetHistoryAction
  | SetAdjustOptionsAction
  | SetAIImageExtenderOptionsAction
  | SetAIUpscalerOptionsAction
  | SetAIRetouchOptionsAction
  | SetBackgroundOptionsAction
  | SetCanvasSizeAction
  | SetCropAction
  | SetImageDimensionsAction
  | SetImageUrlAction
  | SetOriginalImageUrlAction
  | SetResizeOptions
  | SetRotationAction
  | SetToolAction
  | SetZoomAction
  | UndoAction;

export {
  COMMIT_CHANGE,
  DISCARD_CHANGE,
  GENERATE_IMAGEKIT_URL,
  REDO,
  RESET_HISTORY,
  SET_ADJUST_OPTIONS,
  SET_AI_IMAGE_EXTENDER_OPTIONS,
  SET_AI_RETOUCH_OPTIONS,
  SET_AI_UPSCALER_OPTIONS,
  SET_BACKGROUND_OPTIONS,
  SET_CANVAS_SIZE,
  SET_CROP,
  SET_IMAGE_URL,
  SET_ORIGINAL_IMAGE_URL,
  SET_RESIZE_OPTIONS,
  SET_ROTATION,
  SET_TOOL,
  SET_ZOOM,
  UNDO,
};
