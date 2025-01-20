const getDimensionsMinimalRatio = (width: number, height: number, newWidth: number, newHeight: number) => {
  const widthScale = width / newWidth;
  const heightScale = height / newHeight;

  return Math.min(widthScale, heightScale);
};

export default getDimensionsMinimalRatio;
