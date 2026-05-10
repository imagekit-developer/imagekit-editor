import { describe, expect, it } from "vitest"
import { getLayerFieldsByKey, getLayerTransformationItem } from "./layerFields"

describe("getLayerTransformationItem", () => {
  it("returns the layers-text item with its schema and field list", () => {
    const item = getLayerTransformationItem("layers-text")
    expect(item).toBeDefined()
    expect(item?.key).toBe("layers-text")
    expect(Array.isArray(item?.transformations)).toBe(true)
    expect(item?.transformations.length ?? 0).toBeGreaterThan(0)
  })

  it("returns the layers-image item", () => {
    const item = getLayerTransformationItem("layers-image")
    expect(item?.key).toBe("layers-image")
  })

  it("returns undefined for unknown keys", () => {
    expect(getLayerTransformationItem("does-not-exist")).toBeUndefined()
  })
})

describe("getLayerFieldsByKey", () => {
  it("returns the transformations field list for layers-text", () => {
    const fields = getLayerFieldsByKey("layers-text")
    expect(fields.length).toBeGreaterThan(0)
    // every field has a name and label
    for (const f of fields) {
      expect(typeof f.name).toBe("string")
      expect(f.name.length).toBeGreaterThan(0)
    }
    // text content field is part of the layer
    expect(fields.some((f) => f.name === "text")).toBe(true)
  })

  it("returns the transformations field list for layers-image", () => {
    const fields = getLayerFieldsByKey("layers-image")
    expect(fields.length).toBeGreaterThan(0)
    // image-layer should have width/height fields
    expect(fields.some((f) => f.name === "width")).toBe(true)
    expect(fields.some((f) => f.name === "height")).toBe(true)
  })

  it("returns an empty array for unknown keys", () => {
    expect(getLayerFieldsByKey("nope")).toEqual([])
  })
})
