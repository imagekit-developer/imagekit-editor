import { describe, expect, it } from "vitest"
import type { Transformation } from "./store"
import {
  buildTemplateUrl,
  replaceImagePathPlaceholders,
  resolveTemplate,
  resolveTransformationStep,
} from "./buildTemplateUrl"

describe("resolveTransformationStep", () => {
  it("resolves a blur transformation", () => {
    const step: Omit<Transformation, "id"> = {
      key: "adjust-blur",
      name: "Blur",
      type: "transformation",
      value: { blur: 10 },
    }
    const result = resolveTransformationStep(step)
    expect(result).toEqual({ blur: 10 })
  })

  it("resolves a contrast transformation", () => {
    const step: Omit<Transformation, "id"> = {
      key: "adjust-contrast",
      name: "Contrast",
      type: "transformation",
      value: { contrast: true },
    }
    const result = resolveTransformationStep(step)
    expect(result).toEqual({ contrastStretch: true })
  })

  it("skips fields with empty string values", () => {
    const step: Omit<Transformation, "id"> = {
      key: "adjust-blur",
      name: "Blur",
      type: "transformation",
      value: { blur: "" },
    }
    const result = resolveTransformationStep(step)
    expect(result).toEqual({})
  })

  it("returns empty object for unknown transformation key", () => {
    const step: Omit<Transformation, "id"> = {
      key: "unknown-key",
      name: "Unknown",
      type: "transformation",
      value: { foo: "bar" },
    }
    const result = resolveTransformationStep(step)
    expect(result).toEqual({})
  })

  it("handles resize_and_crop with width, height, and mode", () => {
    const step: Omit<Transformation, "id"> = {
      key: "resize_and_crop-resize_and_crop",
      name: "Resize & Crop",
      type: "transformation",
      value: { width: 300, height: 200, mode: "resize" },
    }
    const result = resolveTransformationStep(step)
    expect(result.width).toBe(300)
    expect(result.height).toBe(200)
  })

  it("handles resize_and_crop without mode — no default transformation", () => {
    const step: Omit<Transformation, "id"> = {
      key: "resize_and_crop-resize_and_crop",
      name: "Resize & Crop",
      type: "transformation",
      value: { width: 300 },
    }
    const result = resolveTransformationStep(step)
    expect(result.width).toBe(300)
  })
})

describe("replaceImagePathPlaceholders", () => {
  it("replaces __IMAGE_PATH__ in raw strings", () => {
    const transformations = [
      { raw: "e-gradient:l-image,i-__IMAGE_PATH__,l-end" },
    ]
    const result = replaceImagePathPlaceholders(transformations, "photo.jpg")
    expect(result[0].raw).toBe("e-gradient:l-image,i-photo.jpg,l-end")
  })

  it("does not touch transformations without raw", () => {
    const transformations = [{ blur: 10 }]
    const result = replaceImagePathPlaceholders(transformations, "photo.jpg")
    expect(result[0]).toEqual({ blur: 10 })
  })

  it("does not modify the original array", () => {
    const original = [
      { raw: "e-gradient:l-image,i-__IMAGE_PATH__,l-end" },
    ]
    const copy = JSON.parse(JSON.stringify(original))
    replaceImagePathPlaceholders(original, "photo.jpg")
    expect(original).toEqual(copy)
  })
})

describe("resolveTemplate", () => {
  it("resolves a simple template", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 10 },
      },
    ]
    const result = resolveTemplate(template)
    expect(result).toEqual([{ blur: 10 }])
  })

  it("filters out disabled steps", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 10 },
        enabled: false,
      },
      {
        key: "adjust-contrast",
        name: "Contrast",
        type: "transformation",
        value: { contrast: true },
      },
    ]
    const result = resolveTemplate(template)
    expect(result).toEqual([{ contrastStretch: true }])
  })

  it("strips canvas step at position 0", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "canvas",
        name: "Canvas",
        type: "transformation",
        value: { width: 1080, height: 1080, color: "#00000000" },
      },
      {
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 5 },
      },
    ]
    const result = resolveTemplate(template)
    expect(result).toEqual([{ blur: 5 }])
  })

  it("applies param overrides", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 10 },
        params: { blur: "hero_blur" },
      },
    ]
    const result = resolveTemplate(template, { hero_blur: 25 })
    expect(result).toEqual([{ blur: 25 }])
  })

  it("keeps default when param is not provided", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 10 },
        params: { blur: "hero_blur" },
      },
    ]
    const result = resolveTemplate(template, {})
    expect(result).toEqual([{ blur: 10 }])
  })

  it("returns empty array for empty template", () => {
    expect(resolveTemplate([])).toEqual([])
  })
})

describe("buildTemplateUrl", () => {
  it("returns original URLs when template is empty", () => {
    const result = buildTemplateUrl({
      template: [],
      images: ["https://ik.imagekit.io/demo/sample.jpg"],
    })
    expect(result).toEqual(["https://ik.imagekit.io/demo/sample.jpg"])
  })

  it("builds transformed URLs for images", () => {
    const result = buildTemplateUrl({
      template: [
        {
          key: "adjust-blur",
          name: "Blur",
          type: "transformation",
          value: { blur: 10 },
        },
      ],
      images: ["https://ik.imagekit.io/demo/sample.jpg"],
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("bl-10")
  })

  it("applies param overrides to template", () => {
    const result = buildTemplateUrl({
      template: [
        {
          key: "adjust-blur",
          name: "Blur",
          type: "transformation",
          value: { blur: 10 },
          params: { blur: "my_blur" },
        },
      ],
      images: ["https://ik.imagekit.io/demo/sample.jpg"],
      paramValues: { my_blur: 50 },
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("bl-50")
  })

  it("builds multiple image URLs", () => {
    const result = buildTemplateUrl({
      template: [
        {
          key: "adjust-blur",
          name: "Blur",
          type: "transformation",
          value: { blur: 5 },
        },
      ],
      images: [
        "https://ik.imagekit.io/demo/a.jpg",
        "https://ik.imagekit.io/demo/b.jpg",
      ],
    })
    expect(result).toHaveLength(2)
    expect(result[0]).toContain("bl-5")
    expect(result[1]).toContain("bl-5")
  })

  it("skips disabled transformation steps", () => {
    const result = buildTemplateUrl({
      template: [
        {
          key: "adjust-blur",
          name: "Blur",
          type: "transformation",
          value: { blur: 10 },
          enabled: false,
        },
      ],
      images: ["https://ik.imagekit.io/demo/sample.jpg"],
    })
    // No transformations applied → original URL returned
    expect(result).toEqual(["https://ik.imagekit.io/demo/sample.jpg"])
  })

  it("handles canvas-mode template with no images", () => {
    const result = buildTemplateUrl({
      template: [
        {
          key: "canvas",
          name: "Canvas",
          type: "transformation",
          value: { width: 500, height: 500, color: "#FF0000FF" },
        },
        {
          key: "adjust-blur",
          name: "Blur",
          type: "transformation",
          value: { blur: 3 },
        },
      ],
      images: [],
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("canvas_layer")
  })
})
