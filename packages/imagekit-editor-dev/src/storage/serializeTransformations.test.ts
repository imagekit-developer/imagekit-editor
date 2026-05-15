import { describe, expect, it } from "vitest"
import { TRANSFORMATION_STATE_VERSION } from "../store"
import { normalizeTransformationStepsForPersistence } from "./serializeTransformations"
import type { SaveTemplateInput } from "./types"

function minimalStep(
  overrides: Partial<SaveTemplateInput["transformations"][number]> = {},
): SaveTemplateInput["transformations"][number] {
  return {
    key: "w",
    name: "Width",
    type: "transformation",
    value: { w: 100 } as SaveTemplateInput["transformations"][number]["value"],
    ...overrides,
  }
}

describe("normalizeTransformationStepsForPersistence", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeTransformationStepsForPersistence([])).toEqual([])
  })

  it("fills missing version with TRANSFORMATION_STATE_VERSION", () => {
    const out = normalizeTransformationStepsForPersistence([
      minimalStep({ version: undefined }),
    ])
    expect(out[0].version).toBe(TRANSFORMATION_STATE_VERSION)
  })

  it("preserves an explicit version on a step", () => {
    const out = normalizeTransformationStepsForPersistence([
      minimalStep({ version: "v1" }),
    ])
    expect(out[0].version).toBe("v1")
  })

  it("maps multiple steps independently", () => {
    const out = normalizeTransformationStepsForPersistence([
      minimalStep({ key: "a", version: undefined }),
      minimalStep({ key: "b", version: "v1" }),
    ])
    expect(out[0].version).toBe(TRANSFORMATION_STATE_VERSION)
    expect(out[1].version).toBe("v1")
  })
})
