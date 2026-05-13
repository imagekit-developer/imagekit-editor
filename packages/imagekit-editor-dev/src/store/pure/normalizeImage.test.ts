import { describe, expect, it } from "vitest"
import { normalizeImage } from "./normalizeImage"

describe("normalizeImage", () => {
  it("maps string url to FileElement with unsigned metadata", () => {
    const el = normalizeImage("https://cdn.example.com/a.jpg")
    expect(el.url).toBe("https://cdn.example.com/a.jpg")
    expect(el.imageDimensions).toBeNull()
    expect(el.metadata.requireSignedUrl).toBe(false)
  })

  it("preserves and normalizes metadata on InputFileElement", () => {
    const el = normalizeImage({
      url: "https://x.com/i.png",
      metadata: { requireSignedUrl: true },
    })
    expect(el.metadata.requireSignedUrl).toBe(true)
  })

  it("defaults requireSignedUrl when metadata object is missing optional normalization path", () => {
    const el = normalizeImage({
      url: "https://x.com/i.png",
      metadata: { requireSignedUrl: false },
    })
    expect(el.metadata.requireSignedUrl).toBe(false)
  })

  it("defaults metadata when missing on object input (runtime)", () => {
    const el = normalizeImage({
      url: "https://x.com/i.png",
      // @ts-expect-error intentional loose payload
      metadata: undefined,
    })
    expect(el.metadata.requireSignedUrl).toBe(false)
  })
})
