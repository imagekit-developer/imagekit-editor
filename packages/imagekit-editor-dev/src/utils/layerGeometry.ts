/**
 * Utilities for resolving layer overlay positions to pixel coordinates
 * and converting drag/resize results back to layer position values.
 */

/** The nine anchor/focus positions ImageKit supports. */
export type AnchorPosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"

export type PositionMethod = "topleft" | "center"

export interface LayerPositionConfig {
  positionMethod: PositionMethod
  positionX?: number | string
  positionY?: number | string
  positionXC?: number | string
  positionYC?: number | string
  anchorPoint?: AnchorPosition
  focus?: AnchorPosition
  layerWidth?: number
  layerHeight?: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const EXPR_PATTERN =
  /^(?:bw|cw|bh|ch|iw|ih)_(?:add|sub|mul|div|mod|pow)_(?:\d+(?:\.\d{1,2})?)$/

/** Returns true if a position value is an expression string (e.g. `bw_div_2`). */
export function isExpression(value: unknown): boolean {
  if (typeof value !== "string") return false
  return EXPR_PATTERN.test(value)
}

/** Returns true if any of the active position fields contain expressions. */
export function hasExpressionCoords(config: LayerPositionConfig): boolean {
  if (config.positionMethod === "topleft") {
    return isExpression(config.positionX) || isExpression(config.positionY)
  }
  return isExpression(config.positionXC) || isExpression(config.positionYC)
}

/**
 * Parse a numeric position value. Handles:
 * - number: returned as-is
 * - string starting with 'N' or '-': parsed as negative
 * - other string: parsed as positive number
 * - expression/empty: returns 0
 */
function parseNumericPosition(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0
  if (typeof val === "number") return val
  if (typeof val === "string") {
    if (isExpression(val)) return 0
    const cleaned = val.replace(/^N/, "-")
    const n = Number(cleaned)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

/**
 * Converts an anchor position name to a fractional offset {fx, fy} where
 * (0,0) = top_left and (1,1) = bottom_right.
 */
function anchorToFraction(anchor?: AnchorPosition): {
  fx: number
  fy: number
} {
  switch (anchor) {
    case "top_left":
      return { fx: 0, fy: 0 }
    case "top":
      return { fx: 0.5, fy: 0 }
    case "top_right":
      return { fx: 1, fy: 0 }
    case "left":
      return { fx: 0, fy: 0.5 }
    case "center":
      return { fx: 0.5, fy: 0.5 }
    case "right":
      return { fx: 1, fy: 0.5 }
    case "bottom_left":
      return { fx: 0, fy: 1 }
    case "bottom":
      return { fx: 0.5, fy: 1 }
    case "bottom_right":
      return { fx: 1, fy: 1 }
    default:
      return { fx: 0, fy: 0 }
  }
}

/**
 * Resolves a layer's config into a pixel rectangle {x, y, w, h} on the
 * canvas coordinate space.
 *
 * The result `(x, y)` is the **top-left corner** of the layer in canvas pixels.
 *
 * When no position fields are provided, `focus` determines where the layer
 * lands (ImageKit default focus = center of the base image).
 *
 * @param config - position values extracted from the layer's form data
 * @param canvasW - base image / canvas width in pixels
 * @param canvasH - base image / canvas height in pixels
 */
export function resolveLayerRect(
  config: LayerPositionConfig,
  canvasW: number,
  canvasH: number,
): Rect {
  const lw = config.layerWidth ?? 0
  const lh = config.layerHeight ?? 0

  // Anchor point on the base image. Default = center.
  const anchor = anchorToFraction(config.anchorPoint || "center")
  const anchorX = anchor.fx * canvasW
  const anchorY = anchor.fy * canvasH

  // Focus determines default layer placement when no x/y offsets.
  // It maps to a position on the layer itself, which aligns with the anchor.
  const focusPos = anchorToFraction(config.focus)

  if (config.positionMethod === "center") {
    const xc = parseNumericPosition(config.positionXC)
    const yc = parseNumericPosition(config.positionYC)
    // xc/yc offset the layer's center from the anchor point
    const centerX = anchorX + xc
    const centerY = anchorY + yc
    return {
      x: centerX - lw / 2,
      y: centerY - lh / 2,
      w: lw,
      h: lh,
    }
  }

  // topleft mode
  const x = parseNumericPosition(config.positionX)
  const y = parseNumericPosition(config.positionY)

  // x/y offset the layer's top-left from the anchor point
  // Focus adjusts within that: the focus point on the layer aligns at anchor+offset
  // But with explicit x/y, ImageKit basically does: layer_topLeft = anchor + (x, y)
  // When no explicit x/y, focus determines placement:
  //   layer placed so that its focus fraction aligns with the anchor
  const hasExplicitOffset = config.positionX !== undefined || config.positionY !== undefined
  if (hasExplicitOffset) {
    return {
      x: anchorX + x,
      y: anchorY + y,
      w: lw,
      h: lh,
    }
  }

  // No explicit offset — use focus to position the layer
  return {
    x: anchorX - focusPos.fx * lw,
    y: anchorY - focusPos.fy * lh,
    w: lw,
    h: lh,
  }
}

/**
 * Converts a pixel rect (top-left) back into layer position coords,
 * preserving the user's chosen positionMethod and anchorPoint.
 *
 * Returns the new values for positionX/Y or positionXC/YC as numbers.
 */
export function rectToLayerCoords(
  rect: Rect,
  canvasW: number,
  canvasH: number,
  positionMethod: PositionMethod,
  anchorPoint?: AnchorPosition,
): { positionX?: number; positionY?: number; positionXC?: number; positionYC?: number } {
  const anchor = anchorToFraction(anchorPoint || "center")
  const anchorX = anchor.fx * canvasW
  const anchorY = anchor.fy * canvasH

  if (positionMethod === "center") {
    const centerX = rect.x + rect.w / 2
    const centerY = rect.y + rect.h / 2
    return {
      positionXC: Math.round(centerX - anchorX),
      positionYC: Math.round(centerY - anchorY),
    }
  }

  return {
    positionX: Math.round(rect.x - anchorX),
    positionY: Math.round(rect.y - anchorY),
  }
}

/**
 * Extract layer position config from a transformation value object.
 * Works for all three layer types (text, image, solid-color).
 */
export function extractLayerPositionConfig(
  value: Record<string, unknown>,
): LayerPositionConfig {
  return {
    positionMethod: (value.layerPositionMethod as PositionMethod) || "topleft",
    positionX: value.positionX as number | string | undefined,
    positionY: value.positionY as number | string | undefined,
    positionXC: value.positionXC as number | string | undefined,
    positionYC: value.positionYC as number | string | undefined,
    anchorPoint: value.layerAnchorPoint as AnchorPosition | undefined,
    focus: value.layerFocus as AnchorPosition | undefined,
    layerWidth: typeof value.width === "number" ? value.width : undefined,
    layerHeight: typeof value.height === "number" ? value.height : undefined,
  }
}

/** Layer transformation key prefixes */
const LAYER_KEYS = ["layers-text", "layers-image", "layers-solid-color"]

/** Returns true if the transformation key represents a layer overlay. */
export function isLayerTransformation(key: string): boolean {
  return LAYER_KEYS.some((prefix) => key === prefix)
}

/** Returns the layer type from a transformation key, or null if not a layer. */
export function getLayerType(
  key: string,
): "text" | "image" | "solid-color" | null {
  if (key === "layers-text") return "text"
  if (key === "layers-image") return "image"
  if (key === "layers-solid-color") return "solid-color"
  return null
}
