import "@testing-library/jest-dom/vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../context/TemplateStorageContext"
import {
  EDITOR_SESSION_STORAGE_KEY,
  readEditorSessionFromLocalStorage,
} from "../persistence/editorSessionStorage"
import type { TemplateRecord } from "../storage"
import { useEditorStore } from "../store"
import {
  PERSIST_DEBOUNCE_MS,
  persistEditorSessionNow,
  useEditorSessionLocalStorage,
} from "./useEditorSessionLocalStorage"
import { useTemplateSync } from "./useTemplateSync"

/**
 * Version model (same names as in product docs):
 * - **Memory** — live Zustand store (`localChangeVersion`, `lastSyncedVersion`).
 * - **Draft** — JSON snapshot in localStorage under `EDITOR_SESSION_STORAGE_KEY`.
 * - **Provider** — remote template storage; a successful save aligns `lastSyncedVersion`
 *   with the local revision that was uploaded.
 *
 * Regression we guard against (draft must track sync metadata, not only edits):
 * | Phase | Memory (local / synced) | Provider | Draft (stored lastSynced) |
 * |-------|-------------------------|----------|---------------------------|
 * | Before save | 1 / 0 | behind | 0 if never flushed after sync |
 * | After save | 1 / 1 | caught up | **must be 1** or reopen restores “unsaved” incorrectly |
 *
 * If the draft still says `lastSyncedVersion === 0` while memory says `1`, closing and
 * resuming can drop or confuse user work relative to what the provider actually stored.
 */

function savedRecord(overrides: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: "saved-id",
    clientNumber: "c1",
    isPrivate: false,
    name: "Saved",
    transformations: [],
    isPinned: false,
    createdBy: { userId: "u1", name: "U", email: "u@x.com" },
    updatedBy: { userId: "u1", name: "U", email: "u@x.com" },
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  }
}

function stubProvider(saveTemplate: ReturnType<typeof vi.fn>) {
  return {
    getProviderName: () => "test",
    getCurrentUserSession: () => ({}),
    listTemplates: async () => [],
    getTemplate: async () => null,
    saveTemplate,
    setTemplatePinned: async () => {
      throw new Error("not used")
    },
  }
}

function readDraftSyncVersions() {
  const session = readEditorSessionFromLocalStorage(EDITOR_SESSION_STORAGE_KEY)
  if (!session) return null
  return {
    localChangeVersion: session.state.localChangeVersion,
    lastSyncedVersion: session.state.lastSyncedVersion,
    syncStatus: session.state.syncStatus,
  }
}

function readMemorySyncVersions() {
  const s = useEditorStore.getState()
  return {
    localChangeVersion: s.localChangeVersion,
    lastSyncedVersion: s.lastSyncedVersion,
    syncStatus: s.syncStatus,
  }
}

function DraftAndSaveHarness(props: { paused?: boolean }) {
  useEditorSessionLocalStorage(props.paused ?? false)
  const { saveNow } = useTemplateSync()
  return (
    <button
      type="button"
      data-testid="save-to-provider"
      onClick={() => {
        void saveNow({ reason: "manual" })
      }}
    >
      Save
    </button>
  )
}

