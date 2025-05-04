import {Box, useToast} from "@chakra-ui/react";
import {
  Canvas as FabricCanvas,
  FabricImage,
  Group,
  ModifiedEvent,
  Point as FabricPoint,
  Rect,
  TPointerEvent,
} from "fabric";
import {motion} from "framer-motion";
import {useCallback, useEffect, useRef, useState} from "react";
import {SET_CANVAS_SIZE, SET_ZOOM} from "../../actions";
import {SET_IMAGE_DIMENSIONS} from "../../actions/setImageDimensions";
import {useEditorContext} from "../../context";
import {DEFAULT_ZOOM_LEVEL, Tools} from "../../utils/constants";
import {CanvasResize} from "./CanvasResize";
import {
  addLoadingOverlay,
  fetchImageUntilAvailable,
  handleCropmodeChange,
  handleResizeChange,
  handleToolStateClear,
  initializeAIImageExtender,
  initializeAIRetouch,
  initializeCrop,
  initializeFabric,
  initializeResize,
  removeLoadingOverlay,
} from "./lib";

const ZOOM_DELTA_TO_SCALE_CONVERT_FACTOR = 0.0004167;

export const Canvas = () => {
  const [isCanvasInitialized, setIsCanvasInitialized] = useState<boolean>(false);

  const toolRef = useRef<Tools>();
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const imageRef = useRef<FabricImage | null>(null);
  const isImageLoading = useRef<boolean>(false);
  const loadingOverlayRef = useRef<Group | null>(null);

  const cropRef = useRef<Rect | null>(null);
  const cropOverlayRef = useRef<Rect | null>(null);

  const imageDimensionsTextRef = useRef<Group | null>(null);
  const resizeBackgroundRef = useRef<Rect | null>(null);

  const aiImageExtenderRef = useRef<Rect | null>(null);

  const resizeEventHandlerRef = useRef<((e: ModifiedEvent<TPointerEvent>) => void) | undefined>(undefined);

  const [{zoomLevel, tool, canvas, imageUrl, originalImageUrl}, dispatch] = useEditorContext();

  const toast = useToast();

  const loadImage = useCallback(
    async (_imageUrl: string = imageUrl) => {
      if (!fabricRef.current) {
        return;
      }

      if (isImageLoading.current) {
        return;
      }

      addLoadingOverlay(fabricRef, imageRef, loadingOverlayRef);

      isImageLoading.current = true;

      try {
        const blob = await fetchImageUntilAvailable(_imageUrl, 3000);
        const objectUrl = URL.createObjectURL(blob);

        if (!imageRef.current) {
          const image = await FabricImage.fromURL(
            objectUrl,
            {},
            {
              id: "image",
              lockScalingFlip: true,
              opacity: 1,
            },
          );
          fabricRef.current?.add(image);

          // Hide image's own scaling controls. We'll handle via background rectangle.
          image.setControlsVisibility({
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

          image.set({
            lockMovementX: true,
            lockMovementY: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
            hasControls: false,
            evented: false,
            selectable: false,
          });

          imageRef.current = image;
        } else {
          await imageRef.current.setSrc(objectUrl);
          imageRef.current.set({
            scaleX: 1,
            scaleY: 1,
          });
        }

        fabricRef.current?.renderAll();

        if (imageUrl === originalImageUrl) {
          fabricRef.current.originalImageDimensions = {
            width: imageRef.current.width,
            height: imageRef.current.height,
          };

          fabricRef.current.centerObject(imageRef.current);

          const initialZoomLevel = Math.min(
            ((fabricRef.current?.height ?? 0) - 48) / imageRef.current.height,
            ((fabricRef.current?.width ?? 0) - 48) / imageRef.current.width,
          );

          dispatch({
            type: SET_ZOOM,
            payload: {
              value: initialZoomLevel,
              x: fabricRef.current?.width / 2,
              y: fabricRef.current?.height / 2,
            },
          });
        }

        dispatch({
          type: SET_IMAGE_DIMENSIONS,
          payload: {
            x: imageRef.current.getX(),
            y: imageRef.current.getY(),
            width: imageRef.current.width,
            height: imageRef.current.height,
          },
        });
      } catch (error) {
        toast({
          position: "top-right",
          title: "There was a problem in applying transformation to the image",
          status: "error",
          duration: 3000,
          isClosable: true,
          description: (error as Error).message,
        });

        console.log("error while applying tool", toolRef.current);
      }

      isImageLoading.current = false;
      removeLoadingOverlay(fabricRef, loadingOverlayRef);

      fabricRef.current.renderAll();
    },
    [imageUrl],
  );

  useEffect(() => {
    if (isCanvasInitialized) {
      loadImage(imageUrl);
    }
  }, [imageUrl, isCanvasInitialized]);

  useEffect(() => {
    const fabricCanvas = initializeFabric({
      canvasContainerRef,
      fabricRef,
      canvasRef,
    });

    fabricCanvas.on("mouse:wheel", (event) => {
      if (isImageLoading.current) {
        return;
      }

      const delta = event.e.deltaY;
      let zoom = fabricRef.current?.getZoom() || DEFAULT_ZOOM_LEVEL;

      dispatch({
        type: SET_ZOOM,
        payload: {
          value: zoom + delta * ZOOM_DELTA_TO_SCALE_CONVERT_FACTOR,
          x: event.e.offsetX,
          y: event.e.offsetY,
        },
      });
    });

    if (canvasRef.current?.width && canvasRef.current?.height) {
      dispatch({
        type: SET_CANVAS_SIZE,
        payload: {
          width: canvasContainerRef.current!.clientWidth,
          height: canvasContainerRef.current!.clientHeight,
        },
      });
    }

    setIsCanvasInitialized(true);

    return () => {
      fabricCanvas.dispose();
    };
  }, [canvasRef]);

  useEffect(() => {
    if (fabricRef.current && imageRef.current) {
      if (zoomLevel.x && zoomLevel.y) {
        fabricRef.current.zoomToPoint(new FabricPoint({x: zoomLevel.x, y: zoomLevel.y}), zoomLevel.value);
      } else {
        fabricRef.current.setZoom(zoomLevel.value);
      }
    }
  }, [zoomLevel.value, zoomLevel.x, zoomLevel.y]);

  useEffect(() => {
    handleToolStateClear({
      fabricRef,
      imageRef,
      loadImage,
      imageUrl,
      tool,
      cropRef,
      cropOverlayRef,
      imageDimensionsTextRef,
      resizeEventHandlerRef,
      resizeBackgroundRef,
      aiImageExtenderRef,
    });
  }, [tool.value]);

  useEffect(() => {
    toolRef.current = tool.value;

    if (!fabricRef.current || !imageRef.current || !tool.value) return;

    if (tool.value === Tools.CROP) {
      initializeCrop({imageRef, tool, cropRef, cropOverlayRef, loadImage, originalImageUrl, fabricRef, dispatch});
    }

    if (tool.value === Tools.AI_IMAGE_EXTENDER) {
      initializeAIImageExtender({fabricRef, imageRef, aiImageExtenderRef, tool});
    }

    if (tool.value === Tools.RESIZE) {
      initializeResize({
        imageRef,
        tool,
        fabricRef,
        dispatch,
        resizeEventHandlerRef,
        imageDimensionsTextRef,
        resizeBackgroundRef,
      });
    }

    if (tool.value === Tools.AI_RETOUCH) {
      initializeAIRetouch({
        fabricRef,
        imageRef,
      });
    }

    fabricRef.current.renderAll();
  }, [tool.value, imageUrl, originalImageUrl]);

  useEffect(() => {
    if (
      !fabricRef.current ||
      !imageRef.current ||
      tool.value !== Tools.CROP ||
      !cropRef.current ||
      !cropOverlayRef.current
    ) {
      return;
    }
    handleCropmodeChange({
      fabricRef,
      imageRef,
      cropRef,
      tool,
    });

    fabricRef.current.renderAll();
  }, [tool.options[Tools.CROP].mode, tool.options[Tools.CROP].ratio]);

  useEffect(() => {
    if (!fabricRef.current || !imageRef.current || tool.value !== Tools.RESIZE) return;

    handleResizeChange({
      fabricRef,
      imageRef,
      tool,
      imageDimensionsTextRef,
      resizeBackgroundRef,
      resizeEventHandlerRef,
      dispatch,
    });

    fabricRef.current.renderAll();
  }, [
    zoomLevel.value,
    tool.options[Tools.RESIZE].mode,
    tool.options[Tools.RESIZE].height,
    tool.options[Tools.RESIZE].width,
    tool.options[Tools.RESIZE].percentage,
    tool.options[Tools.RESIZE].maintainAspectRatio,
    tool.options[Tools.RESIZE].scale,
    tool.options[Tools.RESIZE].backgroundColor,
  ]);

  return (
    <>
      <Box
        as={motion.div}
        ref={canvasContainerRef}
        h="full"
        flex="1"
        backgroundColor="cultured"
        backgroundImage="radial-gradient(rgb(214, 217, 220) 1px, transparent 1px)"
        backgroundSize="20px 20px"
        animate={tool.value ? "visible" : "hidden"}
        variants={{
          hidden: {width: "100%"},
          visible: {width: "calc(100% - 362px)"},
        }}
      >
        <canvas ref={canvasRef} />
        <CanvasResize canvasContainerRef={canvasContainerRef} fabricRef={fabricRef} />
      </Box>
    </>
  );
};
