import {ActionFn} from "../context";

export const SET_ZOOM = "SET_ZOOM";

export interface SetZoomAction {
  type: typeof SET_ZOOM;
  payload: {
    value: number;
    x?: number | null;
    y?: number | null;
    isAbsoluteZoom?: boolean;
  };
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;

const setZoomValue: ActionFn<SetZoomAction> = (state, {payload}) => {
  const newZoom = Math.min(Math.max(payload.value, MIN_ZOOM), MAX_ZOOM);

  const newZoomData = {
    value: newZoom,
    // x: payload.x,
    // y: payload.y,
    x: state.canvas.width! / 2,
    y: state.canvas.height! / 2,
  };

  if (!payload.x && payload.x !== 0) {
    newZoomData.x = state.canvas.width! / 2;
  }

  if (!payload.y && payload.y !== 0) {
    newZoomData.y = state.canvas.height! / 2;
  }

  if (payload.isAbsoluteZoom) {
    newZoomData.x = state.canvas.width! / 2;
    newZoomData.y = state.canvas.height! / 2;
  }

  return {
    ...state,
    zoomLevel: {
      ...state.zoomLevel,
      ...newZoomData,
    },
  };
};

export default setZoomValue;
