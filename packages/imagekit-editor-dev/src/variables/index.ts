/**
 * Template variable system.
 *
 * A "variable" is a named placeholder stored inline in a transformation's
 * value object using the marker format: { $var: "name", label: "Label" }
 *
 * Variables can be discovered by walking the transformation tree, resolved
 * at render time by substituting concrete values, and created by assigning
 * collision-free names from user-provided labels.
 */

/**
 * Inline marker placed in a transformation field value to indicate
 * that field is a template variable.
 *
 * `defaultValue` is the value rendered when no row-level override is supplied
 * (e.g. while editing the template, or for rows in a CSV that don't define
 * the variable). It is optional.
 */
export interface VariableRef {
  $var: string
  label: string
  defaultValue?: unknown
}

/** Type guard for VariableRef markers. */
export function isVariableRef(value: unknown): value is VariableRef {
  if (value === null || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return typeof v.$var === "string" && typeof v.label === "string"
}

/**
 * Validate a variable name. Must be lowercase alphanumeric + underscores,
 * cannot start with a digit.
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/.test(name)
}

const MAX_NAME_LENGTH = 32

/**
 * Slugify a human label into a valid variable name.
 */
export function slugifyLabel(label: string): string {
  let slug = label
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
  if (!slug) slug = "var"
  if (/^\d/.test(slug)) slug = `v_${slug}`
  if (slug.length > MAX_NAME_LENGTH) {
    slug = slug.slice(0, MAX_NAME_LENGTH).replace(/_+$/, "")
  }
  return slug
}

/**
 * Generate a collision-free variable name from a label,
 * given the set of already-used names.
 */
export function generateVariableName(
  label: string,
  taken: Iterable<string>,
): string {
  const takenSet = new Set(taken)
  const base = slugifyLabel(label)
  if (!takenSet.has(base)) return base
  let suffix = 2
  while (takenSet.has(`${base}_${suffix}`)) suffix++
  return `${base}_${suffix}`
}

/**
 * Walk a value tree and invoke visitor for every VariableRef found.
 * Path tracks the key path to the current node.
 */
export function walkVariableRefs(
  value: unknown,
  visitor: (ref: VariableRef, path: string[]) => void,
  path: string[] = [],
): void {
  if (isVariableRef(value)) {
    visitor(value, path)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      walkVariableRefs(item, visitor, [...path, String(i)]),
    )
    return
  }
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkVariableRefs(v, visitor, [...path, k])
    }
  }
}

/**
 * Replace all VariableRef markers in a value tree with their override values.
 * If no override exists for a variable, the marker's `defaultValue` is used.
 * If neither is available, returns undefined for that position.
 */
export function resolveVariableRefs(
  value: unknown,
  overrides: Readonly<Record<string, unknown>> = {},
): unknown {
  if (isVariableRef(value)) {
    if (Object.prototype.hasOwnProperty.call(overrides, value.$var)) {
      return overrides[value.$var]
    }
    return value.defaultValue
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveVariableRefs(item, overrides))
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveVariableRefs(v, overrides)
    }
    return out
  }
  return value
}
