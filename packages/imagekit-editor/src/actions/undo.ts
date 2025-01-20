import {ActionFn} from "../context";

export const UNDO = "UNDO";

export interface UndoAction {
  type: typeof UNDO;
}

const undo: ActionFn<UndoAction> = (state, _data) => {
  const newHead = Math.max(0, state.history.head - 1);

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
    imageStatus: "loading",
  };
};

export default undo;
