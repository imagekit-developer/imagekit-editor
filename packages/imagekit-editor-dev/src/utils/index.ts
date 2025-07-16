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
