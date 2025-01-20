const toFloat = (number?: string | number, precision = 5) => {
  if (typeof number === "number") {
    return +parseFloat(number.toString()).toFixed(precision);
  } else if (typeof number === "string") {
    return +parseFloat(number).toFixed(precision);
  }
  return undefined;
};

export default toFloat;
