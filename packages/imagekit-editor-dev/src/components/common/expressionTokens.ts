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
> = ["iw", "ih", "iar", "cw", "ch", "bw", "bh"]

export const OP_CODES: ReadonlyArray<VariableSuggestionOperator> = [
  "mul",
  "div",
  "add",
  "sub",
]

const isImgVar = (s: string): s is ImageDimensionVariableSuggestion["code"] =>
  (IMG_VAR_CODES as readonly string[]).includes(s)

const isOp = (s: string): s is VariableSuggestionOperator =>
  (OP_CODES as readonly string[]).includes(s)

const USER_VAR_RE = /^\{\{([a-zA-Z0-9_]+)\}\}$/

export function parseExpressionTokens(raw: string): ExpressionToken[] {
  const trimmed = (raw ?? "").trim()
  if (!trimmed) return []

  const parts = trimmed.split("_").filter(Boolean)
  const tokens: ExpressionToken[] = []

  for (const p of parts) {
    const m = p.match(USER_VAR_RE)
    if (m?.[1]) {
      tokens.push({ kind: "userVar", name: m[1] })
      continue
    }
    if (isImgVar(p)) {
      tokens.push({ kind: "imgVar", code: p })
      continue
    }
    if (isOp(p)) {
      tokens.push({ kind: "op", op: p })
      continue
    }
    tokens.push({ kind: "literal", value: p })
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
