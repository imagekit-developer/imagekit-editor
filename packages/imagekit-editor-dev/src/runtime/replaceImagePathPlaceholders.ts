import type { Transformation as IKTransformation } from "@imagekit/javascript"

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
