import {ActionFn} from "../context";
import {Tools} from "../utils/constants";

export const SET_BACKGROUND_OPTIONS = "SET_BACKGROUND_OPTIONS";

export interface SetBackgroundOptionsAction {
  type: typeof SET_BACKGROUND_OPTIONS;
  payload: {
    removeBackground?: boolean;
    solidColor?: string;
    aiPrompt?: string;
    shadow?: {
      enabled?: boolean;
      azimuth?: number;
      elevation?: number;
      saturation?: number;
    };
  };
}

const setBackgroundOptions: ActionFn<SetBackgroundOptionsAction> = (state, {payload}) => {
  const oldOptions = state.tool.options[Tools.BACKGROUND];

  const newOptions = {
    ...oldOptions,
    ...payload,
    shadow: {
      ...oldOptions.shadow,
      ...payload.shadow,
    },
  };

  return {
    ...state,
    tool: {
      ...state.tool,
      options: {
        ...state.tool.options,
        [Tools.BACKGROUND]: newOptions,
      },
    },
  };
};

export default setBackgroundOptions;
