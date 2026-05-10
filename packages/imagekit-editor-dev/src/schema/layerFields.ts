import type { PresetLayerType } from "../storage/presetTypes"
import {
  type TransformationField,
  type TransformationItem,
  transformationSchema,
} from "./index"

/**
 * Find the {@link TransformationItem} (schema + field list) for a layer key,
 * such as `"layers-text"` or `"layers-image"`. Returns `undefined` if no
 * matching item is registered in `transformationSchema`.
 */
export function getLayerTransformationItem(
  key: PresetLayerType | string,
): TransformationItem | undefined {
  for (const category of transformationSchema) {
    const match = category.items.find((item) => item.key === key)
    if (match) return match
  }
  return undefined
}

/**
 * Return the `transformations` field list configured for a given layer type
 * key. Used by the presets flow to drive default-value computation and to
 * iterate fields when applying a preset to an open form.
 */
export function getLayerFieldsByKey(
  key: PresetLayerType | string,
): TransformationField[] {
  return getLayerTransformationItem(key)?.transformations ?? []
}
