import { describe, expect, it } from "vitest"
import {
  parseExpressionTokens,
  serializeExpressionTokens,
  suggestionToToken,
} from "./expressionTokens"

describe("components/common/expressionTokens", () => {
  it("treats {{uuid}} as an atomic userVar token and normalizes to lowercase", () => {
    const tokens = parseExpressionTokens(
      "iw_add_{{00000000-0000-0000-0000-0000000000AA}}_mul_2",
    )
    expect(tokens).toEqual([
      { kind: "imgVar", code: "iw" },
      { kind: "op", op: "add" },
      {
        kind: "userVar",
        variableId: "00000000-0000-0000-0000-0000000000aa",
      },
      { kind: "op", op: "mul" },
      { kind: "literal", value: "2" },
    ])
  })

  it("round-trips via serializeExpressionTokens", () => {
    const raw = "ih_add_2_mul_3_sub_4_div_2_mod_5_pow_2"
    const tokens = parseExpressionTokens(raw)
    expect(serializeExpressionTokens(tokens)).toBe(raw)
  })

  it("suggestionToToken returns null for unknown user variable id", () => {
    const userVariables: Array<{
      id: string
      name: string
      resolvedValue: string
    }> = [{ id: "known", name: "Known", resolvedValue: "x" }]
    expect(
      suggestionToToken(
        { kind: "userVariable", variableId: "missing" },
        userVariables,
      ),
    ).toBeNull()
  })

  it("parseExpressionTokens ignores non-UUID {{...}} as literal chunks", () => {
    const tokens = parseExpressionTokens("iw_add_{{not-a-uuid}}")
    // "{{not-a-uuid}}" is not treated as a userVar; it becomes a literal chunk.
    expect(tokens).toEqual([
      { kind: "imgVar", code: "iw" },
      { kind: "op", op: "add" },
      { kind: "literal", value: "{{not-a-uuid}}" },
    ])
  })

  it("suggestionToToken creates a userVar token only when id exists in dropdown list", () => {
    const userVariables: Array<{
      id: string
      name: string
      resolvedValue: string
    }> = [{ id: "a", name: "A", resolvedValue: "1" }]
    const token = suggestionToToken(
      { kind: "userVariable", variableId: "a" },
      userVariables,
    )
    expect(token).toEqual({ kind: "userVar", variableId: "a" })
  })
})
