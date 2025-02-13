import {ActionFn} from "../context";
import {DEFAULT_TOOLS_STATE} from "../utils/constants";

export const DISCARD_CHANGE = "DISCARD_CHANGE";

export interface DiscardChangeAction {
  type: typeof DISCARD_CHANGE;
}

const discardChange: ActionFn<DiscardChangeAction> = (state, _data) => {
  return {
    ...state,
    tool: {
      value: undefined,
      options: structuredClone(DEFAULT_TOOLS_STATE),
    },
  };
};

export default discardChange;
