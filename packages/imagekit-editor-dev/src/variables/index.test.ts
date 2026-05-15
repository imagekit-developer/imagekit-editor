import { describe, expect, it } from "vitest"
import {
  isVariableRef,
  resolveVariableRefs,
  type VariableRef,
  walkVariableRefs,
} from "./index"

describe("isVariableRef", () => {
  it("recognizes new variables with defaultValue", () => {
    expect(
      isVariableRef({
        $var: "headline",
        label: "Headline",
        defaultValue: "Hello",
      }),
    ).toBe(true)
  })

  it("recognizes new variables with description", () => {
    expect(
      isVariableRef({
        $var: "headline",
        label: "Headline",
        defaultValue: "Hello",
        description: "Main heading",
      }),
    ).toBe(true)
  })

  // Backward compatibility: pre-defaultValue templates only carry $var + label.
  it("recognizes legacy variables without defaultValue", () => {
    expect(isVariableRef({ $var: "headline", label: "Headline" })).toBe(true)
  })

  it("rejects non-variable shapes", () => {
    expect(isVariableRef(null)).toBe(false)
    expect(isVariableRef(undefined)).toBe(false)
    expect(isVariableRef("string")).toBe(false)
    expect(isVariableRef(42)).toBe(false)
    expect(isVariableRef({})).toBe(false)
    expect(isVariableRef({ $var: "x" })).toBe(false) // missing label
    expect(isVariableRef({ label: "X" })).toBe(false) // missing $var
    expect(isVariableRef({ $var: 1, label: "X" })).toBe(false) // non-string $var
  })
})

describe("resolveVariableRefs", () => {
  it("returns the override when host provides one", () => {
    const ref: VariableRef = {
      $var: "headline",
      label: "Headline",
      defaultValue: "Default",
    }
    expect(resolveVariableRefs(ref, { headline: "Overridden" })).toBe(
      "Overridden",
    )
  })

  it("falls back to defaultValue when no override is provided", () => {
    const ref: VariableRef = {
      $var: "headline",
      label: "Headline",
      defaultValue: "Default",
    }
    expect(resolveVariableRefs(ref, {})).toBe("Default")
  })

  // Backward compatibility: legacy refs lacking defaultValue resolve to
  // `undefined`, matching the original pre-defaultValue behavior.
  it("falls back to undefined for legacy refs without defaultValue", () => {
    const legacyRef = { $var: "headline", label: "Headline" }
    expect(resolveVariableRefs(legacyRef, {})).toBeUndefined()
  })

  it("respects an explicit override of undefined", () => {
    const ref: VariableRef = {
      $var: "headline",
      label: "Headline",
      defaultValue: "Default",
    }
    // Host explicitly passes undefined → we honor it (own property wins),
    // even though the default would otherwise be "Default".
    expect(resolveVariableRefs(ref, { headline: undefined })).toBeUndefined()
  })

  it("walks nested objects and arrays", () => {
    const tree = {
      text: {
        $var: "headline",
        label: "Headline",
        defaultValue: "Default Headline",
      },
      typography: [
        {
          $var: "fontStyle",
          label: "Font Style",
          defaultValue: ["bold"],
        },
      ],
      fontSize: 32,
    }

    expect(resolveVariableRefs(tree, { headline: "Sale" })).toEqual({
      text: "Sale",
      typography: [["bold"]],
      fontSize: 32,
    })
  })

  it("structurally clones marker-free trees", () => {
    const tree = {
      width: 800,
      nested: { value: "x", arr: [1, 2, 3] },
    }
    const result = resolveVariableRefs(tree, {}) as typeof tree
    expect(result).toEqual(tree)
    expect(result).not.toBe(tree)
    expect(result.nested).not.toBe(tree.nested)
    expect(result.nested.arr).not.toBe(tree.nested.arr)
  })
})

describe("walkVariableRefs", () => {
  it("visits both legacy and new variable refs at any depth", () => {
    const tree = {
      text: { $var: "headline", label: "Headline" }, // legacy
      bg: {
        from: {
          $var: "bgFrom",
          label: "BG From",
          defaultValue: "#FFFFFF",
        },
      },
      arr: [
        {
          $var: "item0",
          label: "Item 0",
          defaultValue: "x",
          description: "first",
        },
      ],
    }

    const visited: Array<{ name: string; path: string[] }> = []
    walkVariableRefs(tree, (ref, path) => {
      visited.push({ name: ref.$var, path })
    })

    expect(visited).toEqual([
      { name: "headline", path: ["text"] },
      { name: "bgFrom", path: ["bg", "from"] },
      { name: "item0", path: ["arr", "0"] },
    ])
  })
})
