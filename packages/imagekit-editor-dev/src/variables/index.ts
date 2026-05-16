/**
 * Template variable infrastructure.
 *
 * A "variable" is a named placeholder for a single field value inside a
 * transformation step. It is represented inline in the transformation tree
 * as a {@link VariableRef} marker, e.g.:
 *
 *   { text: { $var: "h_xyz", label: "Headline", defaultValue: "Hello World", description: "Main heading text" }, fontSize: 32 }
 *
 * The marker is the source of truth — there is no separate `template.variables`
 * array. Helpers walk the tree to discover variables ({@link listVariables}),
 * substitute overrides at URL-build time ({@link resolveVariableRefs}), or
 * generate collision-proof names ({@link generateVariableName}).
 *
 * The defaultValue is used when the host does not provide an override for a
 * variable. The description is an optional field to document what the variable
 * controls.
 */

/**
 * Inline marker stored in place of a literal field value when that field is
 * declared as a template variable.
 *
 * `name` is a stable, collision-proof identifier (never re-used inside a
 * single template). `label` is the human-readable string the user typed in the
 * sidebar popover; it can change without breaking host code that references
 * the variable by `name`. `defaultValue` is the fallback value used when the
 * host does not provide an override; for backward compatibility with older
 * templates created before the defaultValue feature, it may be omitted (in
 * which case `resolveVariableRefs` falls back to `undefined`). `description`
 * is an optional explanatory note about what the variable controls.
 */
export interface VariableRef {
  $var: string
  label: string
  defaultValue?: unknown
  description?: string
}

/**
 * Type guard for {@link VariableRef} markers found inside a value tree.
 *
 * Only requires `$var` and `label` so that templates persisted before the
 * `defaultValue` field was introduced continue to be recognized as variables.
 */
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
 *   2. otherwise `ref.defaultValue` — the fallback value specified when the
 *      variable was created. This ensures that the editor preview always
 *      displays a meaningful value even when no override is provided.
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
    return Object.hasOwn(overrides, value.$var)
      ? overrides[value.$var]
      : value.defaultValue
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

/**
 * Walk a transformation tree (a node and any nested children) and collect
 * every `$var` name found in any marker. Internal to {@link dedupeVariableMarkersInList}.
 */
function collectVariableNames<T extends { value: unknown; children?: T[] }>(
  list: T[],
): Set<string> {
  const out = new Set<string>()
  const visit = (nodes: T[]): void => {
    for (const n of nodes) {
      walkVariableRefs(n.value, (ref) => {
        out.add(ref.$var)
      })
      if (n.children && n.children.length > 0) visit(n.children)
    }
  }
  visit(list)
  return out
}

/**
 * Deep-clone a transformation node (and its nested children, if any),
 * giving every variable marker a collision-proof `$var` name against
 * `existingNames`. Markers that already have a unique name are kept
 * unchanged; only colliding ones are renamed via {@link generateVariableName}.
 *
 * Within the cloned subtree, repeated occurrences of the same input `$var`
 * remain consistent — they all map to the same renamed name — so a variable
 * deliberately bound to multiple fields inside a single step (or across a
 * step and its nested children) survives intra-subtree sharing.
 *
 * Internal to {@link dedupeVariableMarkersInList}; generic over node shape
 * to avoid a `store ↔ variables` import cycle.
 */
function dedupeVariableMarkers<T extends { value: unknown; children?: T[] }>(
  node: T,
  existingNames: Iterable<string>,
): T {
  const taken = new Set(existingNames)
  const renames = new Map<string, string>()

  const remap = (v: unknown): unknown => {
    if (isVariableRef(v)) {
      let next = renames.get(v.$var)
      if (!next) {
        if (!taken.has(v.$var)) {
          // First time we see this `$var` and it's free — keep it as-is.
          next = v.$var
        } else {
          // Collides with something already in the tree (or a previously
          // renamed marker in this same pass). Mint a fresh name.
          next = generateVariableName(v.label, taken)
        }
        taken.add(next)
        renames.set(v.$var, next)
      }
      return next === v.$var ? v : { ...v, $var: next }
    }
    if (Array.isArray(v)) return v.map(remap)
    if (v !== null && typeof v === "object") {
      const out: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        out[k] = remap(val)
      }
      return out
    }
    return v
  }

  const cloneNode = (n: T): T => ({
    ...n,
    value: remap(n.value),
    ...(n.children ? { children: n.children.map(cloneNode) } : {}),
  })

  return cloneNode(node)
}

/**
 * Deep-clone an array of transformation nodes (root steps + any nested
 * children) and rewrite their variable markers so the result has a globally
 * unique `$var` namespace. The first occurrence of a name is preserved; any
 * later collision (sibling step, nested child) is renamed via
 * {@link generateVariableName}. Within a single step, repeated occurrences of
 * the same input `$var` map to the same renamed name, preserving intentional
 * intra-step sharing across multiple fields.
 *
 * Used at the save boundary so the persisted JSON's variable namespace is
 * always globally unique no matter how the in-memory tree was built
 * (duplicated step, programmatic add, paste/import, etc.).
 */
export function dedupeVariableMarkersInList<
  T extends { value: unknown; children?: T[] },
>(list: T[], existingNames: Iterable<string> = []): T[] {
  const taken = new Set(existingNames)
  const out: T[] = []
  for (const node of list) {
    const safe = dedupeVariableMarkers(node, taken)
    for (const name of collectVariableNames([safe])) taken.add(name)
    out.push(safe)
  }
  return out
}
