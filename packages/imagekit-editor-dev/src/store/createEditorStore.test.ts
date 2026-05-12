import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEditorStore } from "."
import { borderTransform, resizeTransform, SAMPLE_URL } from "./test/helpers"

beforeEach(() => {
  useEditorStore.getState().destroy()
  vi.restoreAllMocks()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("createEditorStore (image pipeline subscriptions)", () => {
  it("computes imageList after template load", async () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    useEditorStore.getState().loadTemplate([borderTransform()])
    await vi.waitFor(() => {
      expect(useEditorStore.getState().imageList[0]).not.toBe(SAMPLE_URL)
    })
    expect(useEditorStore.getState().currentTransformKey).not.toBe("")
  })

  it("showOriginal passes raw url without transforms", async () => {
    useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
    useEditorStore.getState().loadTemplate([borderTransform()])
    await vi.waitFor(() =>
      expect(useEditorStore.getState().currentTransformKey).not.toBe(""),
    )
    useEditorStore.getState().setShowOriginal(true)
    await vi.waitFor(() => {
      expect(useEditorStore.getState().currentTransformKey).toBe("original")
    })
    expect(useEditorStore.getState().imageList[0]).toBe(SAMPLE_URL)
  })

  it("signed URL path invokes signer and caches result", async () => {
    const signer = vi.fn().mockResolvedValue("https://signed.example/img")
    useEditorStore.getState().initialize({
      imageList: [
        {
          url: SAMPLE_URL,
          metadata: { requireSignedUrl: true },
        },
      ],
      signer,
    })
    useEditorStore.getState().loadTemplate([borderTransform()])
    await vi.waitFor(() => expect(signer).toHaveBeenCalled())
    await vi.waitFor(() => {
      expect(useEditorStore.getState().imageList[0]).toBe(
        "https://signed.example/img",
      )
    })
    const cacheKeys = Object.keys(useEditorStore.getState().signedUrlCache)
    expect(cacheKeys.length).toBeGreaterThan(0)
  })

  it("aborts pending signers when transform stack identity changes", async () => {
    const signer = vi
      .fn()
      .mockImplementation(() => new Promise<string>(() => {}))
    useEditorStore.getState().initialize({
      imageList: [{ url: SAMPLE_URL, metadata: { requireSignedUrl: true } }],
      signer,
    })
    useEditorStore.getState().loadTemplate([borderTransform()])
    await vi.waitFor(() => expect(signer).toHaveBeenCalled())
    const urls = Object.keys(useEditorStore.getState().signingAbortControllers)
    expect(urls.length).toBeGreaterThan(0)
    const controller =
      useEditorStore.getState().signingAbortControllers[urls[0]]
    const spy = vi.spyOn(controller, "abort")
    useEditorStore.getState().loadTemplate([resizeTransform()])
    await vi.waitFor(() => expect(spy).toHaveBeenCalled())
  })

  it("signer rejection logs non-abort errors", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const signer = vi.fn().mockRejectedValue(new Error("fail"))
    useEditorStore.getState().initialize({
      imageList: [
        {
          url: SAMPLE_URL,
          metadata: { requireSignedUrl: true },
        },
      ],
      signer,
    })
    useEditorStore.getState().loadTemplate([borderTransform()])
    await vi.waitFor(() => expect(errSpy).toHaveBeenCalled())
    errSpy.mockRestore()
  })
})
