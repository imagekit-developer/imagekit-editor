import {Canvas as FabricCanvas, FabricImage, FabricText, Group, ModifiedEvent, Rect, TPointerEvent} from "fabric";
import {SET_RESIZE_OPTIONS} from "../../../../actions";
import {useEditorContext} from "../../../../context";
import {Tools} from "../../../../utils/constants";

interface InitResizeProps {
  imageRef: React.MutableRefObject<FabricImage | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  dispatch: ReturnType<typeof useEditorContext>[1];
  resizeEventHandlerRef: React.MutableRefObject<((e: ModifiedEvent<TPointerEvent>) => void) | null>;
  imageDimensionsTextRef: React.MutableRefObject<Group | null>;
  resizeBackgroundRef: React.MutableRefObject<Rect | null>;
}

export const initializeResize = ({
  imageRef,
  tool,
  fabricRef,
  dispatch,
  resizeEventHandlerRef,
  imageDimensionsTextRef,
  resizeBackgroundRef,
}: InitResizeProps) => {
  if (!imageRef.current || !fabricRef.current) return;

  let dimensionTextBg = new Rect({
    width: 78,
    height: 21,
    fill: "#2D3748",
    originX: "center",
    originY: "center",
    rx: 5,
    ry: 5,
  });

  let dimensionsText = new FabricText("", {
    fontFamily: "Arial",
    fontSize: 12,
    fill: "#fff",
    originX: "center",
    originY: "center",
  });

  imageDimensionsTextRef.current = new Group([dimensionTextBg, dimensionsText], {
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false,
    evented: false,
    selectable: false,
  });

  resizeBackgroundRef.current = new Rect({
    width: fabricRef.current.originalImageDimensions?.width,
    height: fabricRef.current.originalImageDimensions?.height,
    left: imageRef.current.left,
    top: imageRef.current.top,
    fill: "transparent",
    evented: false,
    selectable: false,
    hasControls: false,
  });

  fabricRef.current.add(imageDimensionsTextRef.current);

  fabricRef.current.add(resizeBackgroundRef.current);
  fabricRef.current.centerObject(resizeBackgroundRef.current);

  fabricRef.current.setActiveObject(imageRef.current);
  let width = imageRef.current.width;
  if (tool.options[Tools.RESIZE].width) {
    width = tool.options[Tools.RESIZE].width;
  }

  let height = imageRef.current.height;
  if (tool.options[Tools.RESIZE].height) {
    height = tool.options[Tools.RESIZE].height;
  }

  if (tool.options[Tools.RESIZE].maintainAspectRatio) {
    imageRef.current.setControlsVisibility({
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
    imageRef.current.setControlsVisibility({
      mt: true,
      mb: true,
      ml: true,
      mr: true,
      bl: true,
      br: true,
      tl: true,
      tr: true,
      mtr: true,
    });
  }

  imageRef.current.set({
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: true,
    hasControls: true,
    evented: true,
    selectable: true,
  });

  imageDimensionsTextRef.current?.getObjects()[1].set({
    text: `${Math.round(imageRef.current.width * imageRef.current.scaleX)} x ${Math.round(imageRef.current.height * imageRef.current.scaleY)}`,
  });

  imageDimensionsTextRef.current!.set({
    top: imageRef.current.top - 54 - 12 * (4 - fabricRef.current.getZoom()),
    scaleX: 4 - fabricRef.current.getZoom(),
    scaleY: 4 - fabricRef.current.getZoom(),
  });

  fabricRef.current?.centerObjectH(imageDimensionsTextRef.current!);

  fabricRef.current?.centerObject(imageRef.current);

  resizeEventHandlerRef.current = (e: ModifiedEvent<TPointerEvent>) => {
    const canvas = e.target.canvas!;
    const image = canvas.getObjects("image")[0] as FabricImage;

    if (!image) return;

    imageDimensionsTextRef.current?.getObjects()[1].set({
      text: `${Math.round(image.width * image.scaleX)} x ${Math.round(image.height * image.scaleY)}`,
    });

    imageDimensionsTextRef.current!.set({
      top: image.top - 54 - 12 * (4 - canvas.getZoom()),
      scaleX: 4 - canvas.getZoom(),
      scaleY: 4 - canvas.getZoom(),
    });

    fabricRef.current?.centerObjectH(imageDimensionsTextRef.current!);

    // fabricRef.current?.centerObject(image);

    const imageWidth = Math.round(image.width * image.scaleX);
    const imageHeight = Math.round(image.height * image.scaleY);

    dispatch({
      type: SET_RESIZE_OPTIONS,
      payload: {
        width: imageWidth,
        height: imageHeight,
      },
    });
  };

  imageRef.current.on("modified", resizeEventHandlerRef.current);
};

interface HandleResizeProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  imageDimensionsTextRef: React.MutableRefObject<Group | null>;
}

export const handleResizeChange = ({fabricRef, imageRef, tool, imageDimensionsTextRef}: HandleResizeProps) => {
  if (!imageRef.current || !fabricRef.current) return;

  let scaleX = imageRef.current.scaleX;
  let scaleY = imageRef.current.scaleY;

  if (tool.options[Tools.RESIZE].width || tool.options[Tools.RESIZE].height) {
    let width = imageRef.current.width;
    if (tool.options[Tools.RESIZE].width) {
      width = tool.options[Tools.RESIZE].width;
    }

    let height = imageRef.current.height;
    if (tool.options[Tools.RESIZE].height) {
      height = tool.options[Tools.RESIZE].height;
    }

    scaleX = width / imageRef.current.width;
    scaleY = height / imageRef.current.height;
  }

  if (tool.options[Tools.RESIZE].percentage) {
    scaleX = tool.options[Tools.RESIZE].percentage;
    scaleY = tool.options[Tools.RESIZE].percentage;
  }

  imageRef.current.set({
    scaleX,
    scaleY,
  });

  if (tool.options[Tools.RESIZE].maintainAspectRatio) {
    imageRef.current.setControlsVisibility({
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
    imageRef.current.centeredScaling = true;
    fabricRef.current.centerObject(imageRef.current);
  } else {
    imageRef.current.setControlsVisibility({
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
    imageRef.current.centeredScaling = false;
  }

  fabricRef.current.setActiveObject(imageRef.current);

  imageDimensionsTextRef.current?.getObjects()[1].set({
    text: `${Math.round(imageRef.current.width * imageRef.current.scaleX)} x ${Math.round(imageRef.current.height * imageRef.current.scaleY)}`,
  });

  imageDimensionsTextRef.current!.set({
    top: imageRef.current.top - 54 - 12 * (4 - fabricRef.current.getZoom()),
    scaleX: 4 - fabricRef.current.getZoom(),
    scaleY: 4 - fabricRef.current.getZoom(),
  });
};
