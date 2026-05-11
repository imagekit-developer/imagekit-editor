import type { Transformation as IKTransformation } from "@imagekit/javascript"
import {
  getDefaultTransformationFromMode,
  type TransformationField,
  transformationFormatters,
  transformationSchema,
} from "../schema"
import type { Transformation } from "../store"

export function buildIkTransformations(
  steps: Array<Omit<Transformation, "id">>,
): IKTransformation[] {
  return steps.map((transformation) => {
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

    // Ensure layer formatters run even when only nested children are present.
    // (Nested layers are stored in `transformation.children`, not in visible fields.)
    const hasChildren =
      Array.isArray((transformation as any).children) &&
      ((transformation as any).children as unknown[]).length > 0
    if (hasChildren) {
      const groupName =
        transformation.key === "layers-text"
          ? "textLayer"
          : transformation.key === "layers-image"
            ? "imageLayer"
            : transformation.key === "layers-canvas"
              ? "canvasLayer"
              : null
      if (groupName && !groupedTransforms[groupName]) {
        groupedTransforms[groupName] = {
          fields: [],
          transformationKey: groupName,
        }
      }
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

    // Append nested children into the parent overlay's transformation chain.
    // Each enabled child is recursively serialized and added as an inner
    // overlay step. Hidden children (enabled === false) are skipped.
    const childList = (transformation as any).children as
      | Transformation[]
      | undefined
    if (
      childList &&
      childList.length > 0 &&
      typeof (transforms as any).overlay === "object" &&
      (transforms as any).overlay !== null
    ) {
      const overlay = (transforms as any).overlay as Record<string, unknown>
      const innerTransformation: Record<string, unknown>[] = Array.isArray(
        overlay.transformation,
      )
        ? [...(overlay.transformation as Record<string, unknown>[])]
        : []
      for (const child of childList) {
        if ((child as Transformation).enabled === false) continue
        const childIK = buildIkTransformations([
          child as Omit<Transformation, "id">,
        ])[0]
        if (childIK && (childIK as any).overlay) {
          innerTransformation.push({ overlay: (childIK as any).overlay })
        }
      }
      if (innerTransformation.length > 0) {
        overlay.transformation = innerTransformation
      }
    }

    // Special handling for resize_and_crop transformation
    let defaultTransformation = t?.defaultTransformation || {}
    if (transformation.key === "resize_and_crop-resize_and_crop") {
      const value = transformation.value as Record<string, unknown>
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
  })
}
