import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../context/TemplateStorageContext"
import { useEditorStore } from "../store"
import {
  DEBOUNCE_MS,
  INTERVAL_SAVE_MS,
  useAutoSaveTemplate,
} from "./useAutoSaveTemplate"

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

function MountAutoSave() {
  useAutoSaveTemplate()
  return null
}

const saved = {
  id: "t1",
  clientNumber: "c1",
  isPrivate: false,
  name: "T",
  transformations: [],
  isPinned: false,
  createdBy: { userId: "u1", name: "U", email: "u@x.com" },
  updatedBy: { userId: "u1", name: "U", email: "u@x.com" },
  createdAt: 1,
  updatedAt: 2,
}

describe("useAutoSaveTemplate", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    vi.restoreAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("does not auto_interval save when template storage writes are blocked", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(saved)

    useEditorStore.setState({
      templateId: "t1",
      templateStorageWriteBlocked: true,
      isPristine: false,
      localChangeVersion: 3,
      lastSyncedVersion: 1,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountAutoSave />
      </TemplateStorageContextProvider>,
    )

    vi.advanceTimersByTime(INTERVAL_SAVE_MS)
    await vi.runOnlyPendingTimersAsync()

    expect(saveTemplate).not.toHaveBeenCalled()
  })

  it("debounces auto_metadata save when template name changes", async () => {
    const saveTemplate = vi
      .fn()
      .mockImplementation(async (input: { name: string }) => ({
        ...saved,
        name: input.name,
      }))

    useEditorStore.setState({
      templateId: "t1",
      templateName: "A",
      isPristine: false,
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountAutoSave />
      </TemplateStorageContextProvider>,
    )

    await act(async () => {
      useEditorStore.setState({ templateName: "B" } as Parameters<
        typeof useEditorStore.setState
      >[0])
    })
    vi.advanceTimersByTime(DEBOUNCE_MS - 1)
    expect(saveTemplate).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await vi.runOnlyPendingTimersAsync()

    expect(saveTemplate).toHaveBeenCalled()
    expect(saveTemplate.mock.calls[0][0].name).toBe("B")
  })

  it("fires auto_interval save when versions differ after interval", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(saved)

    useEditorStore.setState({
      templateId: "t1",
      templateName: "T",
      isPristine: false,
      localChangeVersion: 3,
      lastSyncedVersion: 1,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountAutoSave />
      </TemplateStorageContextProvider>,
    )

    vi.advanceTimersByTime(INTERVAL_SAVE_MS)
    await vi.runOnlyPendingTimersAsync()

    expect(saveTemplate).toHaveBeenCalled()
    expect(saveTemplate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        id: "t1",
        name: "T",
      }),
    )
  })

  it("does not auto_interval save when store is pristine i.e. no templateId or templateName", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(saved)

    useEditorStore.setState({
      templateId: "t1",
      isPristine: true,
      localChangeVersion: 2,
      lastSyncedVersion: 1,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountAutoSave />
      </TemplateStorageContextProvider>,
    )

    vi.advanceTimersByTime(INTERVAL_SAVE_MS)
    await vi.runOnlyPendingTimersAsync()

    expect(saveTemplate).not.toHaveBeenCalled()
  })

  it("does not auto_interval save when already synced", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(saved)

    useEditorStore.setState({
      templateId: "t1",
      isPristine: false,
      localChangeVersion: 2,
      lastSyncedVersion: 2,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountAutoSave />
      </TemplateStorageContextProvider>,
    )

    vi.advanceTimersByTime(INTERVAL_SAVE_MS)
    await vi.runOnlyPendingTimersAsync()

    expect(saveTemplate).not.toHaveBeenCalled()
  })
})
