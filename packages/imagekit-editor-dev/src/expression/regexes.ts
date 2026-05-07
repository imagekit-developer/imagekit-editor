export const IMG_VAR_CODES = [
  "iw",
  "ih",
  "iar",
  "cw",
  "ch",
  "car",
  "bw",
  "bh",
  "bar",
] as const

export const OP_CODES = ["mul", "div", "add", "sub", "mod", "pow"] as const

/** Standard UUID string (incl. `crypto.randomUUID`). */
export const USER_VAR_UUID_INNER_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** UUID pattern without anchors (for substring matching within a larger string). */
const USER_VAR_UUID_INNER_NO_ANCHORS =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"

/** Matches exactly `{{uuid}}` (case-insensitive). Captures the UUID inner. */
export const USER_VAR_TOKEN_RE = new RegExp(
  `^\\{\\{(${USER_VAR_UUID_INNER_NO_ANCHORS})\\}\\}$`,
  "i",
)

/** Matches `{{uuid}}` anywhere in a string (global, case-insensitive). Captures the UUID inner. */
export const USER_VAR_TOKEN_GLOBAL_RE = new RegExp(
  `\\{\\{(${USER_VAR_UUID_INNER_NO_ANCHORS})\\}\\}`,
  "gi",
)

/**
 * Escapes tokens to safely embed inside a RegExp source.
 * (Codes are currently alphanumeric, but keeping this robust avoids future footguns.)
 */
function escapeRegExpLiteral(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function makeWordBoundaryAlternationRe(
  tokens: readonly string[],
  flags: string,
) {
  const inner = tokens.map(escapeRegExpLiteral).join("|")
  return new RegExp(`\\b(?:${inner})\\b`, flags)
}

/**
 * Token boundary matcher that treats `_` as a separator (unlike `\\b`).
 * Matches tokens not adjacent to ASCII letters/digits.
 */
export function makeAlphaNumBoundaryAlternationRe(
  tokens: readonly string[],
  flags: string,
) {
  const inner = tokens.map(escapeRegExpLiteral).join("|")
  return new RegExp(`(?<![a-zA-Z0-9])(?:${inner})(?![a-zA-Z0-9])`, flags)
}

export function makeAlternationSource(tokens: readonly string[]) {
  return `(?:${tokens.map(escapeRegExpLiteral).join("|")})`
}
