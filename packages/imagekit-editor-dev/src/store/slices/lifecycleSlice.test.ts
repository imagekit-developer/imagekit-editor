import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEditorStore } from ".."
import { SAMPLE_URL } from "../test/helpers"

beforeEach(() => {
  useEditorStore.getState().destroy()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("lifecycleSlice", () => {
  describe("destroy", () => {
    it("resets to default template + empty images", () => {
      useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
      useEditorStore.getState().setTemplateName("X")
      useEditorStore.getState().destroy()

      const s = useEditorStore.getState()
      expect(s.templateName).toBe("Untitled Template")
      expect(s.originalImageList).toHaveLength(0)
      expect(s.transformations).toHaveLength(0)
      expect(s.localChangeVersion).toBe(0)
      expect(s.syncStatus).toBe("unsaved")
    })
  })

  describe("initialize", () => {
    it("no-op when nothing passed", () => {
      useEditorStore.getState().initialize()
      expect(useEditorStore.getState().originalImageList).toHaveLength(0)
    })

    it("loads images and sets current to first", () => {
      useEditorStore.getState().initialize({
        imageList: [SAMPLE_URL, "https://example.com/other.jpg"],
      })
      const s = useEditorStore.getState()
      expect(s.imageList.length).toBeGreaterThan(0)
      expect(s.currentImage).toBeTruthy()
      expect(s.originalImageList).toHaveLength(2)
    })

    it("stores signer and focusObjects", () => {
      const signer = vi.fn()
      useEditorStore.getState().initialize({
        imageList: [SAMPLE_URL],
        signer,
        focusObjects: ["foo"] as never,
      })
      expect(useEditorStore.getState().signer).toBe(signer)
      expect(useEditorStore.getState().focusObjects).toEqual(["foo"])
    })

    it("templateId sets pristine false and sync saved with versions reset", () => {
      useEditorStore.getState().initialize({ templateId: "tid-1" })
      const s = useEditorStore.getState()
      expect(s.templateId).toBe("tid-1")
      expect(s.isPristine).toBe(false)
      expect(s.syncStatus).toBe("saved")
      expect(s.localChangeVersion).toBe(0)
      expect(s.lastSyncedVersion).toBe(0)
    })

    it("templateName alone triggers same synced bootstrap", () => {
      useEditorStore.getState().initialize({ templateName: "Hello" })
      const s = useEditorStore.getState()
      expect(s.templateName).toBe("Hello")
      expect(s.syncStatus).toBe("saved")
      expect(s.isPristine).toBe(false)
    })
  })
})
