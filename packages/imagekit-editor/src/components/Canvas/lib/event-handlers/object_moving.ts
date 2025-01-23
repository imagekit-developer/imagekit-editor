import {
  BasicTransformEvent,
  Canvas as FabricCanvas,
  FabricImage,
  FabricObject,
  Line as FabricLine,
  TPointerEvent,
} from "fabric";
import {SNAPPING_DISTANCE} from "../../../../utils/constants";
import {clearGuidelines, createHorizontalGuideline, createVerticalGuideline, guidelineExists} from "../guidelines";

export const objectMovingEventHandler = (
  e: BasicTransformEvent<TPointerEvent> & {
    target: FabricObject;
  },
) => {
  const canvas = e.target.canvas!;
  if (e.target.id === "crop") {
    handleCropboxMoving(canvas, e.target);
  }
};

export const handleCropboxMoving = (canvas: FabricCanvas, obj: FabricObject) => {
  const image = canvas.getObjects("image")[0] as FabricImage;

  if (!image) return;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  const left = obj.left;
  const top = obj.top;
  const right = left + obj.width * obj.scaleX;
  const bottom = top + obj.height * obj.scaleY;

  const centerX = left + (obj.width * obj.scaleX) / 2;
  const centerY = top + (obj.height * obj.scaleY) / 2;

  if (left < image.left) {
    obj.set({left: image.left});
  }

  if (top < image.top) {
    obj.set({top: image.top});
  }

  if (right > image.left + image.width * image.scaleX) {
    obj.set({left: image.left + image.width * image.scaleX - obj.width * obj.scaleX});
  }

  if (bottom > image.top + image.height * image.scaleY) {
    obj.set({top: image.top + image.height * image.scaleY - obj.height * obj.scaleY});
  }

  let newGuidelines: FabricLine[] = [];
  clearGuidelines(canvas);

  let snapped = false;

  if (Math.abs(image.left - left) < SNAPPING_DISTANCE) {
    obj.set({left: image.left});
    if (!guidelineExists(canvas, "vertical-left")) {
      const line = createVerticalGuideline(canvas, image.left, "vertical-left");
      newGuidelines.push(line);
      canvas.add(line);
    }

    snapped = true;
  }

  if (Math.abs(image.top - top) < SNAPPING_DISTANCE) {
    obj.set({top: image.top});
    if (!guidelineExists(canvas, "horizontal-top")) {
      const line = createHorizontalGuideline(canvas, image.top, "horizontal-top");
      newGuidelines.push(line);
      canvas.add(line);
    }

    snapped = true;
  }

  if (Math.abs(right - (image.left + image.width * image.scaleX)) < SNAPPING_DISTANCE) {
    obj.set({left: image.left + image.width * image.scaleX - obj.width * obj.scaleX});
    if (!guidelineExists(canvas, "vertical-right")) {
      const line = createVerticalGuideline(canvas, image.left + image.width * image.scaleX, "vertical-right");
      newGuidelines.push(line);
      canvas.add(line);
    }

    snapped = true;
  }

  if (Math.abs(bottom - (image.top + image.height * image.scaleY)) < SNAPPING_DISTANCE) {
    obj.set({top: image.top + image.height * image.scaleY - obj.height * obj.scaleY});
    if (!guidelineExists(canvas, "horizontal-bottom")) {
      const line = createHorizontalGuideline(canvas, image.top + image.height * image.scaleY, "horizontal-bottom");
      newGuidelines.push(line);
      canvas.add(line);
    }

    snapped = true;
  }

  if (Math.abs(centerX - canvasWidth / 2) < SNAPPING_DISTANCE) {
    obj.set({left: canvasWidth / 2 - (obj.width * obj.scaleX) / 2});
    if (!guidelineExists(canvas, "vertical-center")) {
      const line = createVerticalGuideline(canvas, canvasWidth / 2, "vertical-center");
      newGuidelines.push(line);
      canvas.add(line);
    }

    snapped = true;
  }

  if (Math.abs(centerY - canvasHeight / 2) < SNAPPING_DISTANCE) {
    obj.set("top", canvasHeight / 2 - (obj.height * obj.scaleY) / 2);
    if (!guidelineExists(canvas, "horizontal-bottom")) {
      const line = createHorizontalGuideline(canvas, canvasHeight / 2, "horizontal-bottom");
      newGuidelines.push(line);
      canvas.add(line);
    }

    snapped = true;
  }

  if (!snapped) {
    clearGuidelines(canvas);
  } else {
    canvas.guidelines = newGuidelines;
  }

  canvas.renderAll();
};

