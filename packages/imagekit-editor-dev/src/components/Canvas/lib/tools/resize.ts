import {Canvas as FabricCanvas, FabricImage, FabricText, Group, ModifiedEvent, Rect, TPointerEvent} from "fabric";
import {SET_RESIZE_OPTIONS} from "../../../../actions";
import {useEditorContext} from "../../../../context";
import {ScaleMode, Tools} from "../../../../utils/constants";

interface InitResizeProps {
  imageRef: React.MutableRefObject<FabricImage | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  dispatch: ReturnType<typeof useEditorContext>[1];
  resizeEventHandlerRef: React.MutableRefObject<((e: ModifiedEvent<TPointerEvent>) => void) | undefined>;
  imageDimensionsTextRef: React.MutableRefObject<Group | null>;
  resizeBackgroundRef: React.MutableRefObject<Rect | null>;
}

/**
 * Updates the dimension text group (both background rect + text).
 */
function updateDimensionText(
  canvas: FabricCanvas,
  resizeBackground: Rect,
  imageDimensionsTextRef: React.MutableRefObject<Group | null>,
) {
  const dimensionTextGroup = imageDimensionsTextRef.current;
  if (!dimensionTextGroup) return;

  const [bgRect, textObj] = dimensionTextGroup.getObjects() as [Rect, FabricText];

  // Compute the new width/height for the background rect
  const bgWidth = resizeBackground.width * resizeBackground.scaleX;
  const bgHeight = resizeBackground.height * resizeBackground.scaleY;

  textObj.text = `${Math.round(bgWidth)} x ${Math.round(bgHeight)}`;
  // Force re-calc text bounding box
  textObj.initDimensions();

  // Now resize the background behind the text
  const paddingX = 16;
  const paddingY = 8;

  bgRect.set({
    width: textObj.width! + paddingX,
    height: textObj.height! + paddingY,
  });
  bgRect.setCoords();

  // Position the group near top center of the rect
  let left = resizeBackground.left + bgWidth / 2;
  let top = resizeBackground.top - 50;

  // Adjust scale so text isn't minuscule at high zoom
  const zoom = canvas.getZoom();
  // If zoom is big, then scale the text group down proportionally
  // If zoom is small, scale up
  const desiredScale = 1 / zoom;

  dimensionTextGroup.set({
    left,
    top,
    scaleX: desiredScale,
    scaleY: desiredScale,
  });
  dimensionTextGroup.setCoords();

  // Bring text group to front so it’s never hidden
  canvas.bringObjectToFront(dimensionTextGroup);

  canvas.renderAll();
}

