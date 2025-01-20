import {Canvas as FabricCanvas, FabricImage} from "fabric";
import {SET_ZOOM} from "../../../../actions";
import {useEditorContext} from "../../../../context";

interface InitAIImageExtenderProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  dispatch: ReturnType<typeof useEditorContext>[1];
}

export const initializeAIImageExtender = ({fabricRef, imageRef, dispatch}: InitAIImageExtenderProps) => {
  if (!imageRef.current || !fabricRef.current) return;

  const initialZoomLevel = Math.min(
    (fabricRef.current.height - 48) / imageRef.current.width,
    (fabricRef.current.width - 48) / imageRef.current.height,
  );

  dispatch({
    type: SET_ZOOM,
    payload: {
      value: initialZoomLevel,
      x: fabricRef.current.width / 2,
      y: fabricRef.current.height / 2,
      isAbsoluteZoom: true,
    },
  });

  fabricRef.current.centerObject(imageRef.current);
};
