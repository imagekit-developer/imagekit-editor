import { describe, expect, it } from "vitest"
import { DEFAULT_STATE as DEFAULT_STATE_FROM_STORE } from "."
import { DEFAULT_STATE as DEFAULT_STATE_FROM_MODULE } from "./initialState"

describe("DEFAULT_STATE", () => {
  it("is the same reference when imported from ./store or ./store/initialState", () => {
    expect(DEFAULT_STATE_FROM_STORE).toBe(DEFAULT_STATE_FROM_MODULE)
  })

  it("exports the blank-editor baseline from the store barrel", () => {
    const DEFAULT_STATE = DEFAULT_STATE_FROM_STORE
    expect(DEFAULT_STATE.currentImage).toBeUndefined()
    expect(DEFAULT_STATE.originalImageList).toEqual([])
    expect(DEFAULT_STATE.imageList).toEqual([])
    expect(DEFAULT_STATE.transformations).toEqual([])
    expect(DEFAULT_STATE.visibleTransformations).toEqual({})
    expect(DEFAULT_STATE.showOriginal).toBe(false)
    expect(DEFAULT_STATE.signer).toBeUndefined()
    expect(DEFAULT_STATE.signingImages).toEqual({})
    expect(DEFAULT_STATE.signingAbortControllers).toEqual({})
    expect(DEFAULT_STATE.signedUrlCache).toEqual({})
    expect(DEFAULT_STATE.currentTransformKey).toBe("")
    expect(DEFAULT_STATE.focusObjects).toBeUndefined()
    expect(DEFAULT_STATE._internalState).toEqual({
      sidebarState: "none",
      selectedTransformationKey: null,
      transformationToEdit: null,
    })
    expect(DEFAULT_STATE.templateName).toBe("Untitled Template")
    expect(DEFAULT_STATE.templateId).toBeNull()
    expect(DEFAULT_STATE.templateIsPrivate).toBeNull()
    expect(DEFAULT_STATE.syncStatus).toBe("unsaved")
    expect(DEFAULT_STATE.storageError).toBeUndefined()
    expect(DEFAULT_STATE.isPristine).toBe(true)
    expect(DEFAULT_STATE.templateStorageWriteBlocked).toBe(false)
    expect(DEFAULT_STATE.localChangeVersion).toBe(0)
    expect(DEFAULT_STATE.lastSyncedVersion).toBe(0)
    expect(DEFAULT_STATE.lastSavedAt).toBeNull()
    expect(DEFAULT_STATE.transformationConfigFormDirty).toBe(false)
  })
})
