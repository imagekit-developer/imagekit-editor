import { SIMPLE_OVERLAY_TEXT_REGEX, safeBtoa } from "../utils"
import { serializeIkGradientPayload } from "../utils/ikGradient"

export type NestedLayerType = "text" | "image" | "canvas"

export type NestedLayerPosition =
  | { mode: "none" }
  | { mode: "lfo"; lfo: string }
  | { mode: "topLeft"; lx?: string; ly?: string; lap?: string }
  | { mode: "center"; lxc?: string; lyc?: string; lap?: string }

export type NestedTextLayer = {
  type: "text"
  text: string
  width?: string | number
  fontSize?: string | number
  fontFamily?: string
  color?: string
  /**
   * Typography flags for ImageKit text layers.
   * URL syntax uses `tg-` (e.g. `tg-b_i`). The editor stores an array like
   * ["bold","italic"] so we keep it flexible here.
   */
  typography?: Array<"bold" | "italic" | "strikethrough"> | string
  backgroundColor?: string
  padding?: string
  radius?: string | number
  opacity?: number
  position?: NestedLayerPosition
}

export type NestedImageLayer = {
  type: "image"
  imageUrl: string
  width?: string | number
  height?: string | number
  opacity?: number
  backgroundColor?: string
  radius?: string | number
  position?: NestedLayerPosition
}

export type NestedCanvasLayer = {
  type: "canvas"
  width?: string | number
  height?: string | number
  backgroundColor?: string
  opacity?: number
  radius?: string | number
  gradient?: {
    direction?: string | number
    from?: string
    to?: string
    stopPoint?: string | number
  }
  position?: NestedLayerPosition
  children?: NestedLayer[]
}

export type NestedLayer = NestedTextLayer | NestedImageLayer | NestedCanvasLayer

