import type { FileElement, InputFileElement, RequiredMetadata } from "../types"

export function normalizeImage<
  Metadata extends RequiredMetadata = RequiredMetadata,
>(image: string | InputFileElement<Metadata>): FileElement<Metadata> {
  if (typeof image === "string") {
    return {
      url: image,
      metadata: { requireSignedUrl: false } as Metadata,
      imageDimensions: null,
    }
  }
  return {
    url: image.url,
    metadata: image.metadata
      ? {
          ...image.metadata,
          requireSignedUrl: image.metadata.requireSignedUrl ?? false,
        }
      : ({ requireSignedUrl: false } as Metadata),
    imageDimensions: null,
  }
}
