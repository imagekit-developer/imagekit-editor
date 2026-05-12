import { ChakraProvider } from "@chakra-ui/react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../../context/TemplateStorageContext"
import {
  DEBOUNCE_MS,
  INTERVAL_SAVE_MS,
  useAutoSaveTemplate,
} from "../../hooks/useAutoSaveTemplate"
import { APPLY_CHANGES_BEFORE_SAVE_MESSAGE } from "../../hooks/useSaveTemplate"
import { useEditorStore } from "../../store"
import { TransformationConfigSidebar } from "../sidebar/transformation-config-sidebar"
import { TemplateStatus } from "./TemplateStatus"

function AutoSaveHarness() {
  useAutoSaveTemplate()
  return null
}

function renderWithProvider(
  providerOverrides?: Partial<Record<string, unknown>>,
) {
  const provider = {
    getProviderName: () => "library",
    getCurrentUserSession: () => ({}),
    listTemplates: async () => [],
    getTemplate: async () => null,
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    saveTemplate: async (r: any) => ({
      id: "t1",
      clientNumber: "c1",
      isPrivate: true,
      name: r.name ?? "n",
      transformations: r.transformations ?? [],
      isPinned: false,
      createdBy: { userId: "u1", name: "U", email: "u@example.com" },
      updatedBy: { userId: "u1", name: "U", email: "u@example.com" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    setTemplatePinned: async () => {
      throw new Error("not used")
    },
    ...(providerOverrides ?? {}),
  }

  return render(
    <ChakraProvider>
      {/* biome-ignore lint/suspicious/noExplicitAny: test stub */}
      <TemplateStorageContextProvider provider={provider as any}>
        <AutoSaveHarness />
        <TemplateStatus />
      </TemplateStorageContextProvider>
    </ChakraProvider>,
  )
}

describe("TemplateStatus", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    vi.useFakeTimers()
  })

  function seedSyncedState(
    partial?: Partial<Parameters<typeof useEditorStore.setState>[0]>,
  ) {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
      ...(partial ?? {}),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])
  }

  function expectStartsSaved() {
    // Let any initial notification settle so we're truly in the persistent icon state.
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByLabelText("template-status-saved")).toBeTruthy()
  }

  function expectStaysUnsavedAfterDelay(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expect(screen.queryByLabelText("template-status-saved")).toBeNull()
  }

  it("shows unsaved local changes when there are unsynced edits even if syncStatus is saved", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 2,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()
    expect(screen.getByText("Unsaved local changes")).toBeTruthy()
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
  })

  it("shows unsaved when transformation config form has unapplied edits even if versions are synced", () => {
    useEditorStore.setState({
      isPristine: true,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      transformationConfigFormDirty: true,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()
    expect(screen.getByText("Unsaved local changes")).toBeTruthy()
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
  })

  it("disables Save in the status popover while transformation config has unapplied edits", () => {
    useEditorStore.setState({
      isPristine: true,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      transformationConfigFormDirty: true,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    fireEvent.click(screen.getByLabelText("template-status-unsaved"))
    expect(screen.getByText(APPLY_CHANGES_BEFORE_SAVE_MESSAGE)).toBeTruthy()
    expect(
      screen.getByRole("button", { name: /^save$/i }).hasAttribute("disabled"),
    ).toBe(true)
  })

  it("does not show the saved text while unsynced changes exist", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 2,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()
    expect(screen.queryByText(/Saved to library/i)).toBeNull()
    expect(screen.queryByLabelText("template-status-saved")).toBeNull()
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
  })

  it("after Apply, stays unsynced until manual save or INTERVAL_SAVE_MS elapses", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test stub provider signature
    const saveTemplate = vi.fn(async (r: any) => ({
      id: "t1",
      clientNumber: "c1",
      isPrivate: true,
      name: r.name ?? "n",
      transformations: r.transformations ?? [],
      isPinned: false,
      createdBy: { userId: "u1", name: "U", email: "u@example.com" },
      updatedBy: { userId: "u1", name: "U", email: "u@example.com" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))

    // Start in a fully synced "saved" state.
    useEditorStore.setState({
      templateId: "t1",
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ saveTemplate })

    // Simulate "Apply": committed store change but not saved.
    act(() => {
      useEditorStore.getState().addTransformation({
        key: "adjust-contrast",
        name: "Contrast",
        type: "transformation",
        // biome-ignore lint/suspicious/noExplicitAny: value type is IKTransformation; test doesn't need full typing
        value: { contrast: true } as any,
        enabled: true,
        // biome-ignore lint/suspicious/noExplicitAny: test doesn't care about store-side version stamping
        version: "v1" as any,
        // biome-ignore lint/suspicious/noExplicitAny: store action accepts partial transform in test
      } as any)
    })

    // After the 3s notification fades, it must STILL be unsynced (not green).
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expect(screen.queryByLabelText("template-status-saved")).toBeNull()

    // No save should happen before the interval.
    const remainingBeforeInterval = Math.max(0, INTERVAL_SAVE_MS - 3500 - 1)
    act(() => {
      vi.advanceTimersByTime(remainingBeforeInterval)
    })
    expect(saveTemplate).toHaveBeenCalledTimes(0)
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()

    // At the interval, the auto-save should run.
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })
    expect(saveTemplate).toHaveBeenCalledTimes(1)
  })

  it("does not auto-create a new template on blank slate (templateId=null)", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test stub provider signature
    const saveTemplate = vi.fn(async (r: any) => ({
      id: "t-created",
      clientNumber: "c1",
      isPrivate: true,
      name: r.name ?? "n",
      transformations: r.transformations ?? [],
      isPinned: false,
      createdBy: { userId: "u1", name: "U", email: "u@example.com" },
      updatedBy: { userId: "u1", name: "U", email: "u@example.com" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }))

    // Default store state starts as a blank slate: templateId=null.
    renderWithProvider({ saveTemplate })

    // Trigger the metadata auto-save path by changing the template name.
    act(() => {
      useEditorStore.getState().setTemplateName("My New Template")
    })

    // Debounced metadata save should NOT run when templateId is null.
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_MS + 1)
      await Promise.resolve()
    })
    expect(saveTemplate).toHaveBeenCalledTimes(0)

    // Interval auto-save should also NOT run (even though we are now "dirty").
    await act(async () => {
      vi.advanceTimersByTime(INTERVAL_SAVE_MS + 1)
      await Promise.resolve()
    })
    expect(saveTemplate).toHaveBeenCalledTimes(0)
  })

  it("editing an existing transformation flips status to unsaved immediately (before Apply/Save)", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
      transformations: [
        {
          id: "t1",
          key: "adjust-contrast",
          name: "Contrast",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { contrast: false } as any,
          enabled: true,
          version: "v1",
        },
      ],
      visibleTransformations: { t1: true },
      _internalState: {
        sidebarState: "config",
        selectedTransformationKey: "adjust-contrast",
        transformationToEdit: { transformationId: "t1", position: "inplace" },
      },
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    render(
      <ChakraProvider>
        <TemplateStorageContextProvider
          provider={
            {
              getProviderName: () => "library",
              getCurrentUserSession: () => ({}),
              listTemplates: async () => [],
              getTemplate: async () => null,
              // biome-ignore lint/suspicious/noExplicitAny: test stub provider signature
              saveTemplate: async (r: any) => ({
                id: "t1",
                clientNumber: "c1",
                isPrivate: true,
                name: r.name ?? "n",
                transformations: r.transformations ?? [],
                isPinned: false,
                createdBy: { userId: "u1", name: "U", email: "u@example.com" },
                updatedBy: { userId: "u1", name: "U", email: "u@example.com" },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }),
              setTemplatePinned: async () => {
                throw new Error("not used")
              },
              // biome-ignore lint/suspicious/noExplicitAny: test stub provider typing
            } as any
          }
        >
          <TemplateStatus />
          <TransformationConfigSidebar />
        </TemplateStorageContextProvider>
      </ChakraProvider>,
    )

    // Let the initial "saved" notification settle.
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByLabelText("template-status-saved")).toBeTruthy()

    // Toggle the existing transformation switch (should dirty the RHF form).
    act(() => {
      screen.getByLabelText("Contrast").click()
    })

    // Should flip to unsaved immediately (no Apply/Save yet).
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
  })

  it("editing an existing transformation slider field flips status to unsaved immediately", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
      transformations: [
        {
          id: "t2",
          key: "adjust-opacity",
          name: "Opacity",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { opacity: 50 } as any,
          enabled: true,
          version: "v1",
        },
      ],
      visibleTransformations: { t2: true },
      _internalState: {
        sidebarState: "config",
        selectedTransformationKey: "adjust-opacity",
        transformationToEdit: { transformationId: "t2", position: "inplace" },
      },
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    render(
      <ChakraProvider>
        <TemplateStorageContextProvider
          provider={
            {
              getProviderName: () => "library",
              getCurrentUserSession: () => ({}),
              listTemplates: async () => [],
              getTemplate: async () => null,
              // biome-ignore lint/suspicious/noExplicitAny: test stub provider signature
              saveTemplate: async (r: any) => ({
                id: "t2",
                clientNumber: "c1",
                isPrivate: true,
                name: r.name ?? "n",
                transformations: r.transformations ?? [],
                isPinned: false,
                createdBy: { userId: "u1", name: "U", email: "u@example.com" },
                updatedBy: { userId: "u1", name: "U", email: "u@example.com" },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }),
              setTemplatePinned: async () => {
                throw new Error("not used")
              },
              // biome-ignore lint/suspicious/noExplicitAny: test stub provider typing
            } as any
          }
        >
          <TemplateStatus />
          <TransformationConfigSidebar />
        </TemplateStorageContextProvider>
      </ChakraProvider>,
    )

    // Let the initial "saved" notification settle.
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByLabelText("template-status-saved")).toBeTruthy()

    const opacityInput = document.getElementById(
      "opacity-input",
    ) as HTMLInputElement
    expect(opacityInput).toBeTruthy()

    act(() => {
      fireEvent.change(opacityInput, { target: { value: "60" } })
    })

    // Should flip to unsaved immediately (no Apply/Save yet).
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
  })

  it("editing an existing transformation color picker field flips status to unsaved immediately", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
      transformations: [
        {
          id: "t3",
          key: "adjust-border",
          name: "Border",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { borderWidth: 1, borderColor: "#000000" } as any,
          enabled: true,
          version: "v1",
        },
      ],
      visibleTransformations: { t3: true },
      _internalState: {
        sidebarState: "config",
        selectedTransformationKey: "adjust-border",
        transformationToEdit: { transformationId: "t3", position: "inplace" },
      },
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    render(
      <ChakraProvider>
        <TemplateStorageContextProvider
          provider={
            {
              getProviderName: () => "library",
              getCurrentUserSession: () => ({}),
              listTemplates: async () => [],
              getTemplate: async () => null,
              // biome-ignore lint/suspicious/noExplicitAny: test stub provider signature
              saveTemplate: async (r: any) => ({
                id: "t3",
                clientNumber: "c1",
                isPrivate: true,
                name: r.name ?? "n",
                transformations: r.transformations ?? [],
                isPinned: false,
                createdBy: { userId: "u1", name: "U", email: "u@example.com" },
                updatedBy: { userId: "u1", name: "U", email: "u@example.com" },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              }),
              setTemplatePinned: async () => {
                throw new Error("not used")
              },
              // biome-ignore lint/suspicious/noExplicitAny: test stub provider typing
            } as any
          }
        >
          <TemplateStatus />
          <TransformationConfigSidebar />
        </TemplateStorageContextProvider>
      </ChakraProvider>,
    )

    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByLabelText("template-status-saved")).toBeTruthy()

    const colorInput = screen.getByPlaceholderText(
      "#FFFFFF",
    ) as HTMLInputElement
    act(() => {
      fireEvent.change(colorInput, { target: { value: "#FFFFFF" } })
    })

    // ColorPickerField updates RHF via a debounced effect (500ms).
    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
  })

  it("toggle show/hide transformation flips status to unsaved immediately", () => {
    seedSyncedState({
      transformations: [
        {
          id: "t1",
          key: "adjust-contrast",
          name: "Contrast",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { contrast: false } as any,
          enabled: true,
          version: "v1",
        },
      ],
      visibleTransformations: { t1: true },
    })

    renderWithProvider()
    expectStartsSaved()

    act(() => {
      useEditorStore.getState().toggleTransformationVisibility("t1")
    })

    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    // It must stay unsaved after the toast fades and over time (before auto-interval save).
    expectStaysUnsavedAfterDelay(3500)
    expectStaysUnsavedAfterDelay(10_000)
  })

  it("reordering transformations flips status to unsaved immediately", () => {
    seedSyncedState({
      transformations: [
        {
          id: "t1",
          key: "adjust-contrast",
          name: "Contrast",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { contrast: false } as any,
          enabled: true,
          version: "v1",
        },
        {
          id: "t2",
          key: "adjust-opacity",
          name: "Opacity",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { opacity: 50 } as any,
          enabled: true,
          version: "v1",
        },
      ],
      visibleTransformations: { t1: true, t2: true },
    })

    renderWithProvider()
    expectStartsSaved()

    act(() => {
      // Move t1 over t2 (swap order)
      useEditorStore.getState().moveTransformation("t1", "t2")
    })

    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expectStaysUnsavedAfterDelay(3500)
    expectStaysUnsavedAfterDelay(10_000)
  })

  it("adding a transformation flips status to unsaved immediately", () => {
    seedSyncedState({
      transformations: [],
      visibleTransformations: {},
    })

    renderWithProvider()
    expectStartsSaved()

    act(() => {
      useEditorStore.getState().addTransformation({
        key: "adjust-contrast",
        name: "Contrast",
        type: "transformation",
        // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
        value: { contrast: true } as any,
        enabled: true,
        version: "v1",
        // biome-ignore lint/suspicious/noExplicitAny: store action typing is sufficient for runtime in tests
      } as any)
    })

    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expectStaysUnsavedAfterDelay(3500)
    expectStaysUnsavedAfterDelay(10_000)
  })

  it("removing a transformation flips status to unsaved immediately", () => {
    seedSyncedState({
      transformations: [
        {
          id: "t1",
          key: "adjust-contrast",
          name: "Contrast",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { contrast: false } as any,
          enabled: true,
          version: "v1",
        },
      ],
      visibleTransformations: { t1: true },
    })

    renderWithProvider()
    expectStartsSaved()

    act(() => {
      useEditorStore.getState().removeTransformation("t1")
    })

    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expectStaysUnsavedAfterDelay(3500)
    expectStaysUnsavedAfterDelay(10_000)
  })

  it("applying an edit (updateTransformation) flips status to unsaved immediately", () => {
    seedSyncedState({
      transformations: [
        {
          id: "t1",
          key: "adjust-opacity",
          name: "Opacity",
          type: "transformation",
          // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
          value: { opacity: 50 } as any,
          enabled: true,
          version: "v1",
        },
      ],
      visibleTransformations: { t1: true },
    })

    renderWithProvider()
    expectStartsSaved()

    act(() => {
      useEditorStore.getState().updateTransformation("t1", {
        id: "t1",
        key: "adjust-opacity",
        name: "Opacity",
        type: "transformation",
        // biome-ignore lint/suspicious/noExplicitAny: store expects IKTransformation; test doesn't need full typing
        value: { opacity: 60 } as any,
        enabled: true,
        version: "v1",
        // biome-ignore lint/suspicious/noExplicitAny: store action typing is sufficient for runtime in tests
      } as any)
    })

    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expectStaysUnsavedAfterDelay(3500)
    expectStaysUnsavedAfterDelay(10_000)
  })

  it("shows a permission-specific error label when writes are blocked (401/403)", async () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()

    act(() => {
      useEditorStore.setState({
        templateStorageWriteBlocked: true,
        storageError: "You no longer have access to this template.",
      } as unknown as Parameters<typeof useEditorStore.setState>[0])
      useEditorStore
        .getState()
        .setSyncStatus("error", "You no longer have access to this template.")
    })

    expect(screen.getByText("Save failed")).toBeTruthy()
    expect(screen.getByLabelText("template-status-error")).toBeTruthy()

    // After the transient notification text disappears, the icon becomes interactive
    // and hovering it should show the detailed popover contents.
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.queryByText("Save failed")).toBeNull()

    const errorIcon = screen.getByLabelText("template-status-error")
    const popoverTrigger = errorIcon.closest(
      '[aria-haspopup="dialog"]',
    ) as HTMLElement | null
    expect(popoverTrigger).toBeTruthy()

    act(() => {
      fireEvent.click(popoverTrigger as HTMLElement)
    })

    expect(await screen.findByText("Access required")).toBeTruthy()
    expect(
      screen.getByText(
        "You don't have permission to save changes to this template.",
      ),
    ).toBeTruthy()
  })

  it("does not flash a saved success state on initial mount when no save has happened yet", () => {
    // Initial template load paths set syncStatus="saved" even though no save completed in this session.
    // In that case, we should not show the transient green success notification.
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: null,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()
    expect(screen.queryByText(/Saved to library/i)).toBeNull()
    expect(screen.queryByLabelText("template-status-saved")).toBeNull()
  })
})
