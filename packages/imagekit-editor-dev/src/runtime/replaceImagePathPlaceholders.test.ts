import { describe, expect, it } from "vitest"
import { replaceImagePathPlaceholders } from "./replaceImagePathPlaceholders"

describe("runtime/replaceImagePathPlaceholders", () => {
  it("replaces all __IMAGE_PATH__ occurrences in raw", () => {
    const input = [
      {
        raw: "l-image,i-__IMAGE_PATH__,l-end:l-image,i-__IMAGE_PATH__,l-end",
      },
    ]

    const out = replaceImagePathPlaceholders(input as any, "folder@@img.png")

    expect(out).toHaveLength(1)
    expect(out[0]?.raw).toBe(
      "l-image,i-folder@@img.png,l-end:l-image,i-folder@@img.png,l-end",
    )
  })

  it("is a no-op when raw is missing, non-string, or does not contain token", () => {
    const input = [
      { w: 100 },
      { raw: 123 },
      { raw: "l-image,i-somewhere,l-end" },
    ]

    const out = replaceImagePathPlaceholders(input as any, "x@@y")

    expect(out).toEqual(input)
  })

  it("does not mutate input objects (clones per transformation)", () => {
    const t1: any = { raw: "i-__IMAGE_PATH__" }
    const t2: any = { raw: "noop" }
    const input = [t1, t2]

    const out = replaceImagePathPlaceholders(input as any, "a@@b")

    expect(out[0]).not.toBe(t1)
    expect(out[1]).not.toBe(t2)
    expect(t1.raw).toBe("i-__IMAGE_PATH__")
    expect(out[0].raw).toBe("i-a@@b")
  })
})
