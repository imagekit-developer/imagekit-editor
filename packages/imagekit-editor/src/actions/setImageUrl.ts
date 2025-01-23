import {ActionFn} from "../context";

export const SET_IMAGE_URL = "SET_IMAGE_URL";

export interface SetImageUrlAction {
  type: typeof SET_IMAGE_URL;
  payload: string;
}

const setImageUrlAction: ActionFn<SetImageUrlAction> = (state, data) => {
  return {
    ...state,
    imageUrl: data.payload,
  };
};

export default setImageUrlAction;
