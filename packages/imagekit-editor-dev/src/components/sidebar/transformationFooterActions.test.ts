import { describe, expect, it } from "vitest"
import { getTransformationFooterActionsConfig } from "./transformation-config-sidebar"

describe("getTransformationFooterActionsConfig", () => {
  it("is fullySynced when no dirty, no unsynced, and last save is saved", () => {
    const cfg = getTransformationFooterActionsConfig({
      isDirty: false,
      syncStatus: "saved",
      hasAppliedInSession: true,
      templateStorageWriteBlocked: false,
      hasUnsyncedChanges: false,
    })
    expect(cfg.mode).toBe("fullySynced")
    expect(cfg.primary.disabled).toBe(true)
  })

  it("shows applyFlow when form is dirty", () => {
    const cfg = getTransformationFooterActionsConfig({
      isDirty: true,
      syncStatus: "saved",
      hasAppliedInSession: true,
      templateStorageWriteBlocked: false,
      hasUnsyncedChanges: false,
    })
    expect(cfg.mode).toBe("applyFlow")
    expect(cfg.primary.label).toBe("Apply")
  })

  it("shows saveFlow after apply when there are unsynced changes", () => {
    const cfg = getTransformationFooterActionsConfig({
      isDirty: false,
      syncStatus: "saved",
      hasAppliedInSession: true,
      templateStorageWriteBlocked: false,
      hasUnsyncedChanges: true,
    })
    expect(cfg.mode).toBe("saveFlow")
    expect(cfg.primary.label).toBe("Save Changes")
  })
})
