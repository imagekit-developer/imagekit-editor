export type IkGradientInput = {
  from?: string
  to?: string
  direction?: string | number
  stopPoint?: string | number
}

const stripHexHash = (s: string) => s.replace(/^#/, "")

/**
 * ImageKit uses stop-point `sp` as a decimal ratio (0–1).
 * The editor UI uses 1–100 (percent) or arithmetic expressions.
 */
export function gradientStopPointToDecimalExpr(stopPoint: unknown): string {
  if (stopPoint === undefined || stopPoint === null || stopPoint === "")
    return "1"

  if (typeof stopPoint === "number") {
    return String((stopPoint || 100) / 100)
  }

  const raw = String(stopPoint).trim()
  if (!raw) return "1"

  const asNumber = Number(raw)
  if (Number.isFinite(asNumber)) {
    return String((asNumber || 100) / 100)
  }

  // Non-numeric expression: pass through as-is.
  // Backend/ImageKit handles stop-point scaling for expressions.
  return raw
}

/**
 * Serializes a gradient into the standard ImageKit payload (without the `e-gradient-` prefix):
 * `ld-<dir>_from-<hex>_to-<hex>_sp-<decimalOrExpr>`
 *
 * Returns null if required fields are missing.
 */
export function serializeIkGradientPayload(
  gradient: IkGradientInput | null | undefined,
): string | null {
  if (!gradient) return null
  const { from, to, direction, stopPoint } = gradient
  if (!from || !to || direction === undefined || direction === null) return null

  const fromColor = stripHexHash(String(from))
  const toColor = stripHexHash(String(to))
  const sp = gradientStopPointToDecimalExpr(stopPoint)

  return `ld-${direction}_from-${fromColor}_to-${toColor}_sp-${sp}`
}
