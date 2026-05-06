export type VariableSuggestionOperator =
  | "mul"
  | "div"
  | "add"
  | "sub"
  | "mod"
  | "pow"

export interface UserVariableSuggestion {
  id: string
  name: string
  type: "text" | "number" | "url" | "color"
  resolvedValue: string
}

export interface ImageDimensionVariableSuggestion {
  code: "iw" | "ih" | "iar" | "cw" | "ch" | "bw" | "bh" | "car" | "bar"
  label: string
  resolvedValue: string
}

export type VariableSuggestion =
  | { kind: "userVariable"; variableId: string }
  | { kind: "imageDimension"; code: ImageDimensionVariableSuggestion["code"] }
  | { kind: "operator"; operator: VariableSuggestionOperator }
