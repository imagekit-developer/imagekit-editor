import type { DynamicVariableDefinition } from "./types"

const VARIABLE_REFERENCE_REGEX = /^\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}$/
const VARIABLE_TOKEN_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

export function parseVariableReference(value: unknown): string | null {
  if (typeof value !== "string") return null
  const match = value.match(VARIABLE_REFERENCE_REGEX)
  return match?.[1] ?? null
}

export function isVariableReference(value: unknown): boolean {
  return parseVariableReference(value) !== null
}

export function getDynamicVariableByName(
  variables: DynamicVariableDefinition[],
  name: string,
): DynamicVariableDefinition | undefined {
  return variables.find((variable) => variable.name === name)
}

function coerceVariableValue(
  variable: DynamicVariableDefinition,
): string | number | boolean {
  const { sampleValue, valueType } = variable

  if (valueType === "number") {
    if (typeof sampleValue === "number") return sampleValue
    const parsed = Number(sampleValue)
    return Number.isFinite(parsed) ? parsed : sampleValue
  }

  if (valueType === "boolean") {
    if (typeof sampleValue === "boolean") return sampleValue
    if (sampleValue === "true") return true
    if (sampleValue === "false") return false
    return sampleValue
  }

  return sampleValue
}

export function resolveVariableValue(
  value: unknown,
  variables: DynamicVariableDefinition[],
): unknown {
  const reference = parseVariableReference(value)
  if (reference) {
    const variable = getDynamicVariableByName(variables, reference)
    return variable ? coerceVariableValue(variable) : value
  }

  if (typeof value === "string") {
    return value.replace(
      VARIABLE_TOKEN_REGEX,
      (token, variableName: string) => {
        const variable = getDynamicVariableByName(variables, variableName)
        if (!variable) return token
        return String(coerceVariableValue(variable))
      },
    )
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveVariableValue(item, variables))
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        resolveVariableValue(nestedValue, variables),
      ]),
    )
  }

  return value
}

export function resolveTransformationValues<T>(
  value: T,
  variables: DynamicVariableDefinition[],
): T {
  return resolveVariableValue(value, variables) as T
}
