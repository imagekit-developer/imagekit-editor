import { TRANSFORMATION_STATE_VERSION } from "../store"
import type { SaveTemplateInput } from "./types"

/**
 * Prepares the in-memory transformation tree for persistence:
 *
 * - **Strips runtime `id` fields** from every step (root + nested
 *   `children`). Ids are generated fresh on each load and are not part of
 *   the persisted contract; backends reject them as unknown properties.
 * - **Stamps `version: "v1"`** on every step that doesn't already carry one
 *   so persistence-side validators have an explicit schema marker for
 *   future migrations.
 *
 * Recurses into nested layer `children` so child layers receive the same
 * treatment as their parents.
 */
export function normalizeTransformationStepsForPersistence(
  transformations: SaveTemplateInput["transformations"],
): SaveTemplateInput["transformations"] {
  const stamp = <T extends { id?: string; version?: string; children?: T[] }>(
    step: T,
  ): T => {
    const { id: _id, children, ...rest } = step as T & { id?: string }
    return {
      ...(rest as T),
      version: step.version ?? TRANSFORMATION_STATE_VERSION,
      ...(children && children.length > 0
        ? { children: children.map(stamp) }
        : {}),
    }
  }
  return transformations.map(stamp) as SaveTemplateInput["transformations"]
}
