import {ActionFn} from "../context";

export const SET_IMAGE_LOADING = "SET_IMAGE_LOADING";

export interface SetImageLoadingAction {
  type: typeof SET_IMAGE_LOADING;
  payload: boolean;
}

const setImageLoadingAction: ActionFn<SetImageLoadingAction> = (state, data) => {
  return {
    ...state,
    isImageLoading: data.payload,
  };
};

export default setImageLoadingAction;
