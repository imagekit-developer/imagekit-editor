import { describe, expect, it } from "vitest"
import type { TemplatePreset, TemplateVariable } from "../storage/types"
import {
  findUnresolvedVariables,
  resolveEffectiveVariableValuesById,
} from "./runtime"

describe("templateVariables/runtime", () => {
  const variables: TemplateVariable[] = [
    { id: "a", name: "A", defaultValue: "da" },
    { id: "b", name: "B", defaultValue: "" },
    { id: "c", name: "C", defaultValue: "dc" },
  ]

  it("uses preset override when non-empty, otherwise falls back to defaultValue", () => {
    const preset: TemplatePreset = {
      id: "p1",
      name: "Preset 1",
      valuesByVariableId: {
        a: "pa",
        b: "pb",
        c: "",
      },
    }

    const effective = resolveEffectiveVariableValuesById({ variables, preset })
    expect(effective).toEqual({ a: "pa", b: "pb", c: "dc" })
  })

  it("returns defaults when preset is absent", () => {
    const effective = resolveEffectiveVariableValuesById({ variables })
    expect(effective).toEqual({ a: "da", b: "", c: "dc" })
  })

  it("findUnresolvedVariables reports variables with missing effective values", () => {
    const effective = { a: "ok", b: "  ", c: "" }
    const unresolved = findUnresolvedVariables({
      variables,
      effectiveValuesById: effective,
    })
    expect(unresolved).toEqual([
      { id: "b", name: "B", reason: "missing" },
      { id: "c", name: "C", reason: "missing" },
    ])
  })
})
