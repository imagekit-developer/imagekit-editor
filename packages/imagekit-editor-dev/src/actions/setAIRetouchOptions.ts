import {ActionFn} from "../context";
import {Tools} from "../utils/constants";

export const SET_AI_RETOUCH_OPTIONS = "SET_AI_RETOUCH_OPTIONS";

export interface SetAIRetouchOptionsAction {
  type: typeof SET_AI_RETOUCH_OPTIONS;
  payload: {
    enabled?: boolean;
  };
}

const setAIRetouchOptions: ActionFn<SetAIRetouchOptionsAction> = (state, {payload}) => {
  const oldOptions = state.tool.options[Tools.AI_RETOUCH];

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
        [Tools.AI_RETOUCH]: newOptions,
      },
    },
  };
};

export default setAIRetouchOptions;
