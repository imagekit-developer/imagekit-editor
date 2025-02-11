import {Canvas as FabricCanvas, Point as FabricPoint} from "fabric";
import {useEffect} from "react";
import {SET_CANVAS_SIZE} from "../../actions";
import {useEditorContext} from "../../context";
import {useDebouncedCallback} from "../../hooks/useDebouncedCallback";
import useResizeObserver from "../../hooks/useResizeObserver";

interface Props {
  canvasContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
}

export const CanvasResize = ({fabricRef, canvasContainerRef}: Props) => {
  const [observeResize, unobserveElement] = useResizeObserver();

  const [, dispatch] = useEditorContext();

  const setCanvasSize = useDebouncedCallback(
    ({width: containerWidth, height: containerHeight}: {width: number; height: number}) => {
      if (fabricRef.current) {
        const oldCenter = new FabricPoint({
          x: fabricRef.current.width / 2,
          y: fabricRef.current.height / 2,
        });

        fabricRef.current.setWidth(containerWidth);
        fabricRef.current.setHeight(containerHeight);
        fabricRef.current.calcOffset();

        const newCenter = new FabricPoint({
          x: containerWidth / 2,
          y: containerHeight / 2,
        });

        const oldCenterCoords = oldCenter.transform(fabricRef.current.viewportTransform);

        const diff = newCenter.subtract(oldCenterCoords);

        fabricRef.current.viewportTransform[4] += diff.x;
        fabricRef.current.viewportTransform[5] += diff.y;

        fabricRef.current.renderAll();

        fabricRef.current.getObjects().forEach((object) => {
          object.setCoords();
        });

        dispatch({
          type: SET_CANVAS_SIZE,
          payload: {
            width: containerWidth,
            height: containerHeight,
          },
        });
      }
    },
    10,
  );

  useEffect(() => {
    if (canvasContainerRef.current) {
      observeResize(canvasContainerRef.current, setCanvasSize);
    }
    return () => {
      if (canvasContainerRef.current) {
        unobserveElement(canvasContainerRef.current, setCanvasSize);
      }
    };
  }, []);

  return <></>;
};
