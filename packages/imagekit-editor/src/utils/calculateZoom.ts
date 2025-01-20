const calculateZoom = (
  newZoom: {
    value: number;
    x?: number;
    y?: number;
  },
  oldZoom: {
    value: number;
    x?: number;
    y?: number;
  },
  canvasWidth: number,
  canvasHeight: number,
) => {
  const isZoomIn = newZoom.value > oldZoom.value;
  const mousePointTo = {
    x: (newZoom.x! - oldZoom.x! || 0) / oldZoom.value,
    y: (newZoom.y! - oldZoom.y! || 0) / oldZoom.value,
  };

  const newPos = {
    x: newZoom.x! - mousePointTo.x * newZoom.value,
    y: newZoom.y! - mousePointTo.y * newZoom.value,
  };
  if (!isZoomIn || oldZoom.value !== 1) {
    newPos.x = Math.min(0, Math.max(newPos.x, canvasWidth * (1 - oldZoom.value)));
    newPos.y = Math.min(0, Math.max(newPos.y, canvasHeight * (1 - oldZoom.value)));
  }

  if (newZoom.value < 1) {
    const initialAndScaledWidthDiff = canvasWidth - canvasWidth * newZoom.value;
    const initialAndScaledHeightDiff = canvasHeight - canvasHeight * newZoom.value;
    newPos.x += initialAndScaledWidthDiff / 2;
    newPos.y += initialAndScaledHeightDiff / 2;
  }

  return {
    ...newPos,
    value: newZoom.value,
  };
};

export default calculateZoom;
