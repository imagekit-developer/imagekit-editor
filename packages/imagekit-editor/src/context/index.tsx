import ImageKit from "imagekit-javascript";
import React, {PropsWithChildren, Reducer, useEffect, useMemo, useReducer} from "react";
import actions, {Action, GENERATE_IMAGEKIT_URL, RESET_HISTORY, SET_IMAGE_URL, SET_ORIGINAL_IMAGE_URL} from "../actions";
import {EditorContextInitialState, EditorContextType} from "../interfaces/EditorContext";
import {DEFAULT_TOOLS_STATE, DEFAULT_ZOOM_LEVEL} from "../utils/constants";
import {createContext} from "../utils/context";

export type ActionFn<T extends Action> = (state: EditorContextType, payload: T) => EditorContextType;

const [Provider, useEditorContext] = createContext<[EditorContextType, React.Dispatch<Action>]>({
  name: "EditorContext",
  hookName: "useEditorContext",
  providerName: "EditorProvider",
});

interface Props {
  imageUrl: string;
  ikClient: ImageKit;
}

export const EditorProvider = (props: PropsWithChildren<Props>) => {
  const {children, imageUrl: originalImageUrl, ikClient} = props;

  const imageName = useMemo(() => {
    try {
      const url = new URL(originalImageUrl);
      return url.pathname.split("/").pop() ?? "";
    } catch (e) {
      return "Invalid URL Provided";
    }
  }, [originalImageUrl]);

  const [state, dispatch] = useReducer<Reducer<EditorContextType, Action>, EditorContextInitialState>(
    (state, action) => (actions[action.type] ? actions[action.type](state, action) : state),
    {
      client: ikClient,
      imageName,
      isImageLoading: false,
      imageUrl: originalImageUrl,
      originalImageUrl,
      canvas: {
        scale: 1,
      },
      zoomLevel: {
        defaultValues: [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 4],
        value: DEFAULT_ZOOM_LEVEL,
      },
      tool: {},
      history: {
        head: 0,
        stack: [structuredClone(DEFAULT_TOOLS_STATE)],
      },
    },
    (arg) => {
      return {
        ...arg,
        tool: {
          ...arg.tool,
          options: arg.history.stack[arg.history.head],
        },
      };
    },
  );

  useEffect(() => {
    dispatch({
      type: SET_ORIGINAL_IMAGE_URL,
      payload: originalImageUrl,
    });
    dispatch({
      type: SET_IMAGE_URL,
      payload: originalImageUrl,
    });
    dispatch({
      type: RESET_HISTORY,
    });
  }, [originalImageUrl]);

  useEffect(() => {
    dispatch({
      type: GENERATE_IMAGEKIT_URL,
    });
  }, [state.history]);

  return (
    <Provider
      value={[
        {
          ...state,
        },
        dispatch,
      ]}
    >
      {children}
    </Provider>
  );
};

export {useEditorContext};
