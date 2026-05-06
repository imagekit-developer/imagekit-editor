import type {
  ImageDimensionVariableSuggestion,
  UserVariableSuggestion,
  VariableSuggestionOperator,
} from "./variableSuggestionTypes"

export type ExpressionToken =
  | { kind: "imgVar"; code: ImageDimensionVariableSuggestion["code"] }
  | { kind: "userVar"; name: string } // stored as name; later can switch to id-based
  | { kind: "op"; op: VariableSuggestionOperator }
  | { kind: "literal"; value: string }

export const IMG_VAR_CODES: ReadonlyArray<
  ImageDimensionVariableSuggestion["code"]
> = ["iw", "ih", "iar", "cw", "ch", "car", "bw", "bh", "bar"]

export const OP_CODES: ReadonlyArray<VariableSuggestionOperator> = [
  "mul",
  "div",
  "add",
  "sub",
  "mod",
  "pow",
]

const isImgVar = (s: string): s is ImageDimensionVariableSuggestion["code"] =>
  (IMG_VAR_CODES as readonly string[]).includes(s)

const isOp = (s: string): s is VariableSuggestionOperator =>
  (OP_CODES as readonly string[]).includes(s)

const USER_VAR_NAME_RE = /^[a-zA-Z0-9_]+$/

export function parseExpressionTokens(raw: string): ExpressionToken[] {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return []

  const tokens: ExpressionToken[] = []

  let i = 0
  while (i < trimmed.length) {
    // skip separators / empty chunks
    while (trimmed[i] === "_") i++
    if (i >= trimmed.length) break

    // User variable: {{...}} should be atomic (underscores allowed inside).
    if (trimmed.startsWith("{{", i)) {
      const end = trimmed.indexOf("}}", i + 2)
      if (end !== -1) {
        const name = trimmed.slice(i + 2, end)
        if (USER_VAR_NAME_RE.test(name)) {
          tokens.push({ kind: "userVar", name })
          i = end + 2
          continue
        }
        // If malformed, fall through and treat as literal chunk.
      }
    }

    // Regular chunk: read until next underscore
    let j = i
    while (j < trimmed.length && trimmed[j] !== "_") j++
    const chunk = trimmed.slice(i, j)
    if (isImgVar(chunk)) {
      tokens.push({ kind: "imgVar", code: chunk })
    } else if (isOp(chunk)) {
      tokens.push({ kind: "op", op: chunk })
    } else if (chunk) {
      tokens.push({ kind: "literal", value: chunk })
    }
    i = j
  }

  return tokens
}

export function serializeExpressionTokens(tokens: ExpressionToken[]): string {
  return tokens
    .map((t) => {
      if (t.kind === "imgVar") return t.code
      if (t.kind === "op") return t.op
      if (t.kind === "userVar") return `{{${t.name}}}`
      return t.value
    })
    .filter((x) => x !== "")
    .join("_")
}

export function suggestionToToken(
  suggestion:
    | { kind: "imageDimension"; code: ImageDimensionVariableSuggestion["code"] }
    | { kind: "operator"; operator: VariableSuggestionOperator }
    | { kind: "userVariable"; variableId: string },
  userVariables: UserVariableSuggestion[],
): ExpressionToken | null {
  if (suggestion.kind === "imageDimension") {
    return { kind: "imgVar", code: suggestion.code }
  }
  if (suggestion.kind === "operator") {
    return { kind: "op", op: suggestion.operator }
  }
  const uv = userVariables.find((v) => v.id === suggestion.variableId)
  if (!uv) return null
  return { kind: "userVar", name: uv.name }
}
