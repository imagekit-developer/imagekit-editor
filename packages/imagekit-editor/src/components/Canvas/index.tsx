import {Box} from "@chakra-ui/react";
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
import {useCallback, useEffect, useRef} from "react";
import {SET_ZOOM} from "../../actions";
import {SET_IMAGE_DIMENSIONS} from "../../actions/setImageDimensions";
import {useEditorContext} from "../../context";
import {DEFAULT_ZOOM_LEVEL, Tools} from "../../utils/constants";
import {CanvasResize} from "./CanvasResize";
import {
  addLoadingOverlay,
  handleCropmodeChange,
  handleResizeChange,
  handleToolStateClear,
  initializeAIImageExtender,
  initializeCrop,
  initializeFabric,
  initializeResize,
  removeLoadingOverlay,
} from "./lib";

const ZOOM_DELTA_TO_SCALE_CONVERT_FACTOR = 0.0004167;

export const Canvas = () => {
  const toolRef = useRef<Tools>();
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const imageRef = useRef<FabricImage | null>(null);
  const isImageLoading = useRef<boolean>(false);
  const loadingOverlayRef = useRef<Rect | null>(null);

  const cropRef = useRef<Rect | null>(null);
  const cropOverlayRef = useRef<Rect | null>(null);

  const imageDimensionsTextRef = useRef<Group | null>(null);

  const resizeEventHandlerRef = useRef<(e: ModifiedEvent<TPointerEvent>) => void | null>(null);

  const [{zoomLevel, tool, canvas, imageUrl, originalImageUrl}, dispatch] = useEditorContext();

  const loadImage = useCallback(
    async (_imageUrl: string = imageUrl) => {
      if (!fabricRef.current) {
        return;
      }
      isImageLoading.current = true;
      addLoadingOverlay(fabricRef, imageRef, loadingOverlayRef);

      if (imageRef.current?.getSrc() === _imageUrl) {
        isImageLoading.current = false;
        removeLoadingOverlay(fabricRef, loadingOverlayRef);
        return;
      }

      try {
        if (!imageRef.current) {
          const image = await FabricImage.fromURL(
            _imageUrl,
            {},
            {
              id: "image",
              lockScalingFlip: true,
            },
          );
          fabricRef.current?.add(image);

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
          await imageRef.current.setSrc(_imageUrl);
        }

        fabricRef.current?.centerObject(imageRef.current);
        fabricRef.current?.renderAll();

        const initialZoomLevel = Math.min(
          ((fabricRef.current?.height ?? 0) - 48) / imageRef.current.width,
          ((fabricRef.current?.width ?? 0) - 48) / imageRef.current.height,
        );

        if (imageUrl === originalImageUrl) {
          fabricRef.current.originalImageDimensions = {
            width: imageRef.current.width,
            height: imageRef.current.height,
          };
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

        dispatch({
          type: SET_ZOOM,
          payload: {
            value: initialZoomLevel,
            x: (fabricRef.current?.width ?? 0) / 2,
            y: (fabricRef.current?.height ?? 0) / 2,
          },
        });
      } catch (error) {
        console.log(error);
      }

      isImageLoading.current = false;
      removeLoadingOverlay(fabricRef, loadingOverlayRef);

      fabricRef.current.renderAll();
    },
    [imageUrl],
  );

  useEffect(() => {
    if (!isImageLoading.current) {
      loadImage(imageUrl);
    }
  }, [imageUrl]);

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

      // if (toolRef.current && [Tools.AI_IMAGE_EXTENDER].includes(toolRef.current)) {
      //   return;
      // }
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

    loadImage();

    return () => {
      fabricCanvas.dispose();
    };
  }, [canvasRef]);

  useEffect(() => {
    if (fabricRef.current && imageRef.current) {
      if (zoomLevel.x && zoomLevel.y) {
        fabricRef.current.zoomToPoint(new FabricPoint({x: zoomLevel.x, y: zoomLevel.y}), zoomLevel.value);

        if (zoomLevel.x === canvas.width! / 2 && zoomLevel.y === canvas.height! / 2) {
          fabricRef.current.centerObject(imageRef.current);
        }
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
    });
  }, [tool.value]);

  useEffect(() => {
    toolRef.current = tool.value;

    if (!fabricRef.current || !imageRef.current || !tool.value) return;

    if (tool.value === Tools.CROP) {
      initializeCrop({imageRef, tool, cropRef, cropOverlayRef, loadImage, originalImageUrl, fabricRef, dispatch});
    }

    if (tool.value === Tools.AI_IMAGE_EXTENDER) {
      initializeAIImageExtender({fabricRef, imageRef, dispatch});
    }

    if (tool.value === Tools.RESIZE) {
      initializeResize({imageRef, tool, fabricRef, dispatch, resizeEventHandlerRef, imageDimensionsTextRef});
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
    )
      return;
    handleCropmodeChange({
      fabricRef,
      imageRef,
      cropRef,
      // cropOverlayRef,
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
    });

    fabricRef.current.renderAll();
  }, [tool.options[Tools.RESIZE]]);

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
        <CanvasResize
          canvasContainerRef={canvasContainerRef}
          fabricRef={fabricRef}
          imageRef={imageRef}
          loadingOverlayRef={loadingOverlayRef}
          cropRef={cropRef}
          dispatch={dispatch}
          cropOverlayRef={cropOverlayRef}
        />
      </Box>
    </>
  );
};
