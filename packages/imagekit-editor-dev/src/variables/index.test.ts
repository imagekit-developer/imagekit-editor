import { describe, expect, it } from "vitest"
import {
  dedupeVariableMarkersInList,
  isVariableRef,
  resolveVariableRefs,
  type VariableRef,
  walkVariableRefs,
} from "./index"

type TestNode = { value: unknown; children?: TestNode[] }

const v = (
  $var: string,
  label: string,
  defaultValue: unknown = "",
): VariableRef => ({ $var, label, defaultValue })

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

describe("dedupeVariableMarkersInList", () => {
  it("keeps unique names unchanged", () => {
    const list: TestNode[] = [{ value: { fg: v("headline", "Headline") } }]
    const out = dedupeVariableMarkersInList(list)
    expect((out[0].value as { fg: VariableRef }).fg.$var).toBe("headline")
  })

  it("first occurrence keeps its name; later collision is suffixed", () => {
    // Mirrors the duplicate-step scenario: two top-level text layers both
    // bound to the same `$var` end up with unique names after dedupe.
    const list: TestNode[] = [
      { value: { text: v("center_text", "Center text") } },
      { value: { text: v("center_text", "Center text") } },
    ]
    const out = dedupeVariableMarkersInList(list)
    expect((out[0].value as { text: VariableRef }).text.$var).toBe(
      "center_text",
    )
    expect((out[1].value as { text: VariableRef }).text.$var).toBe(
      "center_text_2",
    )
  })

  it("preserves intra-step sharing across multiple fields", () => {
    // Two fields in the same step bound to the same variable should
    // remain bound to the same (renamed) name after dedupe.
    const shared = v("brand", "Brand")
    const list: TestNode[] = [{ value: { fg: shared, stroke: shared } }]
    const out = dedupeVariableMarkersInList(list, ["brand"])
    const value = out[0].value as { fg: VariableRef; stroke: VariableRef }
    expect(value.fg.$var).toBe("brand_2")
    expect(value.stroke.$var).toBe("brand_2")
  })

  it("dedupes across nested children", () => {
    const list: TestNode[] = [
      {
        value: { fg: v("brand", "Brand") },
        children: [{ value: { stroke: v("brand", "Brand") } }],
      },
      { value: { text: v("brand", "Brand") } },
    ]
    const out = dedupeVariableMarkersInList(list)
    // Within node 0, intra-subtree sharing is preserved.
    expect((out[0].value as { fg: VariableRef }).fg.$var).toBe("brand")
    expect(
      (out[0].children?.[0].value as { stroke: VariableRef }).stroke.$var,
    ).toBe("brand")
    // Node 1 collides with node 0's `brand` and gets suffixed.
    expect((out[1].value as { text: VariableRef }).text.$var).toBe("brand_2")
  })

  it("respects pre-existing taken names", () => {
    const list: TestNode[] = [{ value: { text: v("foo", "Foo") } }]
    const out = dedupeVariableMarkersInList(list, ["foo"])
    expect((out[0].value as { text: VariableRef }).text.$var).toBe("foo_2")
  })

  it("does not mutate the input list", () => {
    const list: TestNode[] = [{ value: { fg: v("headline", "Headline") } }]
    dedupeVariableMarkersInList(list, ["headline"])
    expect((list[0].value as { fg: VariableRef }).fg.$var).toBe("headline")
  })
})
