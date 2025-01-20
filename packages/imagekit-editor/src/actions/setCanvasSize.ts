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

  // const initialScale = getDimensionsMinimalRatio(
  //   state.canvas.initialWidth ?? 0,
  //   state.canvas.initialHeight! ?? 0,
  //   payload.width,
  //   payload.height,
  // );

  // const imageResizedWidth = initialScale * (state.image?.width ?? 0);
  // const imageResizedHeight = initialScale * (state.image?.height ?? 0);

  let scale = 1;
  // if (initialWidth !== payload.width || initialHeight !== payload.height) {
  //   const widthScale = payload.width / imageResizedWidth;
  //   const heightScale = payload.height / imageResizedHeight;
  //   scale = Math.min(widthScale, heightScale);
  // }

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
