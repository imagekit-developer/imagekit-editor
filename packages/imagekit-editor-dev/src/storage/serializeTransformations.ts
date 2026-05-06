import { TRANSFORMATION_STATE_VERSION } from "../store"
import type { SaveTemplateInput } from "./types"

/** Ensures each step has `version: "v1"` for API / persistence validators. */
export function normalizeTransformationStepsForPersistence(
  transformations: SaveTemplateInput["transformations"],
): SaveTemplateInput["transformations"] {
  return transformations.map((step) => {
    const normalized = {
      ...step,
      version: step.version ?? TRANSFORMATION_STATE_VERSION,
    }
    // Strip empty params to keep stored data clean
    if (
      normalized.params &&
      Object.keys(normalized.params).length === 0
    ) {
      delete normalized.params
    }
    return normalized
  })
}
