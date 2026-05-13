import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  TRANSFORMATION_STATE_VERSION,
  type Transformation,
  useEditorStore,
} from ".."
import { borderTransform, resizeTransform } from "../test/helpers"

beforeEach(() => {
  useEditorStore.getState().destroy()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("transformationsSlice", () => {
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
    expect(useEditorStore.getState().visibleTransformations[id]).not.toBe(false)
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
    const id = useEditorStore.getState().addTransformation(borderTransform(), 0)
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

  it("setShowOriginal", () => {
    useEditorStore.getState().setShowOriginal(true)
    expect(useEditorStore.getState().showOriginal).toBe(true)
  })
})
