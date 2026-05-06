import type {
  ImageDimensionVariableSuggestion,
  VariableSuggestionOperator,
} from "./variableSuggestionTypes"

export const DEFAULT_OPERATORS: Array<{
  operator: VariableSuggestionOperator
  symbol: string
  label: string
}> = [
  { operator: "add", symbol: "+", label: "Add" },
  { operator: "sub", symbol: "−", label: "Subtract" },
  { operator: "mul", symbol: "×", label: "Multiply" },
  { operator: "div", symbol: "÷", label: "Divide" },
  { operator: "mod", symbol: "%", label: "Modulo (remainder)" },
  { operator: "pow", symbol: "^", label: "Power" },
]

/**
 * Default list used when the caller doesn't supply resolved values.
 * Callers are expected to pass `resolvedValue` like "1000 px" when available.
 */
export const DEFAULT_IMAGE_DIMENSION_VARIABLES: ImageDimensionVariableSuggestion[] =
  [
    { code: "iw", label: "Initial width", resolvedValue: "—" },
    { code: "ih", label: "Initial height", resolvedValue: "—" },
    { code: "iar", label: "Initial Aspect ratio", resolvedValue: "—" },
    { code: "cw", label: "Current width", resolvedValue: "—" },
    { code: "ch", label: "Current height", resolvedValue: "—" },
    { code: "car", label: "Current Aspect ratio", resolvedValue: "—" },
    { code: "bw", label: "Base width", resolvedValue: "—" },
    { code: "bh", label: "Base height", resolvedValue: "—" },
    { code: "bar", label: "Base Aspect ratio", resolvedValue: "—" },
  ]

export const OPERATOR_INSERT: Record<
  VariableSuggestionOperator,
  { insert: string }
> = {
  mul: { insert: "_mul_" },
  div: { insert: "_div_" },
  add: { insert: "_add_" },
  sub: { insert: "_sub_" },
  mod: { insert: "_mod_" },
  pow: { insert: "_pow_" },
}

export const startsWithImageDimPrefix = (query: string) => {
  const q = query.trim().toLowerCase()
  if (!q) return false
  return q.startsWith("i") || q.startsWith("c") || q.startsWith("b")
}

export const getQueryFromValue = (value: string) => {
  // For ordering only: use last "word" and its prefix.
  const trimmed = value.replace(/\s+$/g, "")
  const last = trimmed.split(/\s+/).slice(-1)[0] ?? ""
  return last
}
