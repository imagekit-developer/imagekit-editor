import {ActionFn} from "../context";
import {Tools} from "../utils/constants";

export const SET_ADJUST_OPTIONS = "SET_ADJUST_OPTIONS";

export interface SetAdjustOptionsAction {
  type: typeof SET_ADJUST_OPTIONS;
  payload: {
    contrastStretch?: boolean;
    grayscale?: boolean;
    sharpness?: number;
    unsharpenMask?: number;
  };
}

const setAdjustOptions: ActionFn<SetAdjustOptionsAction> = (state, {payload}) => {
  const oldOptions = state.tool.options[Tools.ADJUST];

  const newOptions = {
    ...oldOptions,
    ...payload,
  };

  return {
    ...state,
    tool: {
      ...state.tool,
      options: {
        ...state.tool.options,
        [Tools.ADJUST]: newOptions,
      },
    },
  };
};

export default setAdjustOptions;
