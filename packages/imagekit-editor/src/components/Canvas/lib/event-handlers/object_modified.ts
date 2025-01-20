import {FabricImage, FabricObject, ModifiedEvent, TPointerEvent} from "fabric";
import {clearGuidelines} from "../guidelines";

export const objectModifiedEventHandler = (e: ModifiedEvent<TPointerEvent>) => {
  const canvas = e.target.canvas!;
  if (e.target.id === "crop" && e.action === "scale") {
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
  }
  clearGuidelines(canvas);
};
