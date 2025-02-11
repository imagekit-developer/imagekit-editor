import {ActionFn} from "../context";
import {Tools} from "../utils/constants";

export const SET_AI_UPSCALER_OPTIONS = "SET_AI_UPSCALER_OPTIONS";

export interface SetAIUpscalerOptionsAction {
  type: typeof SET_AI_UPSCALER_OPTIONS;
  payload: {
    upscalingFactor?: string;
  };
}

const setAIUpscalerOptions: ActionFn<SetAIUpscalerOptionsAction> = (state, {payload}) => {
  const oldOptions = state.tool.options[Tools.AI_UPSCALER];

  const newOptions: {
    upscalingFactor?: string;
    originalImageDimensions?: {
      width: number;
      height: number;
    };
    scaledImageDimensions?: {
      width: number;
      height: number;
    };
  } = {
    ...oldOptions,
    ...payload,
  };

  if (!oldOptions.upscalingFactor) {
    newOptions.originalImageDimensions = {
      width: state.imageDimensions?.width ?? 0,
      height: state.imageDimensions?.height ?? 0,
    };
  }

  const factor = Math.min(Math.max(Number(newOptions.upscalingFactor) || 1, 1), 4);

  newOptions.scaledImageDimensions = {
    width: Math.ceil(factor * (newOptions.originalImageDimensions?.width ?? 0)),
    height: Math.ceil(factor * (newOptions.originalImageDimensions?.height ?? 0)),
  };

  return {
    ...state,
    tool: {
      ...state.tool,
      options: {
        ...state.tool.options,
        [Tools.AI_UPSCALER]: newOptions,
      },
    },
  };
};

export default setAIUpscalerOptions;
