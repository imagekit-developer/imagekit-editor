import {
  parseExpressionTokens,
  serializeExpressionTokens,
} from "../components/common/expressionTokens"
import { TRANSFORMATION_STATE_VERSION } from "../store"
import { deepMapStrings } from "../utils/deepMapStrings"
import type { SaveTemplateInput, TemplateVariable } from "./types"

/** Ensures each step has `version: "v1"` and canonical `{{variableId}}` braces in string fields. */
export function normalizeTransformationStepsForPersistence(
  transformations: SaveTemplateInput["transformations"],
  templateVariables?: TemplateVariable[],
): SaveTemplateInput["transformations"] {
  return transformations.map((step) => {
    const value =
      templateVariables && templateVariables.length > 0
        ? deepMapStrings(step.value, (s) =>
            serializeExpressionTokens(
              parseExpressionTokens(s, templateVariables),
            ),
          )
        : step.value
    return {
      ...step,
      value,
      version: step.version ?? TRANSFORMATION_STATE_VERSION,
    }
  })
}
