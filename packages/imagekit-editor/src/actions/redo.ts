import {ActionFn} from "../context";

export const REDO = "REDO";

export interface RedoAction {
  type: typeof REDO;
}

const redo: ActionFn<RedoAction> = (state, _data) => {
  const newHead = Math.min(state.history.head + 1, state.history.stack.length - 1);

  return {
    ...state,
    tool: {
      ...state.tool,
      options: state.history.stack[newHead],
    },
    history: {
      ...state.history,
      head: newHead,
    },
  };
};

export default redo;
