import {
  parseExpressionTokens,
  serializeExpressionTokens,
} from "../components/common/expressionTokens"
import { TRANSFORMATION_STATE_VERSION } from "../store"
import { deepMapStrings } from "../utils/deepMapStrings"
import type { SaveTemplateInput, TemplateVariable } from "./types"

/**
 * Prepares the in-memory transformation tree for persistence:
 *
 * - **Stamps `version: "v1"`** on every step that doesn't already carry one.
 * - **Normalizes expression tokens** in string fields when template variables
 *   are provided (converts rich-text tokens back to `{{variableId}}` braces).
 * - **Recurses into nested layer `children`** so child layers receive the same
 *   treatment as their parents.
 */
export function normalizeTransformationStepsForPersistence(
  transformations: SaveTemplateInput["transformations"],
  templateVariables?: TemplateVariable[],
): SaveTemplateInput["transformations"] {
  const stamp = (
    step: SaveTemplateInput["transformations"][number],
  ): SaveTemplateInput["transformations"][number] => {
    const value =
      templateVariables && templateVariables.length > 0
        ? deepMapStrings(step.value, (s) =>
            serializeExpressionTokens(
              parseExpressionTokens(s, templateVariables),
            ),
          )
        : step.value
    const children = (step as any).children
    return {
      ...step,
      value,
      version: step.version ?? TRANSFORMATION_STATE_VERSION,
      ...(children && (children as unknown[]).length > 0
        ? { children: (children as typeof transformations).map(stamp) }
        : {}),
    }
  }
  return transformations.map(stamp)
}
