import {ActionFn} from "../context";
import commitChange, {COMMIT_CHANGE, CommitChangeAction} from "./commitChange";
import discardChange, {DISCARD_CHANGE, DiscardChangeAction} from "./discardChange";
import generateImageKitUrlAction, {GENERATE_IMAGEKIT_URL, GenerateImageKitUrlAction} from "./generateImageKitUrl";
import redo, {REDO, RedoAction} from "./redo";
import resetHistory, {RESET_HISTORY, ResetHistoryAction} from "./resetHistory";
import setAdjustOptions, {SET_ADJUST_OPTIONS, SetAdjustOptionsAction} from "./setAdjustOptions";
import setAIImageExtenderOptions, {
  SET_AI_IMAGE_EXTENDER_OPTIONS,
  SetAIImageExtenderOptionsAction,
} from "./setAIImageExtenderOptions";
import setAIRetouchOptions, {SET_AI_RETOUCH_OPTIONS, SetAIRetouchOptionsAction} from "./setAIRetouchOptions";
import setAIUpscalerOptions, {SET_AI_UPSCALER_OPTIONS, SetAIUpscalerOptionsAction} from "./setAIUpscalerOptions";
import setBackgroundOptions, {SET_BACKGROUND_OPTIONS, SetBackgroundOptionsAction} from "./setBackgroundOptions";
import setCanvasSize, {SET_CANVAS_SIZE, SetCanvasSizeAction} from "./setCanvasSize";
import setCrop, {SET_CROP, SetCropAction} from "./setCrop";
import setImageDimensionsAction, {SET_IMAGE_DIMENSIONS, SetImageDimensionsAction} from "./setImageDimensions";
import setImageLoadingAction, {SET_IMAGE_LOADING, SetImageLoadingAction} from "./setImageLoading";
import setImageUrlAction, {SET_IMAGE_URL, SetImageUrlAction} from "./setImageUrl";
import setOriginalImageUrlAction, {SET_ORIGINAL_IMAGE_URL, SetOriginalImageUrlAction} from "./setOriginalImageUrl";
import setResizeOptions, {SET_RESIZE_OPTIONS, SetResizeOptions} from "./setResizeOptions";
import setRotation, {SET_ROTATION, SetRotationAction} from "./setRotation";
import setToolValue, {SET_TOOL, SetToolAction} from "./setTool";
import setZoomValue, {SET_ZOOM, SetZoomAction} from "./setZoomValue";
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
  [SET_IMAGE_LOADING]: setImageLoadingAction,
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
  | SetImageLoadingAction
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
  SET_IMAGE_LOADING,
  SET_IMAGE_URL,
  SET_ORIGINAL_IMAGE_URL,
  SET_RESIZE_OPTIONS,
  SET_ROTATION,
  SET_TOOL,
  SET_ZOOM,
  UNDO,
};
