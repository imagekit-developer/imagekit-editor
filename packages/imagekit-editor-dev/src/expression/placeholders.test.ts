import { describe, expect, it } from "vitest"
import {
  extractTemplateVariableIdsFromString,
  replaceTemplateVariablePlaceholders,
  resolvePlaceholderInnerToId,
} from "./placeholders"

describe("expression/placeholders", () => {
  describe("resolvePlaceholderInnerToId", () => {
    it("trims whitespace", () => {
      expect(resolvePlaceholderInnerToId({ inner: "  name  " })).toBe("name")
    })

    it("lowercases UUID variable ids", () => {
      expect(
        resolvePlaceholderInnerToId({
          inner: "00000000-0000-0000-0000-0000000000AA",
        }),
      ).toBe("00000000-0000-0000-0000-0000000000aa")
    })

    it("does not lowercase non-UUID placeholders", () => {
      expect(resolvePlaceholderInnerToId({ inner: "MyVar" })).toBe("MyVar")
    })
  })

  describe("extractTemplateVariableIdsFromString", () => {
    it("extracts unique ids from placeholders (UUID normalized)", () => {
      const s =
        "x={{00000000-0000-0000-0000-0000000000AA}}, y={{00000000-0000-0000-0000-0000000000aa}}"
      expect(extractTemplateVariableIdsFromString({ input: s })).toEqual([
        "00000000-0000-0000-0000-0000000000aa",
      ])
    })

    it("extracts non-UUID placeholder inners as-is (trimmed)", () => {
      const s = "hello {{ headline }} and {{subhead}}"
      const ids = extractTemplateVariableIdsFromString({ input: s })
      expect(ids.sort()).toEqual(["headline", "subhead"].sort())
    })
  })

  describe("replaceTemplateVariablePlaceholders", () => {
    it("replaces all placeholders when values exist", () => {
      const out = replaceTemplateVariablePlaceholders({
        input: "Hello {{name}} {{00000000-0000-0000-0000-0000000000aa}}!",
        valuesById: {
          name: "Ada",
          "00000000-0000-0000-0000-0000000000aa": "Lovelace",
        },
      })
      expect(out.ok).toBe(true)
      expect(out.value).toBe("Hello Ada Lovelace!")
      expect(out.usedVariableIds.sort()).toEqual(
        ["name", "00000000-0000-0000-0000-0000000000aa"].sort(),
      )
    })

    it("leaves unresolved placeholders intact and reports them", () => {
      const out = replaceTemplateVariablePlaceholders({
        input: "x={{a}} y={{b}}",
        valuesById: { a: "1", b: "" },
      })
      expect(out.ok).toBe(false)
      if (!out.ok) {
        expect(out.value).toBe("x=1 y={{b}}")
        expect(out.unresolvedIds).toEqual(["b"])
        expect(out.usedVariableIds.sort()).toEqual(["a", "b"].sort())
      }
    })

    it("treats whitespace-only values as unresolved", () => {
      const out = replaceTemplateVariablePlaceholders({
        input: "{{a}}",
        valuesById: { a: "   " },
      })
      expect(out.ok).toBe(false)
      expect(out.value).toBe("{{a}}")
    })
  })
})
