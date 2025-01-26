import {Canvas as FabricCanvas, FabricImage, Group, ModifiedEvent, Rect, TPointerEvent} from "fabric";
import {useEditorContext} from "../../../../context";
import {Tools} from "../../../../utils/constants";

export const handleToolStateClear = ({
  fabricRef,
  imageRef,
  loadImage,
  imageUrl,
  tool,
  cropRef,
  resizeEventHandlerRef,
  imageDimensionsTextRef,
  cropOverlayRef,
}: {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  loadImage: (imageUrl: string) => void;
  imageUrl: string;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  resizeEventHandlerRef: React.MutableRefObject<((e: ModifiedEvent<TPointerEvent>) => void) | null>;
  cropRef: React.MutableRefObject<Rect | null>;
  cropOverlayRef: React.MutableRefObject<Rect | null>;
  imageDimensionsTextRef: React.MutableRefObject<Group | null>;
}) => {
  if (!fabricRef.current || !imageRef.current) return;

  if (tool.value !== Tools.CROP) {
    typeof cropRef.current?.didCrop === "boolean" && !cropRef.current?.didCrop && loadImage(imageUrl);
    cropRef.current && fabricRef.current.remove(cropRef.current);
    cropOverlayRef.current && fabricRef.current.remove(cropOverlayRef.current);
    cropRef.current = null;
    cropOverlayRef.current = null;
  }

  if (tool.value !== Tools.RESIZE) {
    resizeEventHandlerRef.current && imageRef.current.off("modified", resizeEventHandlerRef.current);
    resizeEventHandlerRef.current = null;

    imageDimensionsTextRef.current && fabricRef.current.remove(imageDimensionsTextRef.current);
    imageDimensionsTextRef.current = null;

    imageRef.current.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      bl: false,
      br: false,
      tl: false,
      tr: false,
      mtr: false,
    });

    imageRef.current.set({
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hasControls: false,
      evented: false,
      selectable: false,
    });

    imageRef.current.set({
      scaleX: 1,
      scaleY: 1,
    });
  }
};

export * from "./ai-image-extender";
export * from "./crop";
export * from "./resize";
