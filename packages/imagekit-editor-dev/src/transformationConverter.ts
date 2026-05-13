/**
 * Transformation URL builder for templates with variable support.
 *
 * Takes the editor's Transformation[] and builds an ImageKit transformation
 * string, resolving any variable markers with the provided overrides.
 *
 * IMPORTANT: This module mirrors the schema-driven conversion used by the
 * live editor (`calculateImageList` in store.ts) so text overlay grouping,
 * layer chains, formatters, and default transformations all work identically.
 * Do not bypass the schema — empty form fields and grouped fields (e.g.
 * text overlays) require the formatters to produce valid ImageKit syntax
 * (`l-text:...:l-end` etc.).
 */

import {
  buildTransformationString,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import {
  getDefaultTransformationFromMode,
  type TransformationField,
  transformationFormatters,
  transformationSchema,
} from "./schema"
import type { Transformation } from "./store"
import { resolveVariableRefs } from "./variables"

/**
 * Convert a single editor Transformation into an IK transformation object,
 * applying schema formatters, grouped overlay/chain handling, and defaults.
 *
 * Mirrors the per-transformation logic inside `calculateImageList` in
 * store.ts. Both code paths must stay in sync; prefer calling this helper
 * over duplicating the conversion.
 */
export function convertEditorTransformationToIK(
  transformation: Transformation,
): IKTransformation {
  const t = transformationSchema
    .find((schema) => schema.key === transformation.key.split("-")[0])
    ?.items.find((item) => item.key === transformation.key)

  const groupedTransforms: Record<
    string,
    {
      fields: Array<{
        name: string
        value: unknown
        field: TransformationField
      }>
      transformationKey: string
    }
  > = {}

  if (t?.transformations) {
    t.transformations.forEach((transform) => {
      if (
        transform.transformationGroup &&
        transform.isVisible?.(
          transformation.value as Record<string, unknown>,
        ) !== false
      ) {
        const value = (transformation.value as Record<string, unknown>)[
          transform.name
        ]
        if (value !== undefined && value !== "") {
          if (!groupedTransforms[transform.transformationGroup]) {
            groupedTransforms[transform.transformationGroup] = {
              fields: [],
              transformationKey:
                transform.transformationKey || transform.name,
            }
          }
          groupedTransforms[transform.transformationGroup].fields.push({
            name: transform.name,
            value,
            field: transform,
          })
        }
      }
    })
  }

  const transforms: Record<string, unknown> = Object.fromEntries(
    Object.entries(transformation.value)
      .map(([key, value]) => {
        const transform = t?.transformations.find(
          (field) => field.name === key,
        )

        if (transform?.transformationGroup) {
          return []
        }

        if (
          transform?.isTransformation &&
          (transform.isVisible?.(
            transformation.value as Record<string, unknown>,
          ) ??
            true) &&
          value !== ""
        ) {
          return [transform.transformationKey ?? key, value]
        }
        return []
      })
      .filter((entry) => entry.length > 0),
  )

  for (const groupName in groupedTransforms) {
    const group = groupedTransforms[groupName]
    const formatter = transformationFormatters[groupName]

    if (formatter) {
      const groupValues = {} as Record<string, unknown>
      group.fields.forEach((f) => {
        groupValues[f.name] = f.value
      })

      formatter(groupValues, transforms)
    }
  }

  // Special handling for resize_and_crop transformation
  let defaultTransformation = t?.defaultTransformation || {}
  if (transformation.key === "resize_and_crop-resize_and_crop") {
    const value = transformation.value as Record<string, unknown>
    if (value.width && value.height && value.mode) {
      defaultTransformation = getDefaultTransformationFromMode(
        value.mode as string,
      )
    } else {
      defaultTransformation = {}
    }
  }

  return {
    ...defaultTransformation,
    ...transforms,
  } as IKTransformation
}

/**
 * Convert an array of editor Transformations to IKTransformations.
 * Optionally filter by a visibility map (transformation.id -> boolean).
 * If no visibility map is provided, transformations with `enabled === false`
 * are filtered out.
 */
export function convertEditorTransformationsToIK(
  transformations: Transformation[],
  options?: {
    visibleTransformations?: Record<string, boolean>
  },
): IKTransformation[] {
  const visible = options?.visibleTransformations
  return transformations
    .filter((t) => {
      if (visible) return visible[t.id]
      return t.enabled !== false
    })
    .map((t) => convertEditorTransformationToIK(t))
}

/**
 * Build an ImageKit transformation string from editor transformations,
 * optionally substituting variable overrides.
 *
 * This mirrors the live editor's flow exactly (`calculateImageList` in
 * store.ts) with a single drop-in step inserted: `VariableRef` markers in
 * each transformation's `value` tree are resolved against the supplied
 * overrides (falling back to each ref's `defaultValue`) BEFORE the unchanged
 * schema-driven converter runs. The schema's own per-field empty-string
 * filtering, group formatters, layer chains, and defaults remain in charge
 * of producing valid ImageKit syntax — we do not prune or rewrite values
 * here.
 */
export function buildEditorTransformationString(
  transformations: Transformation[],
  options?: { overrides?: Readonly<Record<string, unknown>> },
): string {
  const overrides = options?.overrides || {}

  const resolved: Transformation[] = transformations.map((t) => ({
    ...t,
    value: (resolveVariableRefs(t.value, overrides) ?? {}) as IKTransformation,
  }))

  const ikTransformations = convertEditorTransformationsToIK(resolved)

  if (ikTransformations.length === 0) return ""

  try {
    return buildTransformationString(ikTransformations)
  } catch {
    return ""
  }
}

/**
 * Build a full ImageKit URL for a template with overrides.
 */
export function buildImageKitUrl(
  imagekitId: string,
  path: string,
  transformations: Transformation[],
  overrides?: Readonly<Record<string, unknown>>,
): string {
  const tr = buildEditorTransformationString(transformations, { overrides })
  const base = `https://ik.imagekit.io/${imagekitId}/${path.replace(/^\//, "")}`
  return tr ? `${base}?tr=${tr}` : base
}
