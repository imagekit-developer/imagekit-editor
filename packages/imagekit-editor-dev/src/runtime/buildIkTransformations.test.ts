import { describe, expect, it } from "vitest"
import type { Transformation } from "../store"
import { buildIkTransformations } from "./buildIkTransformations"

function step(
  key: string,
  value: Record<string, unknown>,
): Omit<Transformation, "id"> & { id?: never } {
  return {
    key,
    name: "Test",
    type: "transformation",
    value,
    version: "v1",
  }
}

describe("runtime/buildIkTransformations", () => {
  it("maps simple schema fields into ImageKit transformation keys (resize_and_crop)", () => {
    const out = buildIkTransformations([
      step("resize_and_crop-resize_and_crop", {
        width: "1200",
        height: "800",
        mode: "pad_resize",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    // Schema-driven keys; w/h should exist when provided.
    expect(t.w ?? t.width).toBeDefined()
    expect(t.h ?? t.height).toBeDefined()
  })

  it("generates raw layer syntax for manual gradient background (with __IMAGE_PATH__ placeholder)", () => {
    const out = buildIkTransformations([
      step("adjust-background", {
        backgroundType: "gradient",
        backgroundGradientAutoDominant: false,
        backgroundGradient: {
          from: "#FFFFFFFF",
          to: "#00000000",
          direction: "bottom",
          stopPoint: 100,
        },
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(typeof t.raw).toBe("string")
    expect(t.raw).toContain("i-__IMAGE_PATH__")
  })

  it("omits empty-string values so they don't become transformations", () => {
    const out = buildIkTransformations([
      step("resize_and_crop-resize_and_crop", {
        width: "",
        height: "",
        mode: "",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    // Should not emit width/height keys when values are empty.
    expect("w" in t || "width" in t).toBe(false)
    expect("h" in t || "height" in t).toBe(false)
  })
})
