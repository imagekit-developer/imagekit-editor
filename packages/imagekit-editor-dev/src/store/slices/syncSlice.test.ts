import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useEditorStore } from ".."

beforeEach(() => {
  useEditorStore.getState().destroy()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("syncSlice", () => {
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
})
