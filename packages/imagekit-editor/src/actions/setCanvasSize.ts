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
  if (state.canvas.height === payload.height && state.canvas.width === payload.width) {
    return state;
  }

  const {initialHeight = payload.height, initialWidth = payload.width} = state.canvas;

  let scale = 1;

  const newOptions = {
    ...state.canvas,
    height: payload.height,
    width: payload.width,
    initialHeight,
    initialWidth,
    scale,
  };

  if (isEqual(state.canvas, newOptions)) {
    return state;
  }

  return {
    ...state,
    canvas: {
      ...state.canvas,
      height: payload.height,
      initialHeight,
      initialWidth,
      scale,
      width: payload.width,
    },
  };
};

export default setCanvasSize;
