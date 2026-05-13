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
} from "../../schema"
import { extractImagePath } from "../../utils"
import type {
  FileElement,
  Signer,
  SignerRequest,
  Transformation,
} from "../types"

export function replaceImagePathPlaceholders(
  transformations: IKTransformation[],
  imagePath: string,
): IKTransformation[] {
  return transformations.map((transformation) => {
    const clonedTransformation = { ...transformation }

    if (
      typeof clonedTransformation.raw === "string" &&
      clonedTransformation.raw.includes("__IMAGE_PATH__")
    ) {
      clonedTransformation.raw = clonedTransformation.raw.replace(
        /__IMAGE_PATH__/g,
        imagePath,
      )
    }

    return clonedTransformation
  })
}

export function calculateImageList(
  imageList: FileElement[],
  transformations: Transformation[],
  visibleTransformations: Record<string, boolean>,
  showOriginal: boolean,
  signer: Signer | undefined,
  activeImageIndex: number,
  signedUrlCache: Record<string, string>,
) {
  const IKTransformations = transformations
    .filter((transformation) => visibleTransformations[transformation.id])
    .map((transformation) => {
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
      }
    })

  const transformKey = showOriginal
    ? "original"
    : JSON.stringify(IKTransformations)

  const imgs: string[] = []
  const toSign: Array<{
    index: number
    request: SignerRequest
    cacheKey: string
  }> = []

  imageList.forEach((img, index) => {
    // Replace any __IMAGE_PATH__ placeholders with actual image path for this specific image
    const imagePath = extractImagePath(img.url)
    const transformationsForImage = showOriginal
      ? []
      : replaceImagePathPlaceholders(IKTransformations, imagePath)

    const req = {
      url: img.url,
      transformation: transformationsForImage,
      metadata: img.metadata,
    }

    if (req.transformation.length === 0) {
      imgs[index] = req.url
      return
    }

    if (req.metadata.requireSignedUrl && signer) {
      const imageTransformKey = JSON.stringify(req.transformation)
      const cacheKey = `${req.url}::${imageTransformKey}`
      const cached = signedUrlCache[cacheKey]
      if (cached) {
        imgs[index] = cached
      } else {
        imgs[index] = req.url
        toSign.push({
          index,
          request: {
            ...req,
            transformation: buildTransformationString(req.transformation),
          },
          cacheKey,
        })
      }
      return
    }

    imgs[index] = buildSrc({
      src: req.url,
      urlEndpoint: "does-not-matter",
      transformation: req.transformation,
    })
  })

  return { imgs, activeImageIndex, toSign, transformKey }
}
