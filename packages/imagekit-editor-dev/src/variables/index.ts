/**
 * Template variable infrastructure.
 *
 * A "variable" is a named placeholder for a single field value inside a
 * transformation step. It is represented inline in the transformation tree
 * as a {@link VariableRef} marker, e.g.:
 *
 *   { text: { $var: "h_xyz", label: "Headline" }, fontSize: 32 }
 *
 * The marker is the source of truth — there is no separate `template.variables`
 * array. Helpers walk the tree to discover variables ({@link listVariables}),
 * substitute overrides at URL-build time ({@link resolveVariableRefs}), or
 * generate collision-proof names ({@link generateVariableName}).
 *
 * No default value is stored alongside the marker. When the host does not
 * provide an override for a variable, the URL builder substitutes the literal
 * token `$<name>` so the resulting URL clearly signals an unbound variable
 * (and the editor preview renders that token verbatim, making it obvious
 * which fields still need a runtime value).
 */

/**
 * Inline marker stored in place of a literal field value when that field is
 * declared as a template variable.
 *
 * `name` is a stable, collision-proof identifier (never re-used inside a
 * single template). `label` is the human-readable string the user typed in the
 * sidebar popover; it can change without breaking host code that references
 * the variable by `name`.
 */
export interface VariableRef {
  $var: string
  label: string
}

/** Type guard for {@link VariableRef} markers found inside a value tree. */
export function isVariableRef(value: unknown): value is VariableRef {
  if (value === null || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return typeof v.$var === "string" && typeof v.label === "string"
}

/**
 * Validate a candidate variable name. Names are intended to be stable
 * identifiers used in `overrides` payloads, so we keep them URL-safe and
 * predictable: lowercase letters, digits, underscores; cannot start with a
 * digit. The label is the user-facing string and has no such restrictions.
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-z_][a-z0-9_]*$/.test(name)
}

/**
 * Maximum length of a generated variable name. Long enough to keep the
 * slugified label readable, short enough to keep the editor chip + URL
 * compact and to leave room for collision suffixes (`_2`, `_3`, …).
 */
const MAX_VARIABLE_NAME_LENGTH = 32

/**
 * Slugify a label into a candidate variable name. Lowercases, replaces every
 * non-`[a-z0-9_]` run with `_`, trims leading/trailing underscores, prefixes
 * a digit-leading slug with `v_`, and truncates to {@link MAX_VARIABLE_NAME_LENGTH}
 * so the result always satisfies {@link isValidVariableName}.
 */
export function slugifyLabel(label: string): string {
  let slug = label
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
  if (!slug) slug = "var"
  if (/^\d/.test(slug)) slug = `v_${slug}`
  if (slug.length > MAX_VARIABLE_NAME_LENGTH) {
    slug = slug.slice(0, MAX_VARIABLE_NAME_LENGTH).replace(/_+$/, "")
  }
  return slug
}

/**
 * Generate a collision-proof variable name from a label, given the set of
 * names already taken in the current template. Suffixes `_2`, `_3`, … as
 * needed until a free slot is found.
 */
export function generateVariableName(
  label: string,
  taken: Iterable<string>,
): string {
  const takenSet = new Set(taken)
  const base = slugifyLabel(label)
  if (!takenSet.has(base)) return base
  let i = 2
  while (takenSet.has(`${base}_${i}`)) i += 1
  return `${base}_${i}`
}

/**
 * Walk a value tree and replace every {@link VariableRef} marker with the
 * concrete value the editor / SDK expects. Resolution per marker:
 *
 *   1. `overrides[ref.$var]` if present (host-supplied runtime value);
 *   2. otherwise the literal string `"$" + ref.$var` (a clear placeholder
 *      token in the resulting URL).
 *
 * The walk preserves arrays and plain objects, so marker-free trees are
 * structurally cloned with byte-equivalent output. This keeps legacy
 * (variable-free) templates regression-safe through the converter pipeline.
 */
export function resolveVariableRefs(
  value: unknown,
  overrides: Readonly<Record<string, unknown>> = {},
): unknown {
  if (isVariableRef(value)) {
    return Object.prototype.hasOwnProperty.call(overrides, value.$var)
      ? overrides[value.$var]
      : `$${value.$var}`
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

/**
 * Visit every {@link VariableRef} found anywhere inside `value` and invoke
 * `visitor` with the marker. Used by {@link listVariables} to discover the
 * variables declared by a template's transformation steps in document order.
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