describe("localStorage session drafts vs provider sync", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    useEditorStore.getState().destroy()
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY)
  })

  it(
    "after local edits are ahead of the last provider save, a successful save updates the draft so " +
      "lastSyncedVersion matches — the draft must not keep an older lastSyncedVersion while memory already caught up with the provider",
    async () => {
      const saveTemplate = vi
        .fn()
        .mockResolvedValue(
          savedRecord({ id: "t-remote", name: "From provider" }),
        )

      useEditorStore.setState({
        templateId: "t-remote",
        templateName: "Local title",
        templateIsPrivate: false,
        localChangeVersion: 1,
        lastSyncedVersion: 0,
      } as Parameters<typeof useEditorStore.setState>[0])

      render(
        <TemplateStorageContextProvider
          provider={stubProvider(saveTemplate) as never}
        >
          <DraftAndSaveHarness />
        </TemplateStorageContextProvider>,
      )

      fireEvent.click(screen.getByTestId("save-to-provider"))

      await waitFor(() => {
        expect(useEditorStore.getState().syncStatus).toBe("saved")
      })

      const memory = readMemorySyncVersions()
      expect(memory.localChangeVersion).toBe(1)
      expect(memory.lastSyncedVersion).toBe(1)

      const draft = readDraftSyncVersions()
      expect(draft).not.toBeNull()
      expect(draft!.localChangeVersion).toBe(memory.localChangeVersion)
      expect(draft!.lastSyncedVersion).toBe(memory.lastSyncedVersion)
    },
  )

  it(
    "the in-memory draft snapshot always matches the store after persistEditorSessionNow " +
      "(so there is no split-brain where only memory knows the provider caught up)",
    async () => {
      const saveTemplate = vi.fn().mockResolvedValue(savedRecord({ id: "t1" }))

      useEditorStore.setState({
        templateId: "t1",
        templateName: "T",
        localChangeVersion: 2,
        lastSyncedVersion: 1,
      } as Parameters<typeof useEditorStore.setState>[0])

      render(
        <TemplateStorageContextProvider
          provider={stubProvider(saveTemplate) as never}
        >
          <DraftAndSaveHarness />
        </TemplateStorageContextProvider>,
      )

      fireEvent.click(screen.getByTestId("save-to-provider"))
      await waitFor(() => {
        expect(useEditorStore.getState().lastSyncedVersion).toBe(2)
      })

      expect(readDraftSyncVersions()).toEqual(readMemorySyncVersions())
    },
  )

  it(
    "if the user edits again while a provider save is still in flight, the save does not mark synced — " +
      "both memory and the draft still agree on localChangeVersion vs lastSyncedVersion after the request finishes",
    async () => {
      let finishSave!: (r: TemplateRecord) => void
      const gate = new Promise<TemplateRecord>((res) => {
        finishSave = res
      })
      const saveTemplate = vi.fn().mockReturnValue(gate)

      useEditorStore.setState({
        templateId: "t1",
        templateName: "T",
        localChangeVersion: 5,
        lastSyncedVersion: 4,
      } as Parameters<typeof useEditorStore.setState>[0])

      render(
        <TemplateStorageContextProvider
          provider={stubProvider(saveTemplate) as never}
        >
          <DraftAndSaveHarness />
        </TemplateStorageContextProvider>,
      )

      fireEvent.click(screen.getByTestId("save-to-provider"))
      await act(async () => {
        await Promise.resolve()
      })

      await act(async () => {
        useEditorStore.getState().bumpLocalChangeVersion()
        finishSave(savedRecord({ id: "t1", name: "T" }))
      })

      await waitFor(() => {
        expect(useEditorStore.getState().syncStatus).toBe("unsaved")
      })

      const memory = readMemorySyncVersions()
      expect(memory.localChangeVersion).toBe(6)
      expect(memory.lastSyncedVersion).toBe(4)

      const draft = readDraftSyncVersions()
      expect(draft).not.toBeNull()
      expect(draft!.localChangeVersion).toBe(memory.localChangeVersion)
      expect(draft!.lastSyncedVersion).toBe(memory.lastSyncedVersion)
    },
  )

  it(
    "restoring from the draft after a successful save reloads the same version counters — " +
      "simulating close and reopen without losing the fact that provider and draft agree",
    async () => {
      const saveTemplate = vi
        .fn()
        .mockResolvedValue(savedRecord({ id: "t-persist" }))

      useEditorStore.setState({
        templateId: "t-persist",
        templateName: "N",
        localChangeVersion: 1,
        lastSyncedVersion: 0,
      } as Parameters<typeof useEditorStore.setState>[0])

      render(
        <TemplateStorageContextProvider
          provider={stubProvider(saveTemplate) as never}
        >
          <DraftAndSaveHarness />
        </TemplateStorageContextProvider>,
      )

      fireEvent.click(screen.getByTestId("save-to-provider"))
      await waitFor(() => {
        expect(useEditorStore.getState().syncStatus).toBe("saved")
      })

      const session = readEditorSessionFromLocalStorage(
        EDITOR_SESSION_STORAGE_KEY,
      )
      expect(session).not.toBeNull()

      useEditorStore.getState().destroy()
      expect(useEditorStore.getState().localChangeVersion).toBe(0)

      useEditorStore.getState().restoreSession(session!.state)

      expect(useEditorStore.getState().localChangeVersion).toBe(1)
      expect(useEditorStore.getState().lastSyncedVersion).toBe(1)
    },
  )

  it("when provider save fails, the draft still reflects the error sync status so resume flow does not assume success", async () => {
    const saveTemplate = vi.fn().mockRejectedValue(new Error("network"))

    useEditorStore.setState({
      templateId: "t1",
      templateName: "T",
      localChangeVersion: 3,
      lastSyncedVersion: 2,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <DraftAndSaveHarness />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByTestId("save-to-provider"))
    await waitFor(() => {
      expect(useEditorStore.getState().syncStatus).toBe("error")
    })

    const draft = readDraftSyncVersions()
    expect(draft).not.toBeNull()
    expect(draft!.syncStatus).toBe("error")
    expect(draft!.localChangeVersion).toBe(3)
    expect(draft!.lastSyncedVersion).toBe(2)
  })
})

