import {ActionFn} from "../context";
import {ResizeMode, ScaleMode, Tools} from "../utils/constants";

export const SET_RESIZE_OPTIONS = "SET_RESIZE_OPTIONS";

export interface SetResizeOptions {
  type: typeof SET_RESIZE_OPTIONS;
  payload: {
    mode?: ResizeMode;
    height?: number;
    width?: number;
    percentage?: number;
    maintainAspectRatio?: boolean;
    scale?: ScaleMode;
    backgroundColor?: string;
  };
}

const setResizeOptions: ActionFn<SetResizeOptions> = (state, {payload}) => {
  const newOptions = {
    ...state.tool.options[Tools.RESIZE],
    ...payload,
  };

  if (newOptions.mode === ResizeMode.PERCENTAGE && payload.width && payload.height) {
    if (!state.imageDimensions?.width) {
      throw new Error("Image dimensions are required for percentage calculations");
    }
    const percentage = Math.round((payload.width / state.imageDimensions?.width!) * 100) / 100;
    newOptions.percentage = percentage;
    newOptions.width = undefined;
    newOptions.height = undefined;
  }

  return {
    ...state,
    tool: {
      ...state.tool,
      options: {
        ...state.tool.options,
        [Tools.RESIZE]: newOptions,
      },
    },
  };
};

export default setResizeOptions;
