import {ActionFn} from "../context";
import {Tools} from "../utils/constants";

export const SET_AI_IMAGE_EXTENDER_OPTIONS = "SET_AI_IMAGE_EXTENDER_OPTIONS";

export interface SetAIImageExtenderOptionsAction {
  type: typeof SET_AI_IMAGE_EXTENDER_OPTIONS;
  payload: {
    sizeCategory?: string;
    aspectRatio?: string;
    customSize?: {
      width?: number;
      height?: number;
    };
  };
}

const setAIImageExtenderOptions: ActionFn<SetAIImageExtenderOptionsAction> = (state, {payload}) => {
  const oldOptions = state.tool.options[Tools.AI_IMAGE_EXTENDER];

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
        [Tools.AI_IMAGE_EXTENDER]: newOptions,
      },
    },
  };
};

export default setAIImageExtenderOptions;
