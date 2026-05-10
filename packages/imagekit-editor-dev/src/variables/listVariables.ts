/**
 * List all variables found in a template's transformations array.
 * Returns them in document order (top-to-bottom traversal).
 */

import type { TransformationField } from "../schema"
import type { Transformation } from "../store"
import { type VariableRef, walkVariableRefs } from "./index"
import { transformationSchema } from "../schema"

/**
 * Descriptor for a single template variable found in the transformation tree.
 */
export interface VariableDescriptor {
  name: string
  label: string
  transformationId: string
  fieldName: string
  field: TransformationField | undefined
}

/**
 * Look up the schema field definition for a transformation step and field name.
 */
export function findFieldSchema(
  transformation: Transformation,
  fieldName: string,
): TransformationField | undefined {
  const baseKey = transformation.key.split("-")[0]
  const category = transformationSchema.find((s) => s.key === baseKey)
  const item = category?.items.find((entry) => entry.key === transformation.key)
  return item?.transformations.find((f) => f.name === fieldName)
}

/**
 * Walk all transformation steps and collect variable descriptors.
 * Deduplicates by variable name — first occurrence wins.
 */
export function listVariables(
  transformations: Transformation[],
): VariableDescriptor[] {
  const seen = new Set<string>()
  const out: VariableDescriptor[] = []

  function walkStep(t: Transformation) {
    walkVariableRefs(t.value, (ref: VariableRef, path: string[]) => {
      if (seen.has(ref.$var)) return
      const fieldName = path[0]
      const field = fieldName ? findFieldSchema(t, fieldName) : undefined
      seen.add(ref.$var)
      out.push({
        name: ref.$var,
        label: ref.label,
        transformationId: t.id,
        fieldName: fieldName || "",
        field,
      })
    })
  }

  for (const t of transformations) {
    walkStep(t)
    // Handle nested children (layer transformations)
    if (t.value && typeof t.value === "object" && "children" in t.value) {
      const children = (t.value as any).children
      if (Array.isArray(children)) {
        for (const child of children) {
          if (child && typeof child === "object" && "id" in child) {
            walkStep(child as Transformation)
          }
        }
      }
    }
  }

  return out
}