/**
 * Setup the background rectangle, dimension text, etc.
 */
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

  const canvas = fabricRef.current;
  const image = imageRef.current;
  const {width: originalWidth, height: originalHeight} = canvas.originalImageDimensions ?? {
    width: image.width,
    height: image.height,
  };

  // The background rect behind the dimension text
  const dimensionTextBg = new Rect({
    fill: "#2D3748",
    originX: "center",
    originY: "center",
    rx: 5,
    ry: 5,
  });

  // The text object
  const dimensionsText = new FabricText("", {
    fontFamily: "Arial",
    fontSize: 12,
    fill: "#fff",
    originX: "center",
    originY: "center",
  });

  // Create the text group so we can position them together
  imageDimensionsTextRef.current = new Group([dimensionTextBg, dimensionsText], {
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false,
    evented: false,
    selectable: false,
    originX: "center",
    originY: "center",
  });

  // The main resize background rect that user drags
  resizeBackgroundRef.current = new Rect({
    id: "resize-background",
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

  // Add them in correct z-order
  canvas.add(resizeBackgroundRef.current);
  canvas.add(imageDimensionsTextRef.current);

  // Center the rect
  canvas.centerObject(resizeBackgroundRef.current);

  // If maintainAspectRatio is true, disable non-corner controls
  if (tool.options[Tools.RESIZE].maintainAspectRatio) {
    resizeBackgroundRef.current.setControlsVisibility({
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
    resizeBackgroundRef.current.setControlsVisibility({
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

  // Hide direct image resizing
  image.set({
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    hasControls: false,
    selectable: false,
  });

  const backgroundRectModifiedEventHandler = backgroundRectModified(
    resizeBackgroundRef,
    imageRef,
    tool,
    dispatch,
    fabricRef,
    imageDimensionsTextRef,
  );
  resizeBackgroundRef.current.on("modified", backgroundRectModifiedEventHandler);

  resizeEventHandlerRef.current = backgroundRectModifiedEventHandler;

  // initial scale
  applyScaleMode(
    canvas,
    image,
    resizeBackgroundRef.current,
    tool.options[Tools.RESIZE].scale,
    tool.options[Tools.RESIZE].maintainAspectRatio,
  );

  // initial dimension text
  updateDimensionText(canvas, resizeBackgroundRef.current, imageDimensionsTextRef);

  canvas.setActiveObject(resizeBackgroundRef.current);
  canvas.renderAll();
};

interface HandleResizeProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  imageDimensionsTextRef: React.MutableRefObject<Group | null>;
  resizeBackgroundRef: React.MutableRefObject<Rect | null>;
  resizeEventHandlerRef: React.MutableRefObject<((e: ModifiedEvent<TPointerEvent>) => void) | undefined>;
  dispatch: ReturnType<typeof useEditorContext>[1];
}

/**
 * Called whenever the sidebar changes the resize config
 */
export const handleResizeChange = ({
  fabricRef,
  imageRef,
  tool,
  imageDimensionsTextRef,
  resizeBackgroundRef,
  resizeEventHandlerRef,
  dispatch,
}: HandleResizeProps) => {
  if (!imageRef.current || !fabricRef.current || !resizeBackgroundRef.current) return;

  resizeEventHandlerRef.current && resizeBackgroundRef.current.off("modified", resizeEventHandlerRef.current);

  if (tool.options[Tools.RESIZE].maintainAspectRatio) {
    resizeBackgroundRef.current.setControlsVisibility({
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
    resizeBackgroundRef.current.setControlsVisibility({
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

  const backgroundRectModifiedEventHandler = backgroundRectModified(
    resizeBackgroundRef,
    imageRef,
    tool,
    dispatch,
    fabricRef,
    imageDimensionsTextRef,
  );

  resizeBackgroundRef.current.on("modified", backgroundRectModifiedEventHandler);
  resizeEventHandlerRef.current = backgroundRectModifiedEventHandler;

  const bgRect = resizeBackgroundRef.current;
  const canvas = fabricRef.current;

  const newW = tool.options[Tools.RESIZE].width || bgRect.width;
  const newH = tool.options[Tools.RESIZE].height || bgRect.height;

  bgRect.set({width: newW, height: newH});
  bgRect.setCoords();

  applyScaleMode(
    canvas,
    imageRef.current,
    bgRect,
    tool.options[Tools.RESIZE].scale,
    tool.options[Tools.RESIZE].maintainAspectRatio,
  );

  updateDimensionText(canvas, bgRect, imageDimensionsTextRef);

  canvas.renderAll();
};

const backgroundRectModified = (
  resizeBackgroundRef: React.MutableRefObject<Rect | null>,
  imageRef: React.MutableRefObject<FabricImage | null>,
  tool: ReturnType<typeof useEditorContext>[0]["tool"],
  dispatch: ReturnType<typeof useEditorContext>[1],
  fabricRef: React.MutableRefObject<FabricCanvas | null>,
  imageDimensionsTextRef: React.MutableRefObject<Group | null>,
) => {
  return () => {
    if (!resizeBackgroundRef.current || !imageRef.current || !fabricRef.current) return;

    const bgWidth = resizeBackgroundRef.current.width * resizeBackgroundRef.current.scaleX;
    const bgHeight = resizeBackgroundRef.current.height * resizeBackgroundRef.current.scaleY;

    // reset scale
    resizeBackgroundRef.current.scaleX = 1;
    resizeBackgroundRef.current.scaleY = 1;
    resizeBackgroundRef.current.width = bgWidth;
    resizeBackgroundRef.current.height = bgHeight;
    resizeBackgroundRef.current.setCoords();

    // update store with new dimensions
    dispatch({
      type: SET_RESIZE_OPTIONS,
      payload: {
        width: Math.round(bgWidth),
        height: Math.round(bgHeight),
      },
    });

    // re-apply scale mode logic
    applyScaleMode(
      fabricRef.current,
      imageRef.current,
      resizeBackgroundRef.current,
      tool.options[Tools.RESIZE].scale,
      tool.options[Tools.RESIZE].maintainAspectRatio,
    );

    updateDimensionText(fabricRef.current, resizeBackgroundRef.current, imageDimensionsTextRef);

    fabricRef.current.renderAll();
  };
};

/**
 * Applies scale logic to the main image
 */
function applyScaleMode(
  canvas: FabricCanvas,
  image: FabricImage,
  bgRect: Rect,
  scaleMode?: ScaleMode,
  maintainAspect?: boolean,
) {
  image.set({clipPath: undefined});

  const rectW = bgRect.width;
  const rectH = bgRect.height;
  const imgW = canvas.originalImageDimensions?.width ?? image.width;
  const imgH = canvas.originalImageDimensions?.height ?? image.height;

  switch (scaleMode) {
    case ScaleMode.STRETCH: {
      image.set({
        scaleX: rectW / imgW,
        scaleY: rectH / imgH,
      });
      centerImageInRect(image, bgRect);
      break;
    }
    case ScaleMode.FIT_SCREEN: {
      const scaleFit = Math.min(rectW / imgW, rectH / imgH);
      image.scale(scaleFit);
      centerImageInRect(image, bgRect);
      break;
    }
    case ScaleMode.FILL_SCREEN: {
      if (maintainAspect) {
        const scaleFill = Math.max(rectW / imgW, rectH / imgH);
        image.scale(scaleFill);
        centerImageInRect(image, bgRect);

        image.set({
          clipPath: new Rect({
            left: bgRect.left,
            top: bgRect.top,
            width: rectW,
            height: rectH,
            absolutePositioned: true,
          }),
        });
      } else {
        // fill ignoring aspect ratio => stretch + crop
        const scale = Math.max(rectW / imgW, rectH / imgH);
        image.scale(scale);
        centerImageInRect(image, bgRect);

        image.set({
          clipPath: new Rect({
            left: bgRect.left,
            top: bgRect.top,
            width: rectW,
            height: rectH,
            absolutePositioned: true,
          }),
        });
      }
      break;
    }
    default: {
      // default to Fit if no scale mode
      const scaleFit = Math.min(rectW / imgW, rectH / imgH);
      image.scale(scaleFit);
      centerImageInRect(image, bgRect);
      break;
    }
  }

  image.setCoords();
  canvas.renderAll();
}

function centerImageInRect(image: FabricImage, bgRect: Rect) {
  const rectBounds = bgRect.getBoundingRect();
  const imgBounds = image.getBoundingRect();

  const newLeft = rectBounds.left + rectBounds.width / 2 - imgBounds.width / 2;
  const newTop = rectBounds.top + rectBounds.height / 2 - imgBounds.height / 2;

  image.set({left: newLeft, top: newTop});
  image.setCoords();
}
