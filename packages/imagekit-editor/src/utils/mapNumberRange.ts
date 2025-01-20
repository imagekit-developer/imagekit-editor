const mapNumberRange = (x: number, oldMin: number, oldMax: number, newMin: number, newMax: number) =>
  ((x - oldMin) * (newMax - newMin)) / (oldMax - oldMin) + newMin;

export default mapNumberRange;