const stripHexHash = (s: string) => s.replace(/^#/, "")

function encodeTextInput(text: string): { key: "i" | "ie"; value: string } {
  const trimmed = String(text ?? "")
  // Keep editor compatibility: allow "simple" text directly.
  if (SIMPLE_OVERLAY_TEXT_REGEX.test(trimmed) && trimmed.length <= 2000) {
    // ImageKit examples commonly use underscores for spaces.
    return { key: "i", value: trimmed.replace(/ /g, "_") }
  }
  const b64 = safeBtoa(trimmed)
  return { key: "ie", value: encodeURIComponent(b64) }
}

function encodeLayerInputPath(input: string): {
  key: "i" | "ie"
  value: string
} {
  const raw = String(input ?? "").trim()
  // If it's a path/URL coming from editor, we accept slashes and translate to @@ for media library paths.
  const normalized = raw.replace(/\//g, "@@").replace(/^@@+/, "")
  // A permissive "simple" path check to prefer i- when likely safe.
  if (/^[a-zA-Z0-9@._-]+(?:@@[a-zA-Z0-9@._-]+)*$/.test(normalized)) {
    return { key: "i", value: normalized }
  }
  const b64 = safeBtoa(raw)
  return { key: "ie", value: encodeURIComponent(b64) }
}

function serializePosition(position?: NestedLayerPosition): string[] {
  if (!position || position.mode === "none") return []
  if (position.mode === "lfo") {
    return position.lfo ? [`lfo-${position.lfo}`] : []
  }
  if (position.mode === "topLeft") {
    const out: string[] = []
    if (position.lx) out.push(`lx-${String(position.lx).replace(/^-/, "N")}`)
    if (position.ly) out.push(`ly-${String(position.ly).replace(/^-/, "N")}`)
    if (position.lap) out.push(`lap-${position.lap}`)
    return out
  }
  if (position.mode === "center") {
    const out: string[] = []
    if (position.lxc) out.push(`lxc-${String(position.lxc).replace(/^-/, "N")}`)
    if (position.lyc) out.push(`lyc-${String(position.lyc).replace(/^-/, "N")}`)
    if (position.lap) out.push(`lap-${position.lap}`)
    return out
  }
  return []
}

function serializeCanvasTransform(canvas: NestedCanvasLayer): string[] {
  const out: string[] = []
  if (
    canvas.width !== undefined &&
    canvas.width !== null &&
    canvas.width !== ""
  ) {
    out.push(`w-${canvas.width}`)
  }
  if (
    canvas.height !== undefined &&
    canvas.height !== null &&
    canvas.height !== ""
  ) {
    out.push(`h-${canvas.height}`)
  }
  if (canvas.backgroundColor)
    out.push(`bg-${stripHexHash(canvas.backgroundColor)}`)
  if (typeof canvas.opacity === "number") out.push(`al-${canvas.opacity}`)
  if (
    canvas.radius !== undefined &&
    canvas.radius !== null &&
    canvas.radius !== ""
  ) {
    out.push(`r-${canvas.radius}`)
  }
  if (canvas.gradient) {
    const payload = serializeIkGradientPayload({
      direction: canvas.gradient.direction,
      from: canvas.gradient.from,
      to: canvas.gradient.to,
      stopPoint: canvas.gradient.stopPoint,
    })
    if (payload) out.push(`e-gradient-${payload}`)
  }
  return out
}

function serializeTextTransform(layer: NestedTextLayer): string[] {
  const out: string[] = []
  if (layer.width !== undefined && layer.width !== null && layer.width !== "") {
    out.push(`w-${layer.width}`)
  }
  if (
    layer.fontSize !== undefined &&
    layer.fontSize !== null &&
    layer.fontSize !== ""
  ) {
    out.push(`fs-${layer.fontSize}`)
  }
  if (layer.fontFamily) out.push(`ff-${layer.fontFamily.replace(/\//g, "@@")}`)
  if (layer.color) out.push(`co-${stripHexHash(layer.color)}`)
  if (layer.typography) {
    const raw = layer.typography
    const parts = Array.isArray(raw)
      ? raw.filter(Boolean).map((t) => {
          if (t === "bold") return "b"
          if (t === "italic") return "i"
          return "strikethrough"
        })
      : String(raw).split("_").filter(Boolean)
    const tg = parts.length > 0 ? parts.join("_") : ""
    if (tg) out.push(`tg-${tg}`)
  }
  if (layer.backgroundColor)
    out.push(`bg-${stripHexHash(layer.backgroundColor)}`)
  if (layer.padding) out.push(`pa-${layer.padding}`)
  if (
    layer.radius !== undefined &&
    layer.radius !== null &&
    layer.radius !== ""
  ) {
    out.push(`r-${layer.radius}`)
  }
  if (typeof layer.opacity === "number") out.push(`al-${layer.opacity}`)
  return out
}

function serializeImageTransform(layer: NestedImageLayer): string[] {
  const out: string[] = []
  if (layer.width !== undefined && layer.width !== null && layer.width !== "") {
    out.push(`w-${layer.width}`)
  }
  if (
    layer.height !== undefined &&
    layer.height !== null &&
    layer.height !== ""
  ) {
    out.push(`h-${layer.height}`)
  }
  if (typeof layer.opacity === "number") out.push(`o-${layer.opacity}`)
  if (layer.backgroundColor)
    out.push(`bg-${stripHexHash(layer.backgroundColor)}`)
  if (
    layer.radius !== undefined &&
    layer.radius !== null &&
    layer.radius !== ""
  ) {
    out.push(`r-${layer.radius}`)
  }
  return out
}

function serializeSingleLayerBlock(layer: NestedLayer): string {
  const baseParams: string[] = []

  if (layer.type === "text") {
    const { key, value } = encodeTextInput(layer.text)
    baseParams.push("l-text", `${key}-${value}`)
    baseParams.push(...serializeTextTransform(layer))
    baseParams.push(...serializePosition(layer.position))
    baseParams.push("l-end")
    return baseParams.join(",")
  }

  if (layer.type === "image") {
    const { key, value } = encodeLayerInputPath(layer.imageUrl)
    baseParams.push("l-image", `${key}-${value}`)
    baseParams.push(...serializeImageTransform(layer))
    baseParams.push(...serializePosition(layer.position))
    baseParams.push("l-end")
    return baseParams.join(",")
  }

  // canvas
  baseParams.push("l-image", "i-ik_canvas")
  baseParams.push(...serializeCanvasTransform(layer))
  baseParams.push(...serializePosition(layer.position))

  const children = layer.children?.filter(Boolean) ?? []
  if (children.length > 0) {
    const childBlocks = children.map(serializeSingleLayerBlock).join(":")
    // Child blocks are appended to the parent with a comma, while siblings are ":" chained.
    baseParams.push(childBlocks)
  }
  baseParams.push("l-end")
  return baseParams.join(",")
}

export function buildLayerRawString(args: {
  layer: NestedLayer
  children?: NestedLayer[]
}): string {
  const { layer, children } = args
  if (layer.type === "canvas") {
    const merged: NestedCanvasLayer = {
      ...layer,
      children: children ?? layer.children,
    }
    return serializeSingleLayerBlock(merged)
  }
  // For text/image parents, we allow injecting children for nesting inside those layers too.
  if (!children || children.length === 0) {
    return serializeSingleLayerBlock(layer)
  }
  // Convert the parent into a canvas-like nesting container only in syntax terms:
  // ImageKit supports nesting layers inside image layers; we serialize by appending children
  // before the parent's l-end.
  const parentBlock = serializeSingleLayerBlock(layer)
  // parentBlock ends with ",l-end" and has no children; inject children before l-end.
  const idx = parentBlock.lastIndexOf(",l-end")
  if (idx === -1) return parentBlock
  const childBlocks = children.map(serializeSingleLayerBlock).join(":")
  return `${parentBlock.slice(0, idx)},${childBlocks}${parentBlock.slice(idx)}`
}
