/**
 * Public helpers for working with template variables on the host side
 * (creative automation workflows, override grids, etc.).
 *
 * These functions never mutate state and never depend on the editor's React
 * tree or Zustand store. They walk the transformation array directly, which
 * is the source of truth: variables are stored as inline `{$var: ...}`
 * markers in field values, not in a sidecar list.
 *
 * The companion {@link VariableField} component (in
 * `./components/variableField`) renders the same input control the editor
 * shows for the field a variable is bound to, so host validation and host UX
 * are bit-identical to the editor's. That symmetry is the whole point of
 * templating: an override entered by the host must produce the same result
 * the editor previews.
 */

import { z } from "zod"
import { type TransformationField, transformationSchema } from "../schema"
import type { Transformation } from "../store"
import { type VariableRef, walkVariableRefs } from "../variables"

/**
 * One entry per `{$var}` marker found in the template. Returned in document
 * order — top-to-bottom traversal of the transformation steps and their
 * fields — so spreadsheet columns line up with the visual order in the
 * editor.
 *
 * Includes everything a host needs to render an override input:
 *   - `name` / `label` for identity and presentation;
 *   - `transformationId` + `fieldName` to locate the originating field;
 *   - `field` (the resolved {@link TransformationField} from the schema)
 *     so the host can drive {@link VariableField} or its own renderer.
 */
export interface VariableDescriptor {
  name: string
  label: string
  /** Inline default carried by the marker; may be undefined for legacy refs. */
  defaultValue?: unknown
  /** Optional human note about what the variable controls. */
  description?: string
  transformationId: string
  fieldName: string
  field: TransformationField
}

/**
 * Look up the {@link TransformationField} schema entry for a given step and
 * field name. Returns `undefined` if the step's `key` is not in the schema or
 * the named field does not exist on it.
 */
export function findTransformationField(
  transformation: Transformation,
  fieldName: string,
): TransformationField | undefined {
  const item = findStepSchemaItem(transformation)
  return item?.transformations.find((f) => f.name === fieldName)
}

/**
 * Resolve the full schema entry (containing the step's Zod object schema)
 * for a transformation step purely from its `key` — no dependency on the
 * runtime `id`, which is optional on persisted templates.
 */
function findStepSchemaItem(transformation: Transformation) {
  return transformationSchema
    .find((schema) => schema.key === transformation.key.split("-")[0])
    ?.items.find((entry) => entry.key === transformation.key)
}

/**
 * Walk all transformation steps and return descriptors for every variable
 * referenced anywhere inside their values, in document order.
 *
 * Two same-named variables in different fields are NOT possible by
 * construction: the create flow generates collision-proof names per template.
 * If the host nonetheless ends up with duplicates (e.g. a hand-written
 * payload), the first occurrence wins so override keying remains
 * deterministic.
 */
export function listVariables(
  transformations: Transformation[],
): VariableDescriptor[] {
  const seen = new Set<string>()
  const out: VariableDescriptor[] = []
  // Recurse so variables bound on nested layer children (image/canvas
  // layers may host nested text/image/canvas children) are surfaced
  // alongside top-level variables. Order = depth-first, document order.
  const visit = (list: Transformation[]): void => {
    for (const t of list) {
      walkVariableRefs(t.value, (ref: VariableRef, path: string[]) => {
        if (seen.has(ref.$var)) return
        // The first path segment is always the field name on the step's value
        // object; nested markers (inside composite fields like padding-input)
        // share that top-level key, which is what we use to match against the
        // step's schema entry.
        const fieldName = path[0]
        const field = fieldName
          ? findTransformationField(t, fieldName)
          : undefined
        if (!field) return
        seen.add(ref.$var)
        out.push({
          name: ref.$var,
          label: ref.label,
          defaultValue: ref.defaultValue,
          description: ref.description,
          transformationId: t.id,
          fieldName,
          field,
        })
      })
      if (t.children && t.children.length > 0) {
        visit(t.children)
      }
    }
  }
  visit(transformations)
  return out
}

