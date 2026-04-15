import { describe, expect, it } from "vitest"
import {
  bumpLocalChangeVersion,
  hasUnsyncedChanges,
  shouldMarkSyncedAfterSave,
} from "./templateSyncVersioning"

describe("templateSyncVersioning", () => {
  it("detects unsynced changes via version mismatch", () => {
    expect(
      hasUnsyncedChanges({ localChangeVersion: 1, lastSyncedVersion: 1 }),
    ).toBe(false)
    expect(
      hasUnsyncedChanges({ localChangeVersion: 2, lastSyncedVersion: 1 }),
    ).toBe(true)
  })

  it("bumps local version monotonically", () => {
    expect(bumpLocalChangeVersion(0)).toBe(1)
    expect(bumpLocalChangeVersion(41)).toBe(42)
  })

  it("marks synced only when no changes happened during save", () => {
    expect(
      shouldMarkSyncedAfterSave({
        saveStartedAtVersion: 3,
        localChangeVersionAtCompletion: 3,
      }),
    ).toBe(true)

    expect(
      shouldMarkSyncedAfterSave({
        saveStartedAtVersion: 3,
        localChangeVersionAtCompletion: 4,
      }),
    ).toBe(false)
  })
})
