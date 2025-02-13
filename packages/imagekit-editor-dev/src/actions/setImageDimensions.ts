import {ActionFn} from "../context";

export const SET_IMAGE_DIMENSIONS = "SET_IMAGE_DIMENSIONS";

export interface SetImageDimensionsAction {
  type: typeof SET_IMAGE_DIMENSIONS;
  payload: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const setImageDimensionsAction: ActionFn<SetImageDimensionsAction> = (state, data) => {
  return {
    ...state,
    imageDimensions: data.payload,
  };
};

export default setImageDimensionsAction;
