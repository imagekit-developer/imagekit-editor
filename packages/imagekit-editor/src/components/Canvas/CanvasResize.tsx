import {Canvas as FabricCanvas, FabricImage, Rect} from "fabric";
import {useEffect} from "react";
import {SET_CANVAS_SIZE} from "../../actions";
import {useEditorContext} from "../../context";
import {useDebouncedCallback} from "../../hooks/useDebouncedCallback";
import useResizeObserver from "../../hooks/useResizeObserver";

interface Props {
  canvasContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  loadingOverlayRef: React.MutableRefObject<Rect | null>;
  cropRef: React.MutableRefObject<Rect | null>;
  cropOverlayRef: React.MutableRefObject<Rect | null>;
  dispatch: ReturnType<typeof useEditorContext>[1];
}

export const CanvasResize = ({
  fabricRef,
  imageRef,
  loadingOverlayRef,
  cropRef,
  cropOverlayRef,
  dispatch,
  canvasContainerRef,
}: Props) => {
  const [observeResize] = useResizeObserver();

  const setCanvasSize = useDebouncedCallback(
    ({width: containerWidth, height: containerHeight}: {width: number; height: number}) => {
      if (fabricRef.current) {
        const diff = containerWidth - fabricRef.current.width;
        fabricRef.current.setDimensions({
          width: containerWidth,
          height: containerHeight,
        });

        fabricRef.current.viewportTransform[4] += diff / 4;

        fabricRef.current.calcOffset();
        fabricRef.current.renderAll();

        if (imageRef.current) {
          fabricRef.current.centerObject(imageRef.current);
        }

        if (cropRef.current) {
          fabricRef.current.centerObject(cropRef.current);
        }

        if (cropOverlayRef.current) {
          fabricRef.current.centerObject(cropOverlayRef.current);
        }

        if (loadingOverlayRef.current) {
          fabricRef.current.centerObject(loadingOverlayRef.current);
        }

        dispatch({
          type: SET_CANVAS_SIZE,
          payload: {
            width: containerWidth,
            height: containerHeight,
          },
        });
      }
    },
    5,
  );

  useEffect(() => {
    if (canvasContainerRef.current) {
      observeResize(canvasContainerRef.current, setCanvasSize);
    }
  }, []);

  return <></>;
};
