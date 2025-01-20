const getRotatedPoint = ({x, y}: {x: number; y: number}, angleDegree: number) => {
  const radianAngle = (angleDegree * Math.PI) / 180;
  const rcos = Math.cos(radianAngle);
  const rsin = Math.sin(radianAngle);
  return {x: x * rcos - y * rsin, y: y * rcos + x * rsin};
};

const getCenterRotatedPoint = (width?: number, height?: number, newRotationAngleDegree?: number) => {
  if (!width || !height || (!newRotationAngleDegree && newRotationAngleDegree !== 0)) {
    return {
      x: 0,
      y: 0,
      rotation: newRotationAngleDegree,
    };
  }
  const topLeft = {x: -width / 2, y: -height / 2};
  const current = getRotatedPoint(topLeft, 0);
  const rotated = getRotatedPoint(topLeft, newRotationAngleDegree);
  const dx = rotated.x - current.x;
  const dy = rotated.y - current.y;

  return {x: dx, y: dy, rotation: newRotationAngleDegree};
};

export default getCenterRotatedPoint;
