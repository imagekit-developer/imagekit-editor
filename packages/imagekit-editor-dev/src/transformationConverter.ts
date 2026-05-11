import type { Transformation as IKTransformation } from "@imagekit/javascript"
import { buildIkTransformations } from "./runtime/buildIkTransformations"
import type { Transformation } from "./store"

/**
 * Converts a single editor `Transformation` (including any nested children)
 * into an ImageKit SDK `Transformation` object ready for use with `buildSrc`.
 *
 * Delegates to `buildIkTransformations` which handles all formatting logic
 * and recursive children serialization via the overlay transformation chain.
 */
export function convertTransformationToIK(
  transformation: Transformation,
  _ctx?: unknown,
): IKTransformation {
  return buildIkTransformations([transformation])[0] as IKTransformation
}
