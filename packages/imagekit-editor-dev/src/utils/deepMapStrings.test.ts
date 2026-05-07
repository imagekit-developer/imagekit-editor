import { describe, expect, it } from "vitest"
import { deepMapStrings } from "./deepMapStrings"

describe("utils/deepMapStrings", () => {
  it("maps strings recursively across objects and arrays", () => {
    const input = {
      a: "x",
      b: 123,
      c: null,
      d: ["y", { e: "z", f: [true, "w"] }],
    }

    const out = deepMapStrings(input, (s) => s.toUpperCase())
    expect(out).toEqual({
      a: "X",
      b: 123,
      c: null,
      d: ["Y", { e: "Z", f: [true, "W"] }],
    })
  })

  it("returns non-objects unchanged", () => {
    expect(deepMapStrings(5, (s) => s)).toBe(5)
    expect(deepMapStrings(false, (s) => s)).toBe(false)
    expect(deepMapStrings(undefined, (s) => s)).toBe(undefined)
  })
})
