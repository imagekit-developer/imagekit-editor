import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEditorStore } from ".."
import { SAMPLE_URL } from "../test/helpers"

beforeEach(() => {
  useEditorStore.getState().destroy()
  vi.restoreAllMocks()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("imagesSlice", () => {
  it("setCurrentImage", () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    useEditorStore.getState().setCurrentImage(undefined)
    expect(useEditorStore.getState().currentImage).toBeUndefined()
  })

  it("setImageDimensions updates matching file only", () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    useEditorStore.getState().setImageDimensions("https://unknown.test/x.jpg", {
      width: 1,
      height: 1,
    })
    expect(
      useEditorStore.getState().originalImageList[0].imageDimensions,
    ).toBeNull()

    useEditorStore.getState().setImageDimensions(SAMPLE_URL, {
      width: 400,
      height: 300,
    })
    expect(
      useEditorStore.getState().originalImageList[0].imageDimensions,
    ).toEqual({
      width: 400,
      height: 300,
    })
  })

  it("addImage appends new url and switches current", () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    useEditorStore.getState().addImage("https://example.com/second.jpg")
    expect(useEditorStore.getState().originalImageList).toHaveLength(2)
    expect(useEditorStore.getState().currentImage).toContain("second.jpg")
  })

  it("addImage existing url only switches current", () => {
    useEditorStore.getState().initialize({
      imageList: [SAMPLE_URL, "https://example.com/b.jpg"],
    })
    const before = useEditorStore.getState().originalImageList.length
    useEditorStore.getState().addImage(SAMPLE_URL)
    expect(useEditorStore.getState().originalImageList).toHaveLength(before)
    expect(useEditorStore.getState().currentImage).toBe(SAMPLE_URL)
  })

  it("addImages skips duplicates", () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    useEditorStore
      .getState()
      .addImages([SAMPLE_URL, "https://example.com/new.jpg"])
    expect(useEditorStore.getState().originalImageList).toHaveLength(2)
  })

  it("removeImage switches current when removing active", () => {
    useEditorStore.getState().initialize({
      imageList: [
        SAMPLE_URL,
        "https://example.com/a.jpg",
        "https://example.com/b.jpg",
      ],
    })
    useEditorStore.getState().setCurrentImage("https://example.com/a.jpg")
    useEditorStore.getState().removeImage("https://example.com/a.jpg")
    expect(useEditorStore.getState().currentImage).toBe(
      "https://example.com/b.jpg",
    )
  })

  it("removeImage picks prior image when removing last item", () => {
    useEditorStore.getState().initialize({
      imageList: [SAMPLE_URL, "https://example.com/a.jpg"],
    })
    useEditorStore.getState().setCurrentImage("https://example.com/a.jpg")
    useEditorStore.getState().removeImage("https://example.com/a.jpg")
    expect(useEditorStore.getState().currentImage).toBe(SAMPLE_URL)
  })

  it("removeImage clears current when list becomes empty", () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    useEditorStore.getState().removeImage(SAMPLE_URL)
    expect(useEditorStore.getState().currentImage).toBeUndefined()
  })

  it("removeImage clears signing state for that url", () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    const ac = new AbortController()
    useEditorStore.setState({
      signingImages: { [SAMPLE_URL]: true },
      signingAbortControllers: { [SAMPLE_URL]: ac },
      signedUrlCache: { [`${SAMPLE_URL}::[]`]: "cached" },
    })
    const spy = vi.spyOn(ac, "abort")
    useEditorStore.getState().removeImage(SAMPLE_URL)
    expect(spy).toHaveBeenCalled()
    expect(useEditorStore.getState().signingImages[SAMPLE_URL]).toBeUndefined()
  })
})
