export const __DEV__ = process.env.NODE_ENV !== "production"

export const SIMPLE_OVERLAY_TEXT_REGEX = /^[a-zA-Z0-9-._ ]*$/

export const safeBtoa = (str: string): string => {
  if (typeof window !== "undefined") {
    /* istanbul ignore next */
    return btoa(str)
  } else {
    // Node fallback
    return Buffer.from(str, "utf8").toString("base64")
  }
}

/**
 * Step validation without floating‑point error.
 * We scale both value and step to integers using their max decimal precision
 * and check with modulus (v % s === 0). This avoids cases like 1.2 / 0.1
 * becoming 11.999999999999998 and breaking `Number.isInteger`.
 * Works well for typical decimal steps (0.1, 0.05, 0.001, etc.).
 */
const decimalPlaces = (x: number | string) => {
  const s = String(x).toLowerCase()
  if (s.includes("e")) {
    // handle scientific notation like 1e-3
    const [coeff, expPart] = s.split("e")
    const exp = parseInt(expPart, 10)
    const frac = (coeff.split(".")[1] || "").length
    return Math.max(0, -exp + frac)
  }
  const i = s.indexOf(".")
  return i === -1 ? 0 : s.length - i - 1
}

export const isStepAligned = (raw: string, step: number) => {
  const n = Number(raw)
  // Don't block during intermediate non-numeric states; your onChange handles "" and "-" already.
  if (!Number.isFinite(n) || step === 0) return true

  // Use enough precision for typical UIs; clamp to avoid huge exponents.
  const dec = Math.min(12, Math.max(decimalPlaces(raw), decimalPlaces(step)))
  const m = 10 ** dec

  const v = Math.round(n * m)
  const s = Math.round(step * m)
  return s !== 0 && v % s === 0
}
