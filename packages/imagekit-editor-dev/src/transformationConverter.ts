import {
  buildSrc,
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
 * Optional resolution context for the conversion API.
 *
 * `overrides` maps each variable name (the `$var` of a {@link VariableRef}
 * marker) to a runtime value. Markers without an override fall back to their
 * own embedded `default`. When omitted, every marker resolves to its default,
 * which is what the editor preview always uses.
 *
 * Marker-free trees are byte-equivalent through this pipeline: legacy
 * templates with no variables produce the exact same SDK output as before the
 * variables feature existed.
 */
export interface ConvertContext {
  overrides?: Readonly<Record<string, unknown>>
}

/**
 * Convert a single editor-stored `Transformation` (`type: "transformation"`,
 * with raw form-state in `value`) into the SDK-ready `IKTransformation` object
 * the ImageKit JS SDK accepts.
 *
 * This is the same logic used internally by the editor when computing previews,
 * extracted so external consumers (e.g. dashboards driving creative automation)
 * can serialize stored templates into URLs without depending on the editor's
 * Zustand store or React tree.
 */
export function convertTransformationToIK(
  transformation: Transformation,
  ctx: ConvertContext = {},
): IKTransformation {
  // Substitute every {$var} marker in the value tree before any field-level
  // logic runs. After this point the rest of the converter is identical to
  // the pre-variables behavior; trees with no markers pass through as a
  // structural clone, so legacy templates remain byte-equivalent.
  const resolvedValue = resolveVariableRefs(
    transformation.value,
    ctx.overrides ?? {},
  ) as IKTransformation

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
        transform.isVisible?.(resolvedValue as Record<string, unknown>) !==
          false
      ) {
        const value = (resolvedValue as Record<string, unknown>)[transform.name]
        if (value !== undefined && value !== "") {
          if (!groupedTransforms[transform.transformationGroup]) {
            groupedTransforms[transform.transformationGroup] = {
              fields: [],
              transformationKey: transform.transformationKey || transform.name,
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
    Object.entries(resolvedValue)
      .map(([key, value]) => {
        const transform = t?.transformations.find((field) => field.name === key)

        if (transform?.transformationGroup) {
          return []
        }

        if (
          transform?.isTransformation &&
          (transform.isVisible?.(resolvedValue as Record<string, unknown>) ??
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
    const value = resolvedValue as Record<string, unknown>
    // Only add crop/cropMode when both width and height and mode are set
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
 * Convert an array of editor `Transformation` steps into SDK-ready
 * `IKTransformation` objects. Steps that produce no SDK output are dropped.
 */
export function convertTransformationsToIK(
  transformations: Transformation[],
  ctx: ConvertContext = {},
): IKTransformation[] {
  const out: IKTransformation[] = []
  for (const t of transformations) {
    const converted = convertTransformationToIK(t, ctx)
    if (converted) out.push(converted)
  }
  return out
}

/**
 * Build a fully-formed ImageKit URL for the given source image and editor
 * transformation steps. Thin wrapper around the SDK's `buildSrc` that uses the
 * editor's own conversion logic, so the URL matches what the editor preview
 * would produce.
 */
export function buildImageKitUrl({
  src,
  urlEndpoint,
  transformations,
  overrides,
}: {
  src: string
  urlEndpoint: string
  transformations: Transformation[]
  overrides?: Readonly<Record<string, unknown>>
}): string {
  const ikTransformations = convertTransformationsToIK(transformations, {
    overrides,
  })
  if (ikTransformations.length === 0) return src
  return buildSrc({
    src,
    urlEndpoint,
    transformation: ikTransformations,
  })
}

/**
 * Convenience helper that returns just the `tr=...` style transformation
 * string (no URL) for the given editor steps.
 */
export function buildEditorTransformationString(
  transformations: Transformation[],
  ctx: ConvertContext = {},
): string {
  const ikTransformations = convertTransformationsToIK(transformations, ctx)
  return buildTransformationString(ikTransformations)
}
