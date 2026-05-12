import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  TRANSFORMATION_STATE_VERSION,
  type Transformation,
  useEditorStore,
} from "./store"

const SAMPLE_URL = "https://ik.imagekit.io/demo/tr:f-auto/sample.jpg"

function borderTransform(): Omit<Transformation, "id"> {
  return {
    key: "adjust-border",
    name: "Border",
    type: "transformation",
    value: { borderWidth: 2, borderColor: "#000000" },
    version: TRANSFORMATION_STATE_VERSION,
  }
}

function resizeTransform(): Omit<Transformation, "id"> {
  return {
    key: "resize_and_crop-resize_and_crop",
    name: "Resize",
    type: "transformation",
    value: {
      width: 100,
      height: 100,
      mode: "cm-pad_extract",
    },
    version: TRANSFORMATION_STATE_VERSION,
  }
}

beforeEach(() => {
  useEditorStore.getState().destroy()
  vi.restoreAllMocks()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("useEditorStore", () => {
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

  describe("images", () => {
    it("setCurrentImage", () => {
      useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
      useEditorStore.getState().setCurrentImage(undefined)
      expect(useEditorStore.getState().currentImage).toBeUndefined()
    })

    it("setImageDimensions updates matching file only", () => {
      useEditorStore.getState().initialize({ imageList: [SAMPLE_URL] })
      useEditorStore
        .getState()
        .setImageDimensions("https://unknown.test/x.jpg", {
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
      expect(
        useEditorStore.getState().signingImages[SAMPLE_URL],
      ).toBeUndefined()
    })
  })

  describe("transformations", () => {
    it("loadTemplate assigns ids, versions, visibility from enabled", () => {
      useEditorStore
        .getState()
        .loadTemplate([{ ...borderTransform(), enabled: false }])
      const s = useEditorStore.getState()
      expect(s.transformations).toHaveLength(1)
      expect(s.transformations[0].version).toBe(TRANSFORMATION_STATE_VERSION)
      expect(s.visibleTransformations[s.transformations[0].id]).toBe(false)
      expect(s.syncStatus).toBe("saved")
      expect(s.localChangeVersion).toBe(s.lastSyncedVersion)
    })

    it("moveTransformation reorders and bumps version", () => {
      useEditorStore
        .getState()
        .loadTemplate([borderTransform(), resizeTransform()])
      const [a, b] = useEditorStore.getState().transformations
      const v0 = useEditorStore.getState().localChangeVersion
      useEditorStore.getState().moveTransformation(b.id, a.id)
      const order = useEditorStore.getState().transformations.map((t) => t.id)
      expect(order[0]).toBe(b.id)
      expect(useEditorStore.getState().localChangeVersion).toBeGreaterThan(v0)
    })

    it("moveTransformation no-op when ids invalid", () => {
      useEditorStore.getState().loadTemplate([borderTransform()])
      const v0 = useEditorStore.getState().localChangeVersion
      useEditorStore.getState().moveTransformation("nope", "nah")
      expect(useEditorStore.getState().localChangeVersion).toBe(v0)
    })

    it("toggleTransformationVisibility updates visible map and transformation.enabled", () => {
      useEditorStore.getState().loadTemplate([borderTransform()])
      const id = useEditorStore.getState().transformations[0].id
      expect(useEditorStore.getState().visibleTransformations[id]).not.toBe(
        false,
      )
      useEditorStore.getState().toggleTransformationVisibility(id)
      expect(useEditorStore.getState().visibleTransformations[id]).toBe(false)
      expect(useEditorStore.getState().transformations[0].enabled).toBe(false)
    })

    it("addTransformation appends", () => {
      useEditorStore.getState().loadTemplate([])
      const id = useEditorStore.getState().addTransformation(borderTransform())
      expect(
        useEditorStore.getState().transformations.map((t) => t.id),
      ).toContain(id)
      expect(useEditorStore.getState().visibleTransformations[id]).toBe(true)
    })

    it("addTransformation inserts at position", () => {
      useEditorStore
        .getState()
        .loadTemplate([resizeTransform(), borderTransform()])
      const id = useEditorStore
        .getState()
        .addTransformation(borderTransform(), 0)
      expect(useEditorStore.getState().transformations[0].id).toBe(id)
    })

    it("removeTransformation", () => {
      useEditorStore.getState().loadTemplate([borderTransform()])
      const id = useEditorStore.getState().transformations[0].id
      useEditorStore.getState().removeTransformation(id)
      expect(useEditorStore.getState().transformations).toHaveLength(0)
    })

    it("updateTransformation preserves id", () => {
      useEditorStore.getState().loadTemplate([borderTransform()])
      const id = useEditorStore.getState().transformations[0].id
      const updated: Transformation = {
        ...useEditorStore.getState().transformations[0],
        name: "Renamed",
      }
      useEditorStore.getState().updateTransformation(id, updated)
      expect(useEditorStore.getState().transformations[0].name).toBe("Renamed")
      expect(useEditorStore.getState().transformations[0].id).toBe(id)
    })
  })

  describe("template metadata & sync helpers", () => {
    it("setTemplateName bumps version when name changes", () => {
      const v0 = useEditorStore.getState().localChangeVersion
      useEditorStore.getState().setTemplateName("A")
      expect(useEditorStore.getState().localChangeVersion).toBeGreaterThan(v0)
      const v1 = useEditorStore.getState().localChangeVersion
      useEditorStore.getState().setTemplateName("A")
      expect(useEditorStore.getState().localChangeVersion).toBe(v1)
    })

    it("setTemplateIsPrivate bumps only when value changes", () => {
      useEditorStore.getState().setTemplateIsPrivate(true)
      const v = useEditorStore.getState().localChangeVersion
      useEditorStore.getState().setTemplateIsPrivate(true)
      expect(useEditorStore.getState().localChangeVersion).toBe(v)
      useEditorStore.getState().setTemplateIsPrivate(false)
      expect(useEditorStore.getState().localChangeVersion).toBeGreaterThan(v)
    })

    it("hydrateTemplateMetadata", () => {
      useEditorStore.getState().hydrateTemplateMetadata({
        templateId: "z",
        templateName: "Z",
        templateIsPrivate: false,
      })
      const s = useEditorStore.getState()
      expect(s.templateId).toBe("z")
      expect(s.templateName).toBe("Z")
      expect(s.templateIsPrivate).toBe(false)
    })

    it("setSyncStatus with optional error", () => {
      useEditorStore.getState().setSyncStatus("error", "e")
      expect(useEditorStore.getState().storageError).toBe("e")
    })

    it("markSynced with and without explicit version", () => {
      useEditorStore.setState({
        localChangeVersion: 7,
        lastSyncedVersion: 1,
      })
      useEditorStore.getState().markSynced(5)
      expect(useEditorStore.getState().lastSyncedVersion).toBe(5)
      useEditorStore.getState().markSynced()
      expect(useEditorStore.getState().lastSyncedVersion).toBe(7)
    })

    it("bumpLocalChangeVersion", () => {
      const v = useEditorStore.getState().localChangeVersion
      useEditorStore.getState().bumpLocalChangeVersion()
      expect(useEditorStore.getState().localChangeVersion).toBe(v + 1)
    })

    it("setLastSavedAt and setTransformationConfigFormDirty and setIsPristine", () => {
      useEditorStore.getState().setLastSavedAt(12345)
      expect(useEditorStore.getState().lastSavedAt).toBe(12345)
      useEditorStore.getState().setTransformationConfigFormDirty(true)
      expect(useEditorStore.getState().transformationConfigFormDirty).toBe(true)
      useEditorStore.getState().setIsPristine(false)
      expect(useEditorStore.getState().isPristine).toBe(false)
    })

    it("setShowOriginal", () => {
      useEditorStore.getState().setShowOriginal(true)
      expect(useEditorStore.getState().showOriginal).toBe(true)
    })

    it("setTemplateId", () => {
      useEditorStore.getState().setTemplateId("abc")
      expect(useEditorStore.getState().templateId).toBe("abc")
    })
  })

  describe("session reset & recovery", () => {
    it("resetToNewTemplate", () => {
      useEditorStore.setState({
        transformations: [{ id: "x", ...borderTransform() } as Transformation],
        templateName: "Old",
        templateId: "id",
        localChangeVersion: 9,
      })
      useEditorStore.getState().resetToNewTemplate()
      const s = useEditorStore.getState()
      expect(s.transformations).toHaveLength(0)
      expect(s.templateId).toBeNull()
      expect(s.localChangeVersion).toBe(0)
      expect(s.syncStatus).toBe("unsaved")
    })

    it("restoreSession", () => {
      useEditorStore.getState().restoreSession({
        transformations: [{ id: "x", ...borderTransform() } as Transformation],
        visibleTransformations: { x: true },
        templateName: "R",
        templateId: "tid",
        templateIsPrivate: true,
        syncStatus: "saved",
        isPristine: false,
        localChangeVersion: 3,
        lastSyncedVersion: 3,
        lastSavedAt: 99,
      })
      const s = useEditorStore.getState()
      expect(s.templateName).toBe("R")
      expect(s.templateStorageWriteBlocked).toBe(false)
      expect(s.transformationConfigFormDirty).toBe(false)
      expect(s.lastSavedAt).toBe(99)
    })

    it("blockTemplateStorageWrites uses default message when omitted", () => {
      useEditorStore.getState().blockTemplateStorageWrites()
      expect(useEditorStore.getState().storageError).toBe(
        "You no longer have access to this template.",
      )
      expect(useEditorStore.getState().templateStorageWriteBlocked).toBe(true)
    })

    it("denyTemplateStorageAccessAndReset", () => {
      useEditorStore.getState().loadTemplate([borderTransform()])
      useEditorStore.getState().denyTemplateStorageAccessAndReset("gone")
      const s = useEditorStore.getState()
      expect(s.transformations).toHaveLength(0)
      expect(s.storageError).toBe("gone")
      expect(s.templateStorageWriteBlocked).toBe(true)
    })
  })

  describe("_internal UI helpers", () => {
    it("_setSidebarState", () => {
      useEditorStore.getState()._setSidebarState("config")
      expect(useEditorStore.getState()._internalState.sidebarState).toBe(
        "config",
      )
    })

    it("_setSelectedTransformationKey", () => {
      useEditorStore.getState()._setSelectedTransformationKey("k")
      expect(
        useEditorStore.getState()._internalState.selectedTransformationKey,
      ).toBe("k")
    })

    it("_setTransformationToEdit clears when empty id", () => {
      useEditorStore.getState()._setTransformationToEdit("x", "inplace")
      useEditorStore.getState()._setTransformationToEdit("")
      expect(
        useEditorStore.getState()._internalState.transformationToEdit,
      ).toBeNull()
    })

    it("_setTransformationToEdit inplace above below", () => {
      useEditorStore.getState()._setTransformationToEdit("t1", "inplace")
      expect(
        useEditorStore.getState()._internalState.transformationToEdit,
      ).toEqual({
        transformationId: "t1",
        position: "inplace",
      })
      useEditorStore.getState()._setTransformationToEdit("t2", "above")
      expect(
        useEditorStore.getState()._internalState.transformationToEdit,
      ).toEqual({
        position: "above",
        targetId: "t2",
      })
      useEditorStore.getState()._setTransformationToEdit("t3", "below")
      expect(
        useEditorStore.getState()._internalState.transformationToEdit,
      ).toEqual({
        position: "below",
        targetId: "t3",
      })
    })
  })

  describe("recomputeImages (subscriptions)", () => {
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
      const urls = Object.keys(
        useEditorStore.getState().signingAbortControllers,
      )
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
})
