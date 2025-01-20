import {Canvas as FabricCanvas, FabricImage, Rect} from "fabric";

export const addLoadingOverlay = (
  fabricRef: React.MutableRefObject<FabricCanvas | null>,
  imageRef: React.MutableRefObject<FabricImage | null>,
  loadingOverlayRef: React.MutableRefObject<Rect | null>,
) => {
  if (!fabricRef.current || !imageRef.current) return;

  fabricRef.current.selection = false;
  fabricRef.current.skipTargetFind = true;

  const canvas = fabricRef.current;
  const image = imageRef.current;

  const {left, top, width, height} = image.getBoundingRect();

  const overlayRect = new Rect({
    left,
    top,
    width,
    height,
    fill: "rgba(0, 0, 0, 0.4)",
    selectable: false,
    evented: false,
  });

  loadingOverlayRef.current = overlayRect;

  fabricRef.current.add(overlayRect);

  fabricRef.current.renderAll();
};

export const removeLoadingOverlay = (
  fabricRef: React.MutableRefObject<FabricCanvas | null>,
  loadingOverlayRef: React.MutableRefObject<Rect | null>,
) => {
  if (!fabricRef.current) return;

  fabricRef.current.selection = true;
  fabricRef.current.skipTargetFind = false;

  if (loadingOverlayRef.current) {
    fabricRef.current.remove(loadingOverlayRef.current);
    loadingOverlayRef.current = null;
  }
  fabricRef.current.renderAll();
};
