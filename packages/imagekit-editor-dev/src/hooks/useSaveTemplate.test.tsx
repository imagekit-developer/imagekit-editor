import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../context/TemplateStorageContext"
import { useEditorStore } from "../store"
import { useSaveTemplate } from "./useSaveTemplate"

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

function MountSaveShortcut() {
  useSaveTemplate()
  return null
}

describe("useSaveTemplate", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    vi.restoreAllMocks()
  })

  it("does not register shortcut when provider is null", () => {
    const addSpy = vi.spyOn(window, "addEventListener")
    render(
      <TemplateStorageContextProvider provider={null}>
        <MountSaveShortcut />
      </TemplateStorageContextProvider>,
    )
    expect(addSpy.mock.calls.filter((c) => c[0] === "keydown")).toHaveLength(0)
    addSpy.mockRestore()
  })

  it("triggers save on Ctrl+S", async () => {
    const saveTemplate = vi.fn().mockResolvedValue({
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
    })
    useEditorStore.setState({
      templateId: "t1",
      templateName: "T",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountSaveShortcut />
      </TemplateStorageContextProvider>,
    )

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "s",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    await waitFor(() => {
      expect(saveTemplate).toHaveBeenCalled()
    })
  })

  it("triggers save on Meta+S", async () => {
    const saveTemplate = vi.fn().mockResolvedValue({
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
    })
    useEditorStore.setState({
      templateId: "t1",
    } as Parameters<typeof useEditorStore.setState>[0])

    render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountSaveShortcut />
      </TemplateStorageContextProvider>,
    )

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "s",
          metaKey: true,
          bubbles: true,
        }),
      )
    })

    await waitFor(() => {
      expect(saveTemplate).toHaveBeenCalled()
    })
  })

  it("removes listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener")
    const saveTemplate = vi.fn().mockResolvedValue({
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
    })

    const { unmount } = render(
      <TemplateStorageContextProvider
        provider={stubProvider(saveTemplate) as never}
      >
        <MountSaveShortcut />
      </TemplateStorageContextProvider>,
    )

    unmount()
    expect(removeSpy.mock.calls.some((c) => c[0] === "keydown")).toBe(true)
    removeSpy.mockRestore()
  })
})
