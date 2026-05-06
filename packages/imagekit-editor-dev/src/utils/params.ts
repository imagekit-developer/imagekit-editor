import type { Transformation } from "../store"

const VARIABLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/
const MAX_VARIABLE_NAME_LENGTH = 40

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
 */
export function getTemplateParams(
  template: Omit<Transformation, "id">[],
): Array<{
  variableName: string
  fieldName: string
  transformationKey: string
  transformationName: string
  defaultValue: unknown
}> {
  const results: Array<{
    variableName: string
    fieldName: string
    transformationKey: string
    transformationName: string
    defaultValue: unknown
  }> = []

  for (const t of template) {
    if (!t.params) continue
    for (const [fieldName, variableName] of Object.entries(t.params)) {
      results.push({
        variableName,
        fieldName,
        transformationKey: t.key,
        transformationName: t.name,
        defaultValue: (t.value as Record<string, unknown>)[fieldName],
      })
    }
  }

  return results
}

/**
 * Resolves a parameterized template by applying variable overrides.
 * Fields with a param binding get their value replaced if the override map
 * contains that variable name; otherwise the existing value (default) is kept.
 */
export function resolveTemplateParams(
  template: Omit<Transformation, "id">[],
  paramValues: Record<string, unknown>,
): Omit<Transformation, "id">[] {
  return template.map((t) => {
    if (!t.params || Object.keys(t.params).length === 0) return t

    const newValue = { ...(t.value as Record<string, unknown>) }
    for (const [fieldName, variableName] of Object.entries(t.params)) {
      if (variableName in paramValues) {
        newValue[fieldName] = paramValues[variableName]
      }
    }

    return { ...t, value: newValue }
  })
}
