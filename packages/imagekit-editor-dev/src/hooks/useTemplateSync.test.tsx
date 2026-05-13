import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../context/TemplateStorageContext"
import type { SaveTemplateInput, TemplateRecord } from "../storage"
import { TemplateAccessDeniedError } from "../storage/templateAccessError"
import { useEditorStore } from "../store"
import { type SaveReason, useTemplateSync } from "./useTemplateSync"

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

function SaveTrigger(props: {
  reason?: SaveReason
  overrides?: Partial<Pick<SaveTemplateInput, "name" | "isPrivate">>
}) {
  const { saveNow, hasProvider } = useTemplateSync()
  return (
    <div>
      <span data-testid="has">{String(hasProvider)}</span>
      <button
        type="button"
        onClick={() => {
          void saveNow({
            reason: props.reason ?? "manual",
            ...(props.overrides !== undefined
              ? { overrides: props.overrides }
              : {}),
          })
        }}
      >
        save
      </button>
    </div>
  )
}

describe("useTemplateSync", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    vi.restoreAllMocks()
  })

  it("exposes hasProvider false when no storage context", () => {
    render(<SaveTrigger />)
    expect(screen.getByTestId("has").textContent).toBe("false")
  })

  it("does not call provider saveTemplate when there is no provider", () => {
    const saveTemplate = vi.fn()
    render(<SaveTrigger />)
    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(saveTemplate).not.toHaveBeenCalled()
  })

  it("returns null when template storage writes are blocked", () => {
    const saveTemplate = vi.fn().mockResolvedValue(savedRecord())
    useEditorStore.setState({
      templateStorageWriteBlocked: true,
      templateId: "t1",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(saveTemplate).not.toHaveBeenCalled()
  })

  it("skips auto save when templateId is null for auto_metadata", () => {
    const saveTemplate = vi.fn().mockResolvedValue(savedRecord())
    useEditorStore.setState({
      templateId: null,
      templateName: "X",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger reason="auto_metadata" />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(saveTemplate).not.toHaveBeenCalled()
  })

  it("skips auto_interval when templateId is null", () => {
    const saveTemplate = vi.fn().mockResolvedValue(savedRecord())

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger reason="auto_interval" />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(saveTemplate).not.toHaveBeenCalled()
  })

  it("calls saveTemplate and marks saved when no edits occur during save", async () => {
    const saveTemplate = vi
      .fn()
      .mockResolvedValue(savedRecord({ id: "new-id", name: "N" }))
    useEditorStore.setState({
      templateId: "old-id",
      templateName: "Old",
      localChangeVersion: 2,
      lastSyncedVersion: 1,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => {
      expect(useEditorStore.getState().syncStatus).toBe("saved")
    })
    expect(saveTemplate).toHaveBeenCalledTimes(1)
    const st = useEditorStore.getState()
    expect(st.templateId).toBe("new-id")
    expect(st.templateName).toBe("N")
  })

  it("sets unsaved when localChangeVersion changes during save", async () => {
    let release!: (r: TemplateRecord) => void
    const gate = new Promise<TemplateRecord>((res) => {
      release = res
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
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(saveTemplate).toHaveBeenCalled()

    await act(async () => {
      await Promise.resolve()
      useEditorStore.getState().bumpLocalChangeVersion()
      release(savedRecord({ id: "t1", name: "T" }))
    })

    await waitFor(() => {
      expect(useEditorStore.getState().syncStatus).toBe("unsaved")
    })
  })

  it("passes overrides.isPrivate to saveTemplate", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(savedRecord())
    useEditorStore.setState({
      templateId: "t1",
      templateName: "T",
      templateIsPrivate: false,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger overrides={{ isPrivate: true }} />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => {
      expect(saveTemplate).toHaveBeenCalled()
    })
    expect(saveTemplate.mock.calls[0][0]).toMatchObject({ isPrivate: true })
  })

  it("passes templateIsPrivate from store when overrides omit isPrivate", async () => {
    const saveTemplate = vi.fn().mockResolvedValue(savedRecord())
    useEditorStore.setState({
      templateId: "t1",
      templateName: "T",
      templateIsPrivate: true,
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => {
      expect(saveTemplate).toHaveBeenCalled()
    })
    expect(saveTemplate.mock.calls[0][0]).toMatchObject({ isPrivate: true })
  })

  it("blocks writes on TemplateAccessDeniedError", async () => {
    const saveTemplate = vi
      .fn()
      .mockRejectedValue(new TemplateAccessDeniedError())
    useEditorStore.setState({
      templateId: "t1",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => {
      expect(useEditorStore.getState().templateStorageWriteBlocked).toBe(true)
    })
    expect(useEditorStore.getState().syncStatus).toBe("error")
  })

  it("sets error sync status on generic failure", async () => {
    const saveTemplate = vi.fn().mockRejectedValue(new Error("network"))
    useEditorStore.setState({
      templateId: "t1",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => {
      expect(useEditorStore.getState().syncStatus).toBe("error")
    })
    expect(useEditorStore.getState().storageError).toBe("network")
  })

  it("blocks writes with default message when access error is not an Error instance", async () => {
    const saveTemplate = vi.fn().mockRejectedValue({ status: 403 })
    useEditorStore.setState({
      templateId: "t1",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => {
      expect(useEditorStore.getState().templateStorageWriteBlocked).toBe(true)
    })
    expect(useEditorStore.getState().storageError).toBe(
      "You no longer have access to this template.",
    )
  })

  it("sets generic error message when failure is not an Error instance", async () => {
    const saveTemplate = vi.fn().mockRejectedValue("boom")
    useEditorStore.setState({
      templateId: "t1",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    await waitFor(() => {
      expect(useEditorStore.getState().syncStatus).toBe("error")
    })
    expect(useEditorStore.getState().storageError).toBe(
      "Failed to save template",
    )
  })

  it("ignores overlapping saveNow calls while a save is in flight", async () => {
    let release!: (r: TemplateRecord) => void
    const gate = new Promise<TemplateRecord>((res) => {
      release = res
    })
    const saveTemplate = vi.fn().mockReturnValue(gate)

    useEditorStore.setState({
      templateId: "t1",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <SaveTrigger />
      </TemplateStorageContextProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "save" }))
    fireEvent.click(screen.getByRole("button", { name: "save" }))
    expect(saveTemplate).toHaveBeenCalledTimes(1)

    await act(async () => {
      release(savedRecord({ id: "t1" }))
    })
  })
})
