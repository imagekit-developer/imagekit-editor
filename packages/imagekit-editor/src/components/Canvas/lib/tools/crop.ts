import {Canvas as FabricCanvas, FabricImage, Rect} from "fabric";
import {SET_CROP, SET_ZOOM} from "../../../../actions";
import {useEditorContext} from "../../../../context";
import {CropMode, Tools} from "../../../../utils/constants";

interface InitCropProps {
  imageRef: React.MutableRefObject<FabricImage | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  cropRef: React.MutableRefObject<Rect | null>;
  cropOverlayRef: React.MutableRefObject<Rect | null>;
  loadImage: (imageUrl: string) => Promise<void>;
  originalImageUrl: string;
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  dispatch: ReturnType<typeof useEditorContext>[1];
}

export const initializeCrop = ({
  imageRef,
  tool,
  cropRef,
  cropOverlayRef,
  loadImage,
  originalImageUrl,
  fabricRef,
  dispatch,
}: InitCropProps) => {
  if (!imageRef.current || !fabricRef.current) return;

  let width = imageRef.current.width;
  if (tool.options[Tools.CROP].width) {
    width = tool.options[Tools.CROP].width;
  }

  let height = imageRef.current.height;
  if (tool.options[Tools.CROP].height) {
    height = tool.options[Tools.CROP].height;
  }

  let x = imageRef.current.left;
  if (tool.options[Tools.CROP].x) {
    x = imageRef.current.left + tool.options[Tools.CROP].x;
  }

  let y = imageRef.current.top;
  if (tool.options[Tools.CROP].y) {
    y = imageRef.current.top + tool.options[Tools.CROP].y;
  }

  if (!cropRef.current) {
    loadImage(originalImageUrl).then(() => {
      if (!imageRef.current || !fabricRef.current) return;

      const initialZoomLevel = Math.min(
        ((fabricRef.current?.height ?? 0) - 48) / imageRef.current.width,
        ((fabricRef.current?.width ?? 0) - 48) / imageRef.current.height,
      );

      dispatch({
        type: SET_ZOOM,
        payload: {
          value: initialZoomLevel,
          x: (fabricRef.current?.width ?? 0) / 2,
          y: (fabricRef.current?.height ?? 0) / 2,
          isAbsoluteZoom: true,
        },
      });

      cropRef.current = new Rect({
        id: "crop",
        fill: "rgba(255, 255, 255, 1)",
        stroke: "#0450D5",
        strokeWidth: 8,
        width: width,
        height: height,
        left: x,
        top: y,
        globalCompositeOperation: "overlay",

        lockScalingFlip: true,
      });

      cropOverlayRef.current = new Rect({
        id: "cropOverlay",
        fill: "rgba(0, 0, 0, 0.5)",
        selectable: false,
        evented: false,
        left: imageRef.current.left,
        top: imageRef.current.top,
        width: imageRef.current.width,
        height: imageRef.current.height,
      });

      cropRef.current.setControlsVisibility({
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

      fabricRef.current.setActiveObject(cropRef.current);

      fabricRef.current.add(cropOverlayRef.current);
      fabricRef.current.add(cropRef.current);

      fabricRef.current.centerObject(imageRef.current);
      fabricRef.current.centerObject(cropRef.current);
      cropRef.current.on("modified", (e) => {
        const width = Math.round(e.target.width * e.target.scaleX);
        const height = Math.round(e.target.height * e.target.scaleY);

        const x = Math.round(e.target.left - imageRef.current!.left);
        const y = Math.round(e.target.top - imageRef.current!.top);

        dispatch({
          type: SET_CROP,
          payload: {
            width,
            height,
            x,
            y,
          },
        });
      });

      cropRef.current.setCoords();
    });
  }
};

interface HandleCropmodeChangeProps {
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  imageRef: React.MutableRefObject<FabricImage | null>;
  tool: ReturnType<typeof useEditorContext>[0]["tool"];
  cropRef: React.MutableRefObject<Rect | null>;
}

export const handleCropmodeChange = ({fabricRef, imageRef, tool, cropRef}: HandleCropmodeChangeProps) => {
  if (!imageRef.current || !fabricRef.current || !cropRef.current) return;

  let width = imageRef.current.width;
  if (tool.options[Tools.CROP].width) {
    width = tool.options[Tools.CROP].width;
  }

  let height = imageRef.current.height;
  if (tool.options[Tools.CROP].height) {
    height = tool.options[Tools.CROP].height;
  }

  let x = imageRef.current.left;
  if (tool.options[Tools.CROP].x) {
    x = imageRef.current.left + tool.options[Tools.CROP].x;
  }

  let y = imageRef.current.top;
  if (tool.options[Tools.CROP].y) {
    y = imageRef.current.top + tool.options[Tools.CROP].y;
  }

  if (tool.options[Tools.CROP].mode !== CropMode.FREEFORM) {
    if (width > height) {
      height = width / tool.options[Tools.CROP].ratio!;
    } else {
      width = height * tool.options[Tools.CROP].ratio!;
    }

    if (width > imageRef.current.width) {
      width = imageRef.current.width;
      height = width / tool.options[Tools.CROP].ratio!;
    }

    if (height > imageRef.current.height) {
      height = imageRef.current.height;
      width = height * tool.options[Tools.CROP].ratio!;
    }

    cropRef.current.setControlsVisibility({
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
    cropRef.current.setControlsVisibility({
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

  console.log({width, height, x, y});

  cropRef.current.set({
    width,
    height,
    left: x,
    top: y,
  });

  cropRef.current.setCoords();
};
