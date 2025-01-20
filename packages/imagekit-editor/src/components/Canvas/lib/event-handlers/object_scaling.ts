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

    if (crop.left < image.left) {
      crop.set({left: image.left});
    }

    if (crop.top < image.top) {
      crop.set({top: image.top});
    }

    if (crop.left + cropWidth > image.left + image.width * image.scaleX) {
      crop.set({left: image.left + image.width * image.scaleX - cropWidth});
    }

    if (crop.top + cropHeight > image.top + image.height * image.scaleY) {
      crop.set({top: image.top + image.height * image.scaleY - cropHeight});
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

    if (image.scaleX * image.width >= canvas.originalImageDimensions?.width!) {
      image.set({scaleX: canvas.originalImageDimensions?.width! / image.width});
    }

    if (image.scaleY * image.height >= canvas.originalImageDimensions?.height!) {
      image.set({scaleY: canvas.originalImageDimensions?.height! / image.height});
    }

    canvas.centerObject(image);
  }
};
