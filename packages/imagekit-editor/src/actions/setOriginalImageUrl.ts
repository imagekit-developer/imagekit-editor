import {ActionFn} from "../context";

export const SET_ORIGINAL_IMAGE_URL = "SET_ORIGINAL_IMAGE_URL";

export interface SetOriginalImageUrlAction {
  type: typeof SET_ORIGINAL_IMAGE_URL;
  payload: string;
}

const setOriginalImageUrlAction: ActionFn<SetOriginalImageUrlAction> = (state, data) => {
  return {
    ...state,
    originalImageUrl: data.payload,
  };
};

export default setOriginalImageUrlAction;