/**
 * Build a Zod schema that validates the `overrides` object for a template.
 *
 * Each variable becomes one optional key in the returned `z.object`, typed
 * with the same Zod type the editor uses for that field. This means:
 *
 *   - Hosts can validate overrides before calling `buildImageKitUrl`.
 *   - `z.infer<typeof schema>` gives a typed `overrides` map for TypeScript
 *     consumers.
 *   - Hosts using `zod-to-json-schema` (or similar) get a JSON Schema for
 *     free, e.g. for OpenAPI spec generation or server-side validation.
 *
 * Fields whose Zod type cannot be resolved (unknown step key, missing field)
 * fall back to `z.unknown()` so the schema is always complete.
 *
 * @example
 * ```ts
 * const schema = buildVariablesSchema(template.transformations)
 * const result = schema.safeParse(overrides)
 * if (!result.success) console.error(result.error.flatten())
 * ```
 */
/**
 * Unwrap a Zod schema until we hit the underlying `ZodObject`, peeling off
 * any `ZodEffects` (`.refine` / `.superRefine` / `.transform`),
 * `ZodOptional`, `ZodNullable`, and `ZodDefault` wrappers along the way.
 *
 * Step schemas in this codebase are commonly built like:
 *
 * ```ts
 * z.object({...}).superRefine(...).refine(...)
 * ```
 *
 * which yields a `ZodEffects` at the top level. Naively reading `.shape`
 * on that returns `undefined` because only `ZodObject` exposes `shape`.
 * Unwrapping is safe: every wrapper here is a transparent decorator over
 * the same inner object schema, so the field types we want to surface
 * are unchanged.
 */
function unwrapToZodObject(
  schema: z.ZodTypeAny,
): z.ZodObject<Record<string, z.ZodTypeAny>> | undefined {
  let current: z.ZodTypeAny = schema
  // Bound the loop defensively in case of unforeseen wrapping; real schemas
  // nest at most 2–3 levels deep.
  for (let i = 0; i < 10; i++) {
    if (current instanceof z.ZodObject) {
      return current as z.ZodObject<Record<string, z.ZodTypeAny>>
    }
    if (current instanceof z.ZodEffects) {
      current = current.innerType()
      continue
    }
    if (
      current instanceof z.ZodOptional ||
      current instanceof z.ZodNullable ||
      current instanceof z.ZodDefault
    ) {
      current = current._def.innerType
      continue
    }
    return undefined
  }
  return undefined
}

export function buildVariablesSchema(
  transformations: Transformation[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  const seen = new Set<string>()

  // Walk transformations directly so each variable is resolved against the
  // schema of the step that actually owns it. Resolving by `transformation.id`
  // is unsafe: persisted templates routinely have `id === undefined` on every
  // step, and `undefined === undefined` matching collapses to "first step
  // with this key", which silently mis-routes to the wrong schema.
  //
  // Also recurses into nested layer `children` so variables bound on nested
  // text/image/canvas layers are surfaced — they participate in URL building
  // via `resolveVariableRefs`, so they must also appear in host validation.
  const visit = (list: Transformation[]): void => {
    for (const t of list) {
      const stepItem = findStepSchemaItem(t)
      const objectSchema = stepItem
        ? unwrapToZodObject(stepItem.schema)
        : undefined

      walkVariableRefs(t.value, (ref: VariableRef, path: string[]) => {
        if (seen.has(ref.$var)) return
        const fieldName = path[0]
        if (!fieldName) return

        const fieldType = objectSchema?.shape[fieldName]
        if (!fieldType) {
          // Fail-loud in dev: a variable that can't be resolved against a real
          // field would otherwise be silently accepted by `safeParse`, which
          // defeats the purpose of the helper. We still skip adding a key so
          // hosts get a strict schema (unknown keys passed by `safeParse` will
          // be ignored, not blanket-accepted).
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[imagekit-editor] buildVariablesSchema: could not resolve Zod type for variable "${ref.$var}" (step key "${t.key}", field "${fieldName}"). Variable omitted from schema.`,
            )
          }
          return
        }

        seen.add(ref.$var)
        // All overrides are optional — a host may supply only a subset.
        shape[ref.$var] = fieldType.optional()
      })

      if (t.children && t.children.length > 0) {
        visit(t.children)
      }
    }
  }
  visit(transformations)

  return z.object(shape)
}
