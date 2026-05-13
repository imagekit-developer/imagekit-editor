import type { Transformation as IKTransformation } from "@imagekit/javascript"
import { describe, expect, it, vi } from "vitest"
import {
  type FileElement,
  TRANSFORMATION_STATE_VERSION,
  type Transformation,
} from "../types"
import {
  calculateImageList,
  replaceImagePathPlaceholders,
} from "./calculateImageList"

const SAMPLE_URL = "https://ik.imagekit.io/demo/tr:f-auto/sample.jpg"

function borderTransformation(id: string): Transformation {
  return {
    id,
    key: "adjust-border",
    name: "Border",
    type: "transformation",
    value: { borderWidth: 2, borderColor: "#000000" },
    version: TRANSFORMATION_STATE_VERSION,
  }
}

describe("replaceImagePathPlaceholders", () => {
  it("returns clones with __IMAGE_PATH__ replaced", () => {
    const input: IKTransformation[] = [
      { raw: "tr:w-100,l-image,i-__IMAGE_PATH__,l-end" } as IKTransformation,
    ]
    const out = replaceImagePathPlaceholders(input, "my-path")
    expect(out[0].raw).toBe("tr:w-100,l-image,i-my-path,l-end")
  })

  it("leaves transformations without placeholder unchanged", () => {
    const input: IKTransformation[] = [{ w: 50 } as IKTransformation]
    expect(replaceImagePathPlaceholders(input, "p")).toEqual(input)
  })
})

describe("calculateImageList", () => {
  it("uses original transform key when showOriginal is true", () => {
    const img: FileElement = {
      url: SAMPLE_URL,
      metadata: { requireSignedUrl: false },
      imageDimensions: null,
    }
    const { transformKey, imgs } = calculateImageList(
      [img],
      [borderTransformation("a")],
      { a: true },
      true,
      undefined,
      0,
      {},
    )
    expect(transformKey).toBe("original")
    expect(imgs[0]).toBe(SAMPLE_URL)
  })

  it("builds transformed URLs when not original", () => {
    const img: FileElement = {
      url: SAMPLE_URL,
      metadata: { requireSignedUrl: false },
      imageDimensions: null,
    }
    const { transformKey, imgs } = calculateImageList(
      [img],
      [borderTransformation("b")],
      { b: true },
      false,
      undefined,
      0,
      {},
    )
    expect(transformKey).not.toBe("original")
    expect(imgs[0]).not.toBe(SAMPLE_URL)
    expect(imgs[0]).toContain("ik.imagekit.io")
  })

  it("returns raw url when transformation chain is empty after filtering", () => {
    const img: FileElement = {
      url: SAMPLE_URL,
      metadata: { requireSignedUrl: false },
      imageDimensions: null,
    }
    const { imgs } = calculateImageList(
      [img],
      [borderTransformation("hidden")],
      { hidden: false },
      false,
      undefined,
      0,
      {},
    )
    expect(imgs[0]).toBe(SAMPLE_URL)
  })

  it("uses signedUrlCache when cache key matches", () => {
    const img: FileElement = {
      url: SAMPLE_URL,
      metadata: { requireSignedUrl: true },
      imageDimensions: null,
    }
    const t = borderTransformation("c")
    const signer = vi.fn()
    const first = calculateImageList(
      [img],
      [t],
      { c: true },
      false,
      signer,
      0,
      {},
    )
    expect(first.toSign).toHaveLength(1)
    const cacheKey = first.toSign[0].cacheKey

    const second = calculateImageList(
      [img],
      [t],
      { c: true },
      false,
      signer,
      0,
      { [cacheKey]: "https://signed-cache.example/img" },
    )
    expect(second.toSign).toHaveLength(0)
    expect(second.imgs[0]).toBe("https://signed-cache.example/img")
  })
})
