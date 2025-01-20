import {ActionFn} from "../context";
import {Tools} from "../utils/constants";

export const SET_ROTATION = "SET_ROTATION";

export interface SetRotationAction {
  type: typeof SET_ROTATION;
  payload: number;
}

const setRotation: ActionFn<SetRotationAction> = (state, {payload}) => {
  return {
    ...state,
    tool: {
      ...state.tool,
      options: {
        ...state.tool.options,
        [Tools.CROP]: {
          ...state.tool.options[Tools.CROP],
          rotation: payload,
        },
      },
    },
  };
};

export default setRotation;
