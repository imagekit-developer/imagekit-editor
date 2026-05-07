export function deepMapStrings(
  value: unknown,
  map: (input: string) => string,
): unknown {
  if (typeof value === "string") return map(value)
  if (Array.isArray(value)) return value.map((v) => deepMapStrings(v, map))
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deepMapStrings(v, map)
    }
    return out
  }
  return value
}
