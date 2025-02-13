import {ActionFn} from "../context";
import {CropMode, CropModeRatios, Tools} from "../utils/constants";
import toFloat from "../utils/toFloat";

export const SET_CROP = "SET_CROP";

export interface SetCropAction {
  type: typeof SET_CROP;
  payload: {
    mode?: CropMode;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
  };
}

const setCrop: ActionFn<SetCropAction> = (state, {payload}) => {
  const oldCrop = state.tool.options[Tools.CROP];

  const newCrop = {
    mode: payload.mode || oldCrop.mode || CropMode.FREEFORM,
    x: toFloat(payload.x) ?? oldCrop.x,
    y: toFloat(payload.y) ?? oldCrop.y,
    ratio: CropModeRatios[payload.mode || oldCrop.mode || CropMode.FREEFORM],
    width: toFloat(payload.width) ?? oldCrop.width,
    height: toFloat(payload.height) ?? oldCrop.height,
    rotation: oldCrop.rotation,
  };

  console.log({newCrop});

  return {
    ...state,
    tool: {
      ...state.tool,
      options: {
        ...state.tool.options,
        [Tools.CROP]: newCrop,
      },
    },
  };
};

export default setCrop;
