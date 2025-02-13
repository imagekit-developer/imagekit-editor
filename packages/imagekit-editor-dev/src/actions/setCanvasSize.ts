import isEqual from "lodash.isequal";
import {ActionFn} from "../context";

export const SET_CANVAS_SIZE = "SET_CANVAS_SIZE";

export interface SetCanvasSizeAction {
  type: typeof SET_CANVAS_SIZE;
  payload: {
    height: number;
    width: number;
  };
}

const setCanvasSize: ActionFn<SetCanvasSizeAction> = (state, {payload}) => {
  if (payload.height <= 0 || payload.width <= 0) {
    throw new Error("Canvas dimensions must be positive numbers");
  }
  if (state.canvas.height === payload.height && state.canvas.width === payload.width) {
    return state;
  }

  const newOptions = {
    ...state.canvas,
    height: payload.height,
    width: payload.width,
  };

  if (isEqual(state.canvas, newOptions)) {
    return state;
  }

  return {
    ...state,
    canvas: {
      ...state.canvas,
      height: payload.height,
      width: payload.width,
    },
  };
};

export default setCanvasSize;
