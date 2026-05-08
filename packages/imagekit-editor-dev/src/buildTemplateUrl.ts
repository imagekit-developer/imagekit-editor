import {
  buildSrc,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import {
  getDefaultTransformationFromMode,
  transformationFormatters,
  transformationSchema,
} from "./schema"
import type { CanvasState, Transformation } from "./store"
import { CANVAS_IMAGE_PATH, DEFAULT_CANVAS } from "./store"
import { extractImagePath } from "./utils"
import { resolveTemplateParams } from "./utils/params"

/**
 * Converts a single editor transformation step into an IKTransformation object
 * by looking up the schema definition and applying formatters.
 */
export function resolveTransformationStep(
  transformation: Omit<Transformation, "id">,
): IKTransformation {
  const schemaItem = transformationSchema
    .find((schema) => schema.key === transformation.key.split("-")[0])
    ?.items.find((item) => item.key === transformation.key)

  const groupedTransforms: Record<
    string,
    {
      fields: Array<{ name: string; value: unknown }>
      transformationKey: string
    }
  > = {}

  if (schemaItem?.transformations) {
    for (const field of schemaItem.transformations) {
      if (
        field.transformationGroup &&
        field.isVisible?.(
          transformation.value as Record<string, unknown>,
        ) !== false
      ) {
        const value = (transformation.value as Record<string, unknown>)[
          field.name
        ]
        if (value !== undefined && value !== "") {
          if (!groupedTransforms[field.transformationGroup]) {
            groupedTransforms[field.transformationGroup] = {
              fields: [],
              transformationKey: field.transformationKey || field.name,
            }
          }
          groupedTransforms[field.transformationGroup].fields.push({
            name: field.name,
            value,
          })
        }
      }
    }
  }

  const transforms: Record<string, unknown> = Object.fromEntries(
    Object.entries(transformation.value)
      .map(([key, value]) => {
        const field = schemaItem?.transformations.find(
          (f) => f.name === key,
        )

        if (field?.transformationGroup) return []

        if (
          field?.isTransformation &&
          (field.isVisible?.(
            transformation.value as Record<string, unknown>,
          ) ?? true) &&
          value !== ""
        ) {
          return [field.transformationKey ?? key, value]
        }
        return []
      })
      .filter((entry) => entry.length > 0),
  )

  for (const groupName in groupedTransforms) {
    const group = groupedTransforms[groupName]
    const formatter = transformationFormatters[groupName]

    if (formatter) {
      const groupValues: Record<string, unknown> = {}
      for (const f of group.fields) {
        groupValues[f.name] = f.value
      }
      formatter(groupValues, transforms)
    }
  }

  let defaultTransformation = schemaItem?.defaultTransformation || {}
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
  }
}

/**
 * Replaces `__IMAGE_PATH__` placeholders in `raw` transformation strings
 * with the actual image path. Used for gradient backgrounds.
 */
export function replaceImagePathPlaceholders(
  transformations: IKTransformation[],
  imagePath: string,
): IKTransformation[] {
  return transformations.map((transformation) => {
    const cloned = { ...transformation }
    if (
      typeof cloned.raw === "string" &&
      cloned.raw.includes("__IMAGE_PATH__")
    ) {
      cloned.raw = cloned.raw.replace(/__IMAGE_PATH__/g, imagePath)
    }
    return cloned
  })
}

/**
 * Resolves a persisted template into an array of ImageKit transformation objects.
 *
 * Applies parameter overrides, filters disabled steps, and processes all
 * schema-level formatting. The returned array can be passed directly to
 * `buildSrc` from `@imagekit/javascript`.
 *
 * Canvas steps (key `"canvas"`) at position 0 are automatically stripped
 * since they are metadata, not image transformations.
 *
 * Note: The returned transformations may contain `__IMAGE_PATH__` placeholders
 * used by gradient backgrounds. Use {@link buildTemplateUrl} for fully resolved URLs.
 */
export function resolveTemplate(
  template: Omit<Transformation, "id">[],
  paramValues?: Record<string, unknown>,
): IKTransformation[] {
  let steps = template
  if (template.length > 0 && template[0].key === "canvas") {
    steps = template.slice(1)
  }

  const resolved = paramValues
    ? resolveTemplateParams(steps, paramValues)
    : steps

  return resolved
    .filter((t) => t.enabled !== false)
    .map(resolveTransformationStep)
}

export interface BuildTemplateUrlOptions {
  /** Persisted template steps (as returned by `getTransformationsForPersistence`) */
  template: Omit<Transformation, "id">[]
  /** Image URLs to apply the template to */
  images: string[]
  /** Values for template parameters (overrides for param-bound fields) */
  paramValues?: Record<string, unknown>
}

/**
 * Builds transformed image URLs by applying a persisted template to a list of images.
 *
 * Handles both image-mode and canvas-mode templates, applies parameter overrides,
 * and resolves all transformation steps through the schema pipeline.
 *
 * @example
 * ```ts
 * import { buildTemplateUrl } from "@imagekit/editor"
 *
 * const urls = buildTemplateUrl({
 *   template: savedTemplate,
 *   images: ["https://ik.imagekit.io/demo/sample.jpg"],
 *   paramValues: { hero_blur: 10 },
 * })
 * ```
 */
export function buildTemplateUrl(options: BuildTemplateUrlOptions): string[] {
  const { template, images, paramValues } = options

  let canvas: CanvasState | null = null
  let transformationSteps = template
  if (template.length > 0 && template[0].key === "canvas") {
    const val = template[0].value as Record<string, unknown>
    canvas = {
      width: (val.width as number) ?? DEFAULT_CANVAS.width,
      height: (val.height as number) ?? DEFAULT_CANVAS.height,
      color: (val.color as string) ?? DEFAULT_CANVAS.color,
    }
    transformationSteps = template.slice(1)
  }

  const ikTransformations = resolveTemplate(transformationSteps, paramValues)

  // Canvas mode: generate a single URL from the canvas path
  if (canvas && images.length === 0) {
    const canvasOverlay: IKTransformation = {
      overlay: {
        type: "solidColor",
        color: canvas.color.replace(/^#/, ""),
        transformation: [
          { width: canvas.width, height: canvas.height },
          ...ikTransformations,
        ],
      },
    }
    return [
      buildSrc({
        src: CANVAS_IMAGE_PATH,
        urlEndpoint: "https://ik.imagekit.io/customeraccountdemo/",
        transformation: [canvasOverlay],
      }),
    ]
  }

  return images.map((imageUrl) => {
    if (ikTransformations.length === 0) return imageUrl

    const imagePath = extractImagePath(imageUrl)
    const resolved = replaceImagePathPlaceholders(ikTransformations, imagePath)

    return buildSrc({
      src: imageUrl,
      urlEndpoint: "does-not-matter",
      transformation: resolved,
    })
  })
}
