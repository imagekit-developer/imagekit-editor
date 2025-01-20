import isEqual from "lodash.isequal";
import merge from "lodash.merge";
import {ActionFn} from "../context";
import {DEFAULT_TOOLS_STATE} from "../utils/constants";

export const COMMIT_CHANGE = "COMMIT_CHANGE";

export interface CommitChangeAction {
  type: typeof COMMIT_CHANGE;
}

const commitChange: ActionFn<CommitChangeAction> = (state, _data) => {
  const toolState = structuredClone(DEFAULT_TOOLS_STATE);

  merge(toolState, state.history.stack[state.history.head], state.tool.options);

  // If the current tool options are the same as the last item in the history stack, do not add commit
  if (isEqual(toolState, state.history.stack[state.history.head])) {
    return {
      ...state,
      tool: {
        value: undefined,
        options: toolState,
      },
    };
  }

  return {
    ...state,
    tool: {
      value: undefined,
      options: toolState,
    },
    history: {
      head: state.history.head + 1,
      stack: [...state.history.stack.slice(0, state.history.head + 1), toolState],
    },
  };
};

export default commitChange;
