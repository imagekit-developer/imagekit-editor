import { describe, expect, it } from "vitest"
import type { TemplatePreset, TemplateVariable } from "../storage/types"
import type { Transformation } from "../store"
import { resolveTemplateForRender } from "./resolveTemplateForRender"

function step(
  value: Record<string, unknown>,
): Omit<Transformation, "id"> & { id?: never } {
  return {
    key: "test-test",
    name: "Test",
    type: "transformation",
    value: value as any,
  }
}

describe("templateRuntime/resolveTemplateForRender", () => {
  it("substitutes placeholders across nested string fields", () => {
    const variables: TemplateVariable[] = [
      { id: "a", name: "A", defaultValue: "da" },
      { id: "b", name: "B", defaultValue: "db" },
    ]
    const presets: TemplatePreset[] = [
      { id: "p", name: "P", valuesByVariableId: { a: "pa" } },
    ]

    const res = resolveTemplateForRender({
      transformations: [
        step({
          top: "x={{a}}",
          nested: { list: ["y={{b}}", { z: "k={{a}}" }] },
        }),
      ],
      variables,
      presets,
      activePresetId: "p",
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.transformations[0]?.value).toEqual({
        top: "x=pa",
        nested: { list: ["y=db", { z: "k=pa" }] },
      })
    }
  })

  it("fails fast when a used variable is missing/empty (but does not fail for unused variables)", () => {
    const variables: TemplateVariable[] = [
      { id: "used", name: "Used", defaultValue: "" },
      { id: "unused", name: "Unused", defaultValue: "" },
    ]

    const res = resolveTemplateForRender({
      transformations: [step({ v: "hello {{used}}" })],
      variables,
      presets: [],
      activePresetId: null,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.type).toBe("UNRESOLVED_VARIABLES")
      expect(res.error.usedVariableIds).toEqual(["used"])
      expect(res.error.unresolved).toEqual([{ id: "used", name: "Used" }])
    }
  })

  it("treats preset overrides as effective values (override wins)", () => {
    const variables: TemplateVariable[] = [
      { id: "a", name: "A", defaultValue: "da" },
    ]
    const presets: TemplatePreset[] = [
      { id: "p", name: "P", valuesByVariableId: { a: "pa" } },
    ]

    const res = resolveTemplateForRender({
      transformations: [step({ v: "{{a}}" })],
      variables,
      presets,
      activePresetId: "p",
    })

    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.transformations[0]?.value).toEqual({ v: "pa" })
    }
  })
})
