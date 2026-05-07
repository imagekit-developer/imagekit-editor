import { describe, expect, it } from "vitest"
import { parseExpressionTokens } from "./expressionTokens"
import { resolveExpressionTokensToNumber } from "./resolveExpression"

describe("resolveExpressionTokensToNumber (ImageKit precedence)", () => {
  it("evaluates mul/div before add/sub (regression)", () => {
    // iw=1870, ih=1250
    // ih + iw - 1000/2 = 1250 + 1870 - 500 = 2620
    const tokens = parseExpressionTokens("ih_add_iw_sub_1000_div_2")
    const result = resolveExpressionTokensToNumber(tokens, {
      iw: 1870,
      ih: 1250,
    })
    expect(result).toBe(2620)
  })

  it("evaluates add/sub before mod", () => {
    // docs: mul/div → add/sub → mod → pow
    // iw + 5 mod 4 => (iw + 5) mod 4
    const tokens = parseExpressionTokens("iw_add_5_mod_4")
    const result = resolveExpressionTokensToNumber(tokens, { iw: 10 })
    expect(result).toBe(3)
  })

  it("evaluates pow last (lowest precedence)", () => {
    // iw + 2 pow 3 => (iw + 2) ^ 3  (since add before pow)
    const tokens = parseExpressionTokens("iw_add_2_pow_3")
    const result = resolveExpressionTokensToNumber(tokens, { iw: 2 })
    expect(result).toBe(64)
  })

  it("evaluates operators left-to-right within same precedence tier", () => {
    // mul/div tier: (iw / 2) * 3
    const tokens = parseExpressionTokens("iw_div_2_mul_3")
    const result = resolveExpressionTokensToNumber(tokens, { iw: 10 })
    expect(result).toBe(15)
  })

  it("evaluates pow left-to-right (not right-associative)", () => {
    // (2 ^ 3) ^ 2 = 64 (left-to-right)
    const tokens = parseExpressionTokens("iw_pow_3_pow_2")
    const result = resolveExpressionTokensToNumber(tokens, { iw: 2 })
    expect(result).toBe(64)
  })

  it("returns null when user variables are present", () => {
    const tokens = parseExpressionTokens(
      "iw_add_{{00000000-0000-0000-0000-000000000000}}",
    )
    const result = resolveExpressionTokensToNumber(tokens, { iw: 10 })
    expect(result).toBeNull()
  })

  it("handles all operators with ImageKit precedence order", () => {
    // Expression uses add/sub/mul/div/mod/pow in one chain.
    // Precedence (docs): mul/div -> add/sub -> mod -> pow (all L->R).
    //
    // iw + 2*3 - 4/2 mod 5 pow 2
    // mul/div: 2*3=6, 4/2=2  => iw_add_6_sub_2_mod_5_pow_2
    // add/sub: iw+6-2 = iw+4
    // mod: (iw+4) mod 5
    // pow: ((iw+4) mod 5) ^ 2
    //
    // iw=7 => (7+4)=11 mod 5 = 1; 1^2 = 1
    const tokens = parseExpressionTokens(
      "iw_add_2_mul_3_sub_4_div_2_mod_5_pow_2",
    )
    const result = resolveExpressionTokensToNumber(tokens, { iw: 7 })
    expect(result).toBe(1)
  })
})
