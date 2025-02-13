import {Canvas as FabricCanvas, Circle, FabricImage, Group, Rect, Text} from "fabric";

const LOADING_TEXTS = [
  "Optimizing pixels...",
  "Enhancing hues...",
  "Refining details...",
  "Applying filters...",
  "Brightening colors...",
  "Smoothing edges...",
  "Aligning layers...",
  "Adjusting focus...",
  "Calibrating tones...",
  "Rendering magic...",
];

export const addLoadingOverlay = (
  fabricRef: React.MutableRefObject<FabricCanvas | null>,
  imageRef: React.MutableRefObject<FabricImage | null>,
  loadingOverlayRef: React.MutableRefObject<Group | null>,
) => {
  if (!fabricRef.current) return;

  fabricRef.current.selection = false;
  fabricRef.current.skipTargetFind = true;

  const text = LOADING_TEXTS[Math.floor(Math.random() * LOADING_TEXTS.length)];

  const canvas = fabricRef.current;

  let height = canvas.height;
  let width = canvas.width;
  let left = 0;
  let top = 0;
  let scaleX = 1;
  let scaleY = 1;

  if (imageRef.current) {
    const {left: imageLeft, top: imageTop, width: imageWidth, height: imageHeight} = imageRef.current.getBoundingRect();

    width = imageWidth;
    height = imageHeight;
    left = imageLeft;
    top = imageTop;
    scaleX = imageRef.current.scaleX;
    scaleY = imageRef.current.scaleY;
  }

  const minDimension = Math.min(width, height);
  const maxDimension = 300;

  // Calculate proportional sizes
  const options = {
    size: minDimension * 0.15, // Spinner size
    weight: minDimension * 0.015, // Stroke width
    fontSize: minDimension * 0.05, // Font size
    textOffset: minDimension * 0.06, // Space between spinner and text
    spinSpeed: 1,
  };

  if (options.size > maxDimension) {
    options.size = maxDimension;
    options.weight = maxDimension * 0.125;
    options.fontSize = maxDimension * 0.5;
    options.textOffset = maxDimension * 0.65;
  }

  const overlayRect = new Rect({
    width: width,
    height: height,
    fill: "black",
    opacity: 0.5,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });

  const background = new Circle({
    radius: options.size / 2,
    left: 0,
    top: 0,
    fill: "",
    stroke: "rgba(255, 255, 255, 0.8)",
    strokeWidth: options.weight,
    strokeLineCap: "round",
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
  });

  const spinner = new Circle({
    radius: options.size / 2,
    left: 0,
    top: 0,
    fill: "",
    stroke: "#0450D5",
    strokeWidth: options.weight,
    strokeLineCap: "round",
    startAngle: 0,
    endAngle: 180,
    angle: 0,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    arcClosed: false,
  });

  const loadingText = new Text(text, {
    left: 0,
    top: options.size / 2 + options.textOffset,
    fill: "#FFFFFF",
    fontSize: options.fontSize,
    fontFamily: "Arial",
    originX: "center",
    originY: "top",
    selectable: false,
    evented: false,
  });

  const group = new Group([overlayRect, background, spinner, loadingText], {
    left,
    top,
    selectable: false,
    evented: false,
  });

  loadingOverlayRef.current = group;

  fabricRef.current.add(group);

  const animate = () => {
    if (!fabricRef.current || !spinner) return;

    const speed = options.spinSpeed * 5;

    // Rotate the spinner
    spinner.rotate((spinner.angle || 0) + speed);

    // Reset after full rotation
    if (spinner.angle >= 360) {
      spinner.rotate(0);
    }

    // Force object update
    spinner.dirty = true;
    fabricRef.current.renderAll();
    requestAnimationFrame(animate);
  };
  animate();

  fabricRef.current.renderAll();
};

export const removeLoadingOverlay = (
  fabricRef: React.MutableRefObject<FabricCanvas | null>,
  loadingOverlayRef: React.MutableRefObject<Group | null>,
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
