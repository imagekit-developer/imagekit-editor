import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useEditorStore } from ".."

beforeEach(() => {
  useEditorStore.getState().destroy()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("sidebarSlice", () => {
  it("_setSidebarState", () => {
    useEditorStore.getState()._setSidebarState("config")
    expect(useEditorStore.getState()._internalState.sidebarState).toBe("config")
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
