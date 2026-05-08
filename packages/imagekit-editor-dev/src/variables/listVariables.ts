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

import {
  type TransformationField,
  transformationSchema,
} from "../schema"
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
  const item = transformationSchema
    .find((schema) => schema.key === transformation.key.split("-")[0])
    ?.items.find((entry) => entry.key === transformation.key)
  return item?.transformations.find((f) => f.name === fieldName)
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
  for (const t of transformations) {
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
        transformationId: t.id,
        fieldName,
        field,
      })
    })
  }
  return out
}
