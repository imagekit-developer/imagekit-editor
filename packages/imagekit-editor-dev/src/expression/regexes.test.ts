import { describe, expect, it } from "vitest"
import {
  IMG_VAR_CODES,
  makeAlphaNumBoundaryAlternationRe,
  makeAlternationSource,
  makeWordBoundaryAlternationRe,
  OP_CODES,
  USER_VAR_ANY_TOKEN_RE,
  USER_VAR_TOKEN_GLOBAL_RE,
  USER_VAR_TOKEN_RE,
  USER_VAR_UUID_INNER_RE,
} from "./regexes"

describe("expression/regexes", () => {
  describe("USER_VAR_UUID_INNER_RE / USER_VAR_TOKEN_RE", () => {
    it("matches standard UUID inners (case-insensitive)", () => {
      expect(
        USER_VAR_UUID_INNER_RE.test("00000000-0000-0000-0000-0000000000aa"),
      ).toBe(true)
      expect(
        USER_VAR_UUID_INNER_RE.test("00000000-0000-0000-0000-0000000000AA"),
      ).toBe(true)
    })

    it("rejects non-UUID inners", () => {
      expect(USER_VAR_UUID_INNER_RE.test("not-a-uuid")).toBe(false)
      expect(
        USER_VAR_UUID_INNER_RE.test("00000000-0000-0000-0000-0000000000"),
      ).toBe(false)
    })

    it("matches exact {{uuid}} tokens and captures the inner", () => {
      const m = "{{00000000-0000-0000-0000-0000000000AA}}".match(
        USER_VAR_TOKEN_RE,
      )
      expect(m).not.toBeNull()
      expect(m?.[1]).toBe("00000000-0000-0000-0000-0000000000AA")
    })

    it("does not match when extra characters are present", () => {
      expect(
        USER_VAR_TOKEN_RE.test("x{{00000000-0000-0000-0000-0000000000aa}}y"),
      ).toBe(false)
      expect(USER_VAR_TOKEN_RE.test("{{not-a-uuid}}")).toBe(false)
    })
  })

  describe("USER_VAR_ANY_TOKEN_RE", () => {
    it("matches exact {{name}} tokens and captures the inner", () => {
      const m = "{{var_name}}".match(USER_VAR_ANY_TOKEN_RE)
      expect(m).not.toBeNull()
      expect(m?.[1]).toBe("var_name")
    })

    it("matches {{uuid}} too (but does not lowercase)", () => {
      const m = "{{00000000-0000-0000-0000-0000000000AA}}".match(
        USER_VAR_ANY_TOKEN_RE,
      )
      expect(m).not.toBeNull()
      expect(m?.[1]).toBe("00000000-0000-0000-0000-0000000000AA")
    })

    it("does not match empty, nested braces, or extra characters", () => {
      expect(USER_VAR_ANY_TOKEN_RE.test("{{}}")).toBe(false)
      expect(USER_VAR_ANY_TOKEN_RE.test("x{{var}}y")).toBe(false)
      expect(USER_VAR_ANY_TOKEN_RE.test("{{a{b}}}")).toBe(false)
      expect(USER_VAR_ANY_TOKEN_RE.test("{{a}}}}")).toBe(false)
    })
  })

  describe("USER_VAR_TOKEN_GLOBAL_RE", () => {
    it("finds all tokens in a string and captures each inner", () => {
      const input =
        "a={{00000000-0000-0000-0000-0000000000aa}} b={{00000000-0000-0000-0000-0000000000BB}}"
      const matches = Array.from(input.matchAll(USER_VAR_TOKEN_GLOBAL_RE)).map(
        (m) => m[1],
      )
      expect(matches).toEqual([
        "00000000-0000-0000-0000-0000000000aa",
        "00000000-0000-0000-0000-0000000000BB",
      ])
    })
  })

  describe("makeWordBoundaryAlternationRe", () => {
    it("matches tokens with \\b boundaries (underscore is NOT a boundary)", () => {
      const re = makeWordBoundaryAlternationRe(["iw"], "g")
      expect("iw".match(re)).toEqual(["iw"])
      expect(" iw ".match(re)).toEqual(["iw"])
      // "_" is a word char, so \\b doesn't split there
      expect("x_iw_y".match(re)).toBeNull()
    })
  })

  describe("makeAlphaNumBoundaryAlternationRe", () => {
    it("treats '_' as a separator and blocks adjacent alphanumerics", () => {
      const re = makeAlphaNumBoundaryAlternationRe(["iw"], "g")
      expect("x_iw_y".match(re)).toEqual(["iw"])
      expect("iw".match(re)).toEqual(["iw"])
      expect("aiw".match(re)).toBeNull()
      expect("iw2".match(re)).toBeNull()
      expect("iw-".match(re)).toEqual(["iw"])
      expect("-iw".match(re)).toEqual(["iw"])
    })

    it("escapes regexp metacharacters in tokens", () => {
      const re = makeAlphaNumBoundaryAlternationRe(["a+b", "x.y"], "g")
      expect("a+b x.y".match(re)).toEqual(["a+b", "x.y"])
      expect("aab xxy".match(re)).toBeNull()
    })
  })

  describe("makeAlternationSource", () => {
    it("produces an alternation source with escaped literals", () => {
      const src = makeAlternationSource(["a+b", "x.y"])
      const re = new RegExp(src, "g")
      expect("a+b x.y".match(re)).toEqual(["a+b", "x.y"])
    })
  })

  describe("sanity: IMG_VAR_CODES / OP_CODES", () => {
    it("contain expected known codes (spot-check)", () => {
      expect(IMG_VAR_CODES).toContain("iw")
      expect(IMG_VAR_CODES).toContain("car")
      expect(OP_CODES).toContain("mul")
      expect(OP_CODES).toContain("pow")
    })
  })
})
