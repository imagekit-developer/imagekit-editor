import type { Transformation as IKTransformation } from "@imagekit/javascript"

function replaceImagePathDeep(value: unknown, imagePath: string): unknown {
  if (typeof value === "string") {
    return value.includes("__IMAGE_PATH__")
      ? value.replace(/__IMAGE_PATH__/g, imagePath)
      : value
  }
  if (Array.isArray(value)) {
    return value.map((v) => replaceImagePathDeep(v, imagePath))
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = replaceImagePathDeep(v, imagePath)
    }
    return out
  }
  return value
}

export function replaceImagePathPlaceholders(
  transformations: IKTransformation[],
  imagePath: string,
): IKTransformation[] {
  return transformations.map(
    (t) => replaceImagePathDeep(t, imagePath) as IKTransformation,
  )
}
