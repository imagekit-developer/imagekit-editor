import {Canvas as FabricCanvas} from "fabric";
import {DEFAULT_ZOOM_LEVEL} from "../../../utils/constants";
import {objectModifiedEventHandler} from "../lib/event-handlers/object_modified";
import {objectMovingEventHandler} from "../lib/event-handlers/object_moving";
import {objectScalingEventHandler} from "../lib/event-handlers/object_scaling";

export const initializeFabric = ({
  canvasContainerRef,
  fabricRef,
  canvasRef,
}: {
  canvasContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) => {
  const canvas = new FabricCanvas(canvasRef.current ?? undefined, {
    height: canvasContainerRef.current?.clientHeight,
    width: canvasContainerRef.current?.clientWidth,
    skipOffscreen: false,
  });

  canvas.guidelines = [];

  canvas.preserveObjectStacking = true;

  // @ts-ignore
  window.canvas = canvas;
  canvas.setZoom(DEFAULT_ZOOM_LEVEL);

  // This is a debug element
  // canvas.add(
  //   new Line([0, 0, canvas.width, 0], {
  //     stroke: "red",
  //     selectable: false,
  //     evented: false,
  //   }),
  //   new Line([0, canvas.height, canvas.width, canvas.height], {
  //     stroke: "red",
  //     selectable: false,
  //     evented: false,
  //   }),
  //   new Line([canvas.width, 0, canvas.width, canvas.height], {
  //     stroke: "red",
  //     selectable: false,
  //     evented: false,
  //   }),
  //   new Line([0, 0, 0, canvas.height], {
  //     stroke: "red",
  //     selectable: false,
  //     evented: false,
  //   }),
  // );

  canvas.enableRetinaScaling = true;

  canvas.on("object:moving", objectMovingEventHandler);
  canvas.on("object:scaling", objectScalingEventHandler);
  canvas.on("object:modified", objectModifiedEventHandler);

  canvas.on("mouse:down", function (opt) {
    var evt = opt.e;
    if (evt.altKey === true) {
      // @ts-expect-error
      this.isDragging = true;
      // @ts-expect-error
      this.selection = false;
      // @ts-expect-error
      this.lastPosX = evt.clientX;
      // @ts-expect-error
      this.lastPosY = evt.clientY;
    }
  });

  canvas.on("mouse:move", function (opt) {
    // @ts-expect-error
    if (this.isDragging) {
      var e = opt.e;
      // @ts-expect-error
      var vpt = this.viewportTransform;
      // @ts-expect-error
      vpt[4] += e.clientX - this.lastPosX;
      // @ts-expect-error
      vpt[5] += e.clientY - this.lastPosY;
      // @ts-expect-error
      this.requestRenderAll();
      // @ts-expect-error
      this.lastPosX = e.clientX;
      // @ts-expect-error
      this.lastPosY = e.clientY;
    }
  });
  canvas.on("mouse:up", function (_opt) {
    // on mouse up we want to recalculate new interaction
    // for all objects, so we call setViewportTransform
    // @ts-expect-error
    this.setViewportTransform(this.viewportTransform);
    // @ts-expect-error
    this.isDragging = false;
    // @ts-expect-error
    this.selection = true;
  });

  fabricRef.current = canvas;

  return canvas;
};

export * from "./guidelines";
export * from "./loading";
export * from "./tools";

export async function fetchImageUntilAvailable(imageUrl: string, pollInterval: number = 3000): Promise<Blob> {
  let attempt = 0;
  const MAX_ATTEMPTS = 40;
  while (attempt < MAX_ATTEMPTS) {
    try {
      const response = await fetch(imageUrl);
      const contentType = response.headers.get("content-type") || "";
      const isError = response.status >= 400 || response.headers.get("ik-error");
      if (isError) {
        throw new Error(response.headers.get("ik-error") || `HTTP ${response.status}: Failed to fetch image`);
      }
      if (contentType.startsWith("image/")) {
        return await response.blob();
      }
    } catch (error) {
      if (attempt === MAX_ATTEMPTS - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    attempt++;
  }
  throw new Error(`Failed to fetch image after ${MAX_ATTEMPTS} attempts`);
}
