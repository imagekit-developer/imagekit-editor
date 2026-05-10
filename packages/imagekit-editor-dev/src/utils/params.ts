import type { Transformation } from "../store"

const VARIABLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/
const MAX_VARIABLE_NAME_LENGTH = 40

/**
 * Matches inline variable markers of the form `{{variable_name}}` embedded
 * inside a string field value. The captured group is the variable name and
 * follows the same rules as `VARIABLE_NAME_REGEX`.
 */
export const INLINE_VARIABLE_REGEX = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g

/**
 * Extracts unique inline variable names from a string value, in the order
 * they first appear.
 */
export function extractInlineVariables(value: string): string[] {
  const seen: Record<string, true> = {}
  const result: string[] = []
  // Use a fresh regex instance to avoid sharing `lastIndex` state.
  const re = new RegExp(INLINE_VARIABLE_REGEX.source, "g")
  let match: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: standard exec loop
  while ((match = re.exec(value)) !== null) {
    const name = match[1]
    if (!seen[name]) {
      seen[name] = true
      result.push(name)
    }
  }
  return result
}

/**
 * Substitutes `{{variable_name}}` markers in a string with values from the
 * override map. Markers without an override are left intact.
 */
function substituteInlineVariables(
  value: string,
  paramValues: Record<string, unknown>,
): string {
  return value.replace(INLINE_VARIABLE_REGEX, (marker, name) => {
    if (name in paramValues) {
      const v = paramValues[name]
      return v == null ? "" : String(v)
    }
    return marker
  })
}

/**
 * Validates the format of a variable name.
 * Must start with a letter, contain only alphanumeric + underscores, max 40 chars.
 */
export function validateVariableName(name: string): {
  valid: boolean
  error?: string
} {
  if (!name) {
    return { valid: false, error: "Variable name is required." }
  }
  if (name.length > MAX_VARIABLE_NAME_LENGTH) {
    return {
      valid: false,
      error: `Variable name must be ${MAX_VARIABLE_NAME_LENGTH} characters or fewer.`,
    }
  }
  if (!VARIABLE_NAME_REGEX.test(name)) {
    return {
      valid: false,
      error:
        "Must start with a letter and contain only letters, numbers, or underscores.",
    }
  }
  return { valid: true }
}

/**
 * Checks if a variable name is unique across all transformations in the template.
 * Excludes the given transformation+field combination (i.e. allows re-saving the same binding).
 */
export function isVariableNameUnique(
  variableName: string,
  excludeTransformationId: string,
  excludeFieldName: string,
  transformations: Transformation[],
): boolean {
  for (const t of transformations) {
    if (!t.params) continue
    for (const [fieldName, varName] of Object.entries(t.params)) {
      if (varName !== variableName) continue
      // Same binding being re-saved — that's fine
      if (t.id === excludeTransformationId && fieldName === excludeFieldName) {
        continue
      }
      return false
    }
  }
  return true
}

/**
 * Returns all param bindings across a template.
 * Useful for consumers to build dynamic override forms.
 *
 * Includes both:
 *  - whole-field bindings (declared via `transformation.params`), and
 *  - inline bindings (variables embedded inside string field values using the
 *    `{{variable_name}}` marker syntax). Inline entries are flagged with
 *    `inline: true` and have no `defaultValue`.
 */
export function getTemplateParams(
  template: Omit<Transformation, "id">[],
): Array<{
  variableName: string
  fieldName: string
  transformationKey: string
  transformationName: string
  defaultValue?: unknown
  inline?: boolean
}> {
  const results: Array<{
    variableName: string
    fieldName: string
    transformationKey: string
    transformationName: string
    defaultValue?: unknown
    inline?: boolean
  }> = []

  for (const t of template) {
    const value = (t.value ?? {}) as Record<string, unknown>

    // Whole-field bindings
    if (t.params) {
      for (const [fieldName, variableName] of Object.entries(t.params)) {
        results.push({
          variableName,
          fieldName,
          transformationKey: t.key,
          transformationName: t.name,
          defaultValue: value[fieldName],
        })
      }
    }

    // Inline bindings — scan every string field for `{{name}}` markers.
    for (const [fieldName, fieldValue] of Object.entries(value)) {
      if (typeof fieldValue !== "string") continue
      // Skip fields that are already whole-field bound — the binding wins.
      if (t.params && fieldName in t.params) continue
      for (const variableName of extractInlineVariables(fieldValue)) {
        results.push({
          variableName,
          fieldName,
          transformationKey: t.key,
          transformationName: t.name,
          inline: true,
        })
      }
    }
  }

  return results
}

/**
 * Resolves a parameterized template by applying variable overrides.
 *
 * Two substitution modes are supported:
 *  - whole-field bindings (via `transformation.params`): the field value is
 *    replaced entirely with the override.
 *  - inline bindings: any `{{variable_name}}` markers inside string field
 *    values are replaced with the corresponding override. Markers without an
 *    override are left intact so consumers can detect unresolved variables.
 */
export function resolveTemplateParams(
  template: Omit<Transformation, "id">[],
  paramValues: Record<string, unknown>,
): Omit<Transformation, "id">[] {
  return template.map((t) => {
    const originalValue = (t.value ?? {}) as Record<string, unknown>
    const hasParams = t.params && Object.keys(t.params).length > 0

    let mutated = false
    const newValue: Record<string, unknown> = { ...originalValue }

    // Whole-field substitution
    if (hasParams) {
      for (const [fieldName, variableName] of Object.entries(
        t.params as Record<string, string>,
      )) {
        if (variableName in paramValues) {
          newValue[fieldName] = paramValues[variableName]
          mutated = true
        }
      }
    }

    // Inline substitution — applies to any string field that wasn't
    // whole-field bound (a whole-field binding fully owns the field).
    for (const [fieldName, fieldValue] of Object.entries(newValue)) {
      if (typeof fieldValue !== "string") continue
      if (t.params && fieldName in t.params) continue
      const substituted = substituteInlineVariables(fieldValue, paramValues)
      if (substituted !== fieldValue) {
        newValue[fieldName] = substituted
        mutated = true
      }
    }

    return mutated ? { ...t, value: newValue } : t
  })
}
