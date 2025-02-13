import {ActionFn} from "../context";
import {DEFAULT_TOOLS_STATE} from "../utils/constants";

export const RESET_HISTORY = "RESET_HISTORY";

export interface ResetHistoryAction {
  type: typeof RESET_HISTORY;
}

const resetHistory: ActionFn<ResetHistoryAction> = (state, _data) => {
  return {
    ...state,
    imageUrl: state.originalImageUrl,
    tool: {
      value: undefined,
      options: structuredClone(DEFAULT_TOOLS_STATE),
    },
    history: {
      head: 0,
      stack: [structuredClone(DEFAULT_TOOLS_STATE)],
    },
  };
};

export default resetHistory;
