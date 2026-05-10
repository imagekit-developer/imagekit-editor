/**
 * Transformation URL builder for templates with variable support.
 *
 * Takes the editor's Transformation[] and builds an ImageKit transformation
 * string, resolving any variable markers with the provided overrides.
 */

import {
  buildTransformationString,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import type { Transformation } from "./store"
import { resolveVariableRefs } from "./variables"

/**
 * Build an ImageKit transformation string from editor transformations,
 * optionally substituting variable overrides.
 */
export function buildEditorTransformationString(
  transformations: Transformation[],
  options?: { overrides?: Readonly<Record<string, unknown>> },
): string {
  const overrides = options?.overrides || {}

  const ikTransformations: IKTransformation[] = transformations
    .filter((t) => t.enabled !== false)
    .map((t) => {
      const resolved = resolveVariableRefs(t.value, overrides) as IKTransformation
      return resolved
    })
    .filter(Boolean)

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
