import {Canvas as FabricCanvas, FabricImage, Rect} from "fabric";
import {useEditorContext} from "../../../../context";
import {Tools} from "../../../../utils/constants";

interface InitAIImageExtenderProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  aiImageExtenderRef: React.MutableRefObject<Rect | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
}

export const initializeAIImageExtender = ({
  fabricRef,
  imageRef,
  aiImageExtenderRef,
  tool,
}: InitAIImageExtenderProps) => {
  if (!imageRef.current || !fabricRef.current) return;

  const canvas = fabricRef.current;
  const image = imageRef.current;
  const {width: originalWidth, height: originalHeight} = canvas.originalImageDimensions ?? {
    width: image.width,
    height: image.height,
  };

  aiImageExtenderRef.current = new Rect({
    id: "ai-image-extender",
    width: tool.options[Tools.RESIZE].width ?? originalWidth,
    height: tool.options[Tools.RESIZE].height ?? originalHeight,
    left: image.left,
    top: image.top,
    fill: "rgba(255,255,255,0.1)",
    stroke: "#0450D5",
    strokeWidth: 1,
    hasControls: true,
    lockScalingFlip: true,
    selectable: true,
    evented: true,
    objectCaching: false,
  });

  canvas.add(aiImageExtenderRef.current);
  canvas.setActiveObject(aiImageExtenderRef.current);
};

interface HandleAIImageExtenderChangeProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  aiImageExtenderRef: React.MutableRefObject<Rect | null>;
}

export const handleAIImageExtenderChange = ({
  fabricRef,
  imageRef,
  tool,
  aiImageExtenderRef,
}: HandleAIImageExtenderChangeProps) => {
  if (!fabricRef.current || !imageRef.current || !aiImageExtenderRef.current) return;

  const canvas = fabricRef.current;
  const image = imageRef.current;

  const {width: originalWidth, height: originalHeight} = canvas.originalImageDimensions ?? {
    width: image.width,
    height: image.height,
  };

  aiImageExtenderRef.current.set({
    width: tool.options[Tools.RESIZE].width ?? originalWidth,
    height: tool.options[Tools.RESIZE].height ?? originalHeight,
    left: image.left,
    top: image.top,
  });

  const aspectRatio = tool.options[Tools.AI_IMAGE_EXTENDER].aspectRatio;

  if (aspectRatio) {
    aiImageExtenderRef.current.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      bl: true,
      br: true,
      tl: true,
      tr: true,
      mtr: false,
    });
  } else {
    aiImageExtenderRef.current.setControlsVisibility({
      mt: true,
      mb: true,
      ml: true,
      mr: true,
      bl: true,
      br: true,
      tl: true,
      tr: true,
      mtr: false,
    });
  }
};
