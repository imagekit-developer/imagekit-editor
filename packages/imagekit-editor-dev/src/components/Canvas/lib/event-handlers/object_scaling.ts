import {BasicTransformEvent, FabricImage, FabricObject, TPointerEvent} from "fabric";

export const objectScalingEventHandler = (
  e: BasicTransformEvent<TPointerEvent> & {
    target: FabricObject;
  },
) => {
  const canvas = e.target.canvas!;

  if (e.target.id === "crop") {
    const crop = e.target as FabricObject;
    const image = canvas.getObjects("image")[0] as FabricImage;

    if (!image) return;

    const cropWidth = crop.width * crop.scaleX;
    const cropHeight = crop.height * crop.scaleY;

    let left = crop.left;
    let top = crop.top;

    if (left < image.left) {
      crop.set({left: image.left});
    }

    if (top < image.top) {
      crop.set({top: image.top});
    }

    if (crop.scaleX * crop.width >= image.width * image.scaleX) {
      crop.set({scaleX: (image.width * image.scaleX) / crop.width});
    }

    if (crop.scaleY * crop.height >= image.height * image.scaleY) {
      crop.set({scaleY: (image.height * image.scaleY) / crop.height});
    }
  }

  if (e.target.id === "image") {
    const image = e.target as FabricObject;

    const originalWidth = canvas.originalImageDimensions?.width;
    if (typeof originalWidth === "number" && image.scaleX * image.width >= originalWidth) {
      image.set({scaleX: originalWidth / image.width});
    }

    if (image.scaleY * image.height >= canvas.originalImageDimensions?.height!) {
      image.set({scaleY: canvas.originalImageDimensions?.height! / image.height});
    }

    canvas.centerObject(image);
  }

  canvas.renderAll();
};
