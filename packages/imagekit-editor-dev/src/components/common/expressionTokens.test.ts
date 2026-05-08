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

  it("parseExpressionTokens treats non-UUID {{...}} as a userVar token (display form)", () => {
    const tokens = parseExpressionTokens("iw_add_{{not-a-uuid}}")
    // "{{not-a-uuid}}" is treated as a userVar token (display form).
    expect(tokens).toEqual([
      { kind: "imgVar", code: "iw" },
      { kind: "op", op: "add" },
      { kind: "userVar", variableId: "not-a-uuid" },
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

  it("treats a leading-slash path with underscores as a single literal token", () => {
    const raw =
      "/creative_automation_hackathon/sample_images/female-model-2.jpg"
    expect(parseExpressionTokens(raw)).toEqual([
      { kind: "literal", value: raw },
    ])
  })

  it("treats http(s) URLs with underscores as a single literal token", () => {
    const raw =
      "https://cdn.example.com/creative_automation_hackathon/sample_images/female-model-2.jpg"
    expect(parseExpressionTokens(raw)).toEqual([
      { kind: "literal", value: raw },
    ])
  })

  it("treats relative paths with slashes and underscores as a single literal token", () => {
    const raw = "creative_automation_hackathon/sample_images/female-model-2.jpg"
    expect(parseExpressionTokens(raw)).toEqual([
      { kind: "literal", value: raw },
    ])
  })

  it("does not collapse URL/path-like values into a single literal when {{...}} is present", () => {
    /**
     * This is done so that we don't block the variable / expression syntax behavior.
     */
    const raw = "/images/{{00000000-0000-0000-0000-0000000000AA}}/file_name.jpg"
    expect(parseExpressionTokens(raw)).toEqual([
      {
        kind: "literal",
        value: "/images/{{00000000-0000-0000-0000-0000000000AA}}/file",
      },
      { kind: "literal", value: "name.jpg" },
    ])
  })
})
