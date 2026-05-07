import { describe, expect, it } from "vitest"
import { extractImagePath, isStepAligned, safeBtoa } from "./index"

describe("utils (url + numeric helpers)", () => {
  describe("extractImagePath", () => {
    it("extracts path after the ImageKit id and converts folders to @@ (absolute URL)", () => {
      expect(
        extractImagePath("https://ik.imagekit.io/abc/f1/f2/pikachu.png"),
      ).toBe("f1@@f2@@pikachu.png")
    })

    it("strips query params before extracting", () => {
      expect(
        extractImagePath(
          "https://ik.imagekit.io/abc/folder/pikachu.png?tr=w-100",
        ),
      ).toBe("folder@@pikachu.png")
    })

    it("handles non-URL paths by dropping the first segment", () => {
      expect(extractImagePath("/abc/folder/pikachu.png")).toBe(
        "folder@@pikachu.png",
      )
      expect(extractImagePath("abc/folder/pikachu.png")).toBe(
        "folder@@pikachu.png",
      )
    })

    it("falls back gracefully for malformed URLs", () => {
      expect(extractImagePath("not a url at all/abc/f.png")).toBe("abc@@f.png")
    })
  })

  describe("isStepAligned", () => {
    it("treats non-numeric/intermediate input as aligned (UI-friendly)", () => {
      expect(isStepAligned("", 0.1)).toBe(true)
      expect(isStepAligned("-", 0.1)).toBe(true)
      expect(isStepAligned("abc", 0.1)).toBe(true)
    })

    it("checks alignment without floating point drift", () => {
      expect(isStepAligned("1.2", 0.1)).toBe(true)
      expect(isStepAligned("1.25", 0.1)).toBe(false)
      expect(isStepAligned("0.3", 0.05)).toBe(true)
    })

    it("treats step=0 as aligned", () => {
      expect(isStepAligned("1.234", 0)).toBe(true)
    })
  })

  describe("safeBtoa", () => {
    it("base64 encodes in node environments", () => {
      expect(safeBtoa("hello")).toBe("aGVsbG8=")
    })
  })
})
