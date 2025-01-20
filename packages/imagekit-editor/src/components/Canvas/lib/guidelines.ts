import {Canvas as FabricCanvas, Line as FabricLine} from "fabric";

export const clearGuidelines = (canvas: FabricCanvas) => {
  const objects = canvas.getObjects("line") as any[];
  objects.forEach((obj) => {
    if ((obj.id && obj.id.startsWith("vertical-")) || (obj.id && obj.id.startsWith("horizontal-"))) {
      canvas.remove(obj);
    }
  });

  canvas.renderAll();

  canvas.guidelines = [];
};

export const createVerticalGuideline = (_canvas: FabricCanvas, x: number, id: string) =>
  new FabricLine([x, -100000, x, 200000], {
    id,
    stroke: "#0450D5",
    strokeWidth: 2,
    selectable: false,
    evented: false,
    opacity: 0.75,
  });

export const createHorizontalGuideline = (_canvas: FabricCanvas, y: number, id: string) =>
  new FabricLine([-100000, y, 200000, y], {
    id,
    stroke: "#0450D5",
    strokeWidth: 2,
    selectable: false,
    evented: false,
    opacity: 0.75,
  });

export const guidelineExists = (canvas: FabricCanvas, id: string) => {
  const objects = canvas.getObjects("line") as any[];
  return objects.some((obj) => obj.id === id);
};