describe("localStorage session drafts — debounce vs immediate persist", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY)
    vi.useFakeTimers()
  })

  afterEach(() => {
    useEditorStore.getState().destroy()
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function HookOnlyHarness(props: { paused?: boolean }) {
    useEditorSessionLocalStorage(props.paused ?? false)
    return null
  }

  it(
    "without waiting for the debounced draft write, calling persistEditorSessionNow still writes the latest " +
      "lastSyncedVersion — avoiding a race where the draft would briefly stay on an older sync marker",
    () => {
      render(<HookOnlyHarness />)

      act(() => {
        vi.runAllTimers()
      })

      useEditorStore.setState({
        templateName: "X",
        templateId: "t1",
        localChangeVersion: 3,
        lastSyncedVersion: 2,
      } as Parameters<typeof useEditorStore.setState>[0])

      act(() => {
        useEditorStore.getState().markSynced(3)
      })

      persistEditorSessionNow()

      const draft = readDraftSyncVersions()
      expect(draft!.lastSyncedVersion).toBe(3)
      expect(draft!.localChangeVersion).toBe(3)
    },
  )

  it(
    "when persistence is paused (e.g. resume modal), persistEditorSessionNow does not overwrite localStorage — " +
      "so an in-flight provider result cannot clobber the snapshot the user is deciding about",
    () => {
      render(<HookOnlyHarness paused />)

      act(() => {
        vi.runAllTimers()
      })

      useEditorStore.setState({
        templateId: "t1",
        templateName: "T",
        localChangeVersion: 9,
        lastSyncedVersion: 9,
      } as Parameters<typeof useEditorStore.setState>[0])

      persistEditorSessionNow()

      expect(
        readEditorSessionFromLocalStorage(EDITOR_SESSION_STORAGE_KEY),
      ).toBeNull()
    },
  )

  it(
    "the hook schedules a debounced write when lastSyncedVersion changes without bumping localChangeVersion — " +
      "so subscription-driven drafts stay aligned after markSynced",
    () => {
      render(<HookOnlyHarness />)

      act(() => {
        vi.runAllTimers()
      })

      act(() => {
        useEditorStore.setState({
          templateId: "t1",
          templateName: "T",
          localChangeVersion: 4,
          lastSyncedVersion: 3,
        } as Parameters<typeof useEditorStore.setState>[0])
      })

      act(() => {
        useEditorStore.getState().markSynced(4)
      })

      act(() => {
        vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS)
      })

      const draft = readDraftSyncVersions()
      expect(draft!.localChangeVersion).toBe(4)
      expect(draft!.lastSyncedVersion).toBe(4)
    },
  )
})
