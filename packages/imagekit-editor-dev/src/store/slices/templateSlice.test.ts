import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { type Transformation, useEditorStore } from ".."
import { borderTransform } from "../test/helpers"

beforeEach(() => {
  useEditorStore.getState().destroy()
})

afterEach(() => {
  useEditorStore.getState().destroy()
})

describe("templateSlice", () => {
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

  it("setTemplateId", () => {
    useEditorStore.getState().setTemplateId("abc")
    expect(useEditorStore.getState().templateId).toBe("abc")
  })

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

  it("denyTemplateStorageAccessAndReset resets the store to the default state", () => {
    useEditorStore.getState().loadTemplate([borderTransform()])
    useEditorStore.getState().denyTemplateStorageAccessAndReset("gone")
    const s = useEditorStore.getState()
    expect(s.transformations).toHaveLength(0)
    expect(s.storageError).toBe("gone")
    expect(s.templateStorageWriteBlocked).toBe(true)
  })
})
