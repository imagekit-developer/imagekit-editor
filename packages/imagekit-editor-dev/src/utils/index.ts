export const __DEV__ = process.env.NODE_ENV !== "production"

export const SIMPLE_OVERLAY_TEXT_REGEX = /^[a-zA-Z0-9-._ ]*$/
export const TEMPLATE_NAME_UI_MAX_LENGTH = 30

export const safeBtoa = (str: string): string => {
  if (typeof window !== "undefined") {
    /* istanbul ignore next */
    return btoa(str)
  } else {
    // Node fallback
    return Buffer.from(str, "utf8").toString("base64")
  }
}

const decodeHtmlEntitiesOnce = (input: string): string => {
  if (!input || !input.includes("&")) return input

  // Some names were saved with malformed entities missing the trailing semicolon,
  // e.g. "&amp;lt&gt;" where the "lt" is missing ";". Normalize those first.
  const normalized = input.replace(/&(amp|lt|gt|quot|apos|nbsp)(?!;)/g, "&$1;")

  // Decode a small, deterministic set of HTML entities + numeric references.
  // Intentionally does NOT decode broader named entities like &copy; to keep
  // behavior stable across environments and avoid surprising transforms.
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  }

  return normalized.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, g1) => {
    if (typeof g1 !== "string") return m
    if (g1.startsWith("#x") || g1.startsWith("#X")) {
      const codePoint = Number.parseInt(g1.slice(2), 16)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : m
    }
    if (g1.startsWith("#")) {
      const codePoint = Number.parseInt(g1.slice(1), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : m
    }
    return named[g1] ?? m
  })
}

/**
 * Normalizes a template name for display in the UI.
 * Handles cases where names were stored with HTML entities (sometimes double-encoded).
 */
export const formatTemplateNameForUI = (rawName: string): string => {
  let s = rawName ?? ""
  // Decode up to a few times to handle double-encoding like "&amp;lt;" → "&lt;" → "<".
  for (let i = 0; i < 3; i++) {
    const next = decodeHtmlEntitiesOnce(s)
    if (next === s) break
    s = next
  }
  return s
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

/**
 * Extracts the image path from a URL for use in ImageKit layer syntax (i- parameter).
 * Removes ImageKit ID and converts folder paths to use @@ separator.
 * @param imageUrl - The image URL (e.g., "https://ik.imagekit.io/cr29v1rbc/pikachu.png" or "https://ik.imagekit.io/cr29v1rbc/folder-name/pikachu.png")
 * @returns The path for use in i- parameter (e.g., "pikachu.png" or "folder-name@@pikachu.png")
 */
export const extractImagePath = (imageUrl: string): string => {
  try {
    const urlWithoutQuery = imageUrl.split("?")[0]

    if (
      urlWithoutQuery.startsWith("http://") ||
      urlWithoutQuery.startsWith("https://")
    ) {
      const url = new URL(urlWithoutQuery)
      const pathname = url.pathname.replace(/^\//, "")

      const segments = pathname.split("/")

      if (segments.length > 1) {
        const pathWithoutImageKitId = segments.slice(1).join("/")
        return pathWithoutImageKitId.replace(/\//g, "@@")
      }

      return segments[0] || ""
    }

    const cleanPath = urlWithoutQuery.replace(/^\//, "")
    const segments = cleanPath.split("/")

    if (segments.length > 1) {
      const pathWithoutFirstSegment = segments.slice(1).join("/")
      return pathWithoutFirstSegment.replace(/\//g, "@@")
    }

    return segments[0] || ""
  } catch (_error) {
    const cleanPath = imageUrl.split("?")[0].replace(/^\//, "")
    const segments = cleanPath.split("/")

    if (segments.length > 1) {
      return segments.slice(1).join("/").replace(/\//g, "@@")
    }

    return segments[0] || ""
  }
}

export const truncateTemplateName = (name: string) => {
  const normalized = formatTemplateNameForUI(name)
  if (normalized.length <= TEMPLATE_NAME_UI_MAX_LENGTH) {
    return normalized
  }
  return `${normalized.slice(0, TEMPLATE_NAME_UI_MAX_LENGTH)}...`
}

export { chakraAny } from "./chakraAny"
export {
  getDisplayTemplates,
  shouldHideTemplateBecauseMatchesUnsavedCurrent,
  sortTemplatesPinnedThenRecent,
} from "./templateList"
