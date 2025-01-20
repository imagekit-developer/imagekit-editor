import {ActionFn} from "../context";
import {Tools} from "../utils/constants";

export const SET_TOOL = "SET_TOOL";

export interface SetToolAction {
  type: typeof SET_TOOL;
  payload?: Tools;
}

const setToolValue: ActionFn<SetToolAction> = (state, payload) => {
  return {
    ...state,
    tool: {
      ...state.tool,
      value: payload.payload,
    },
  };
};

export default setToolValue;
