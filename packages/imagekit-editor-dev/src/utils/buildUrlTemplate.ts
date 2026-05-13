import {
  buildTransformationString,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import {
  getDefaultTransformationFromMode,
  type TransformationField,
  transformationFormatters,
  transformationSchema,
} from "../schema"
import type { Transformation } from "../store"
import type { DynamicVariableDefinition } from "../variables/types"

/**
 * Resolves transformation values, but keeps `{{variableName}}` tokens intact
 * so the resulting URL acts as a template string.
 */
function resolveKeepingPlaceholders(
  value: Record<string, unknown>,
  _variables: DynamicVariableDefinition[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string" && /\{\{\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\}\}/.test(val)) {
      // Keep the {{token}} as-is — the consumer will replace it
      result[key] = val
    } else {
      result[key] = val
    }
  }
  return result
}

/**
 * Builds a URL-ready transformation string from editor transformations,
 * preserving `{{variableName}}` placeholders instead of resolving them.
 *
 * Returns the `tr=...` query value (e.g. `w-{{width}},h-300,f-auto`),
 * or an empty string when there are no visible transformations.
 */
export function buildUrlTemplate(
  transformations: Array<Omit<Transformation, "id"> | Transformation>,
  visibleTransformations: Record<string, boolean>,
  variables: DynamicVariableDefinition[],
): string {
  const IKTransformations = transformations
    .filter((transformation) => {
      if ("id" in transformation) {
        return visibleTransformations[transformation.id]
      }
      return true
    })
    .map((transformation) => {
      const t = transformationSchema
        .find((schema) => schema.key === transformation.key.split("-")[0])
        ?.items.find((item) => item.key === transformation.key)

      const resolvedValue = resolveKeepingPlaceholders(
        transformation.value as Record<string, unknown>,
        variables,
      )

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
            transform.isVisible?.(resolvedValue) !== false
          ) {
            const value = resolvedValue[transform.name]
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
        Object.entries(resolvedValue)
          .map(([key, value]) => {
            const transform = t?.transformations.find(
              (field) => field.name === key,
            )

            if (transform?.transformationGroup) {
              return []
            }

            if (
              transform?.isTransformation &&
              (transform.isVisible?.(resolvedValue) ?? true) &&
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
        const value = resolvedValue
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
      }
    })

  if (IKTransformations.length === 0) return ""

  return buildTransformationString(
    IKTransformations as IKTransformation[],
  )
}