// export const handleObjectMoving = (
//   canvas: FabricCanvas,
//   obj: FabricObject,
//   setGuidelines: React.Dispatch<React.SetStateAction<FabricLine[] | null>>,
// ) => {
//   const canvasWidth = canvas.width;
//   const canvasHeight = canvas.height;

//   const left = obj.left;
//   const top = obj.top;
//   const right = left + obj.width * obj.scaleX;
//   const bottom = top + obj.height * obj.scaleY;

//   const centerX = left + (obj.width * obj.scaleX) / 2;
//   const centerY = top + (obj.height * obj.scaleY) / 2;

//   let newGuidelines: FabricLine[] = [];
//   clearGuidelines(canvas);

//   let snapped = false;

//   if (Math.abs(left) < snappingDistance) {
//     obj.set({left: 0});
//     if (!guidelineExists(canvas, "vertical-left")) {
//       const line = createVerticalGuideline(canvas, 0, "vertical-left");
//       newGuidelines.push(line);
//       canvas.add(line);
//     }

//     snapped = true;
//   }

//   if (Math.abs(top) < snappingDistance) {
//     obj.set({top: 0});
//     if (!guidelineExists(canvas, "horizontal-top")) {
//       const line = createHorizontalGuideline(canvas, 0, "horizontal-top");
//       newGuidelines.push(line);
//       canvas.add(line);
//     }

//     snapped = true;
//   }

//   if (Math.abs(right - canvasWidth) < snappingDistance) {
//     obj.set({left: canvasWidth - obj.width * obj.scaleX});
//     if (!guidelineExists(canvas, "vertical-right")) {
//       const line = createVerticalGuideline(canvas, canvasWidth, "vertical-right");
//       newGuidelines.push(line);
//       canvas.add(line);
//     }

//     snapped = true;
//   }

//   if (Math.abs(bottom - canvasHeight) < snappingDistance) {
//     obj.set({top: canvasHeight - obj.height * obj.scaleY});
//     if (!guidelineExists(canvas, "horizontal-bottom")) {
//       const line = createHorizontalGuideline(canvas, canvasHeight, "horizontal-bottom");
//       newGuidelines.push(line);
//       canvas.add(line);
//     }

//     snapped = true;
//   }

//   if (Math.abs(centerX - canvasWidth / 2) < snappingDistance) {
//     obj.set({left: canvasWidth / 2 - (obj.width * obj.scaleX) / 2});
//     if (!guidelineExists(canvas, "vertical-center")) {
//       const line = createVerticalGuideline(canvas, canvasWidth / 2, "vertical-center");
//       newGuidelines.push(line);
//       canvas.add(line);
//     }

//     snapped = true;
//   }

//   if (Math.abs(centerY - canvasHeight / 2) < snappingDistance) {
//     obj.set("top", canvasHeight / 2 - (obj.height * obj.scaleY) / 2);
//     if (!guidelineExists(canvas, "horizontal-bottom")) {
//       const line = createHorizontalGuideline(canvas, canvasHeight / 2, "horizontal-bottom");
//       newGuidelines.push(line);
//       canvas.add(line);
//     }

//     snapped = true;
//   }

//   if (!snapped) {
//     clearGuidelines(canvas);
//   } else {
//     setGuidelines(newGuidelines);
//   }

//   canvas.renderAll();
// };
