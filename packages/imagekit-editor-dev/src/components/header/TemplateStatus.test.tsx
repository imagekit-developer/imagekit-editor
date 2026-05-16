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
    expect(screen.getByLabelText("template-status-saved")).toBeTruthy()
  }

  function expectStaysUnsavedAfterDelay(ms: number) {
    // Status labels are persistent in the inline UI — advancing time must not
    // cause the unsaved label to disappear (no transient toast/auto-fade).
    act(() => {
      vi.advanceTimersByTime(ms)
    })
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expect(screen.queryByLabelText("template-status-saved")).toBeNull()
  }

  // ---------------------------------------------------------------------------
  // UI contract tests
  //
  // The inline `TemplateStatus` has 6 user-visible states (see component JSDoc):
  //   pristine-hidden, clean, unsaved, apply-first, error, saving.
  // Each test below pins ONE state and asserts the visible affordances for it
  // (Save button enablement + status label + aria-label). They intentionally
  // drive the store directly so the assertions stay focused on the component's
  // rendering contract, not on whatever upstream flow happened to dirty the
  // store.
  // ---------------------------------------------------------------------------

  it("renders nothing in the pristine state with no pending work and no error", () => {
    // Default store: isPristine=true, syncStatus="unsaved", versions equal.
    // The component should bail out via its early return rather than show a
    // perpetually-disabled Save button before the user has interacted.
    const { container } = renderWithProvider()
    expect(container.querySelector("button")).toBeNull()
    expect(screen.queryByLabelText(/^template-status-/)).toBeNull()
  })

  it("clean state: Save is disabled with no status label", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()

    const saveBtn = screen.getByLabelText(
      "template-status-saved",
    ) as HTMLButtonElement
    expect(saveBtn.tagName).toBe("BUTTON")
    expect(saveBtn.hasAttribute("disabled")).toBe(true)
    // No transient confirmation, no leftover labels in the slot.
    expect(screen.queryByText("Unsaved local changes")).toBeNull()
    expect(screen.queryByText(APPLY_CHANGES_BEFORE_SAVE_MESSAGE)).toBeNull()
    expect(screen.queryByText(/save failed/i)).toBeNull()
    expect(screen.queryByText("Access required")).toBeNull()
  })

  it("unsaved state (versions diverge): shows the unsaved label and enables Save", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 2,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()

    expect(screen.getByText("Unsaved local changes")).toBeTruthy()
    const saveBtn = screen.getByLabelText(
      "template-status-unsaved",
    ) as HTMLButtonElement
    expect(saveBtn.hasAttribute("disabled")).toBe(false)
  })

  it("apply-first state (RHF form dirty): shows the apply hint, hides the generic unsaved label, disables Save", () => {
    useEditorStore.setState({
      isPristine: true,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      transformationConfigFormDirty: true,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()

    // The apply-first hint takes precedence over the generic unsaved label
    // because it tells the user the actionable next step (Apply, then Save).
    expect(screen.getByText(APPLY_CHANGES_BEFORE_SAVE_MESSAGE)).toBeTruthy()
    expect(screen.queryByText("Unsaved local changes")).toBeNull()

    const saveBtn = screen.getByLabelText(
      "template-status-unsaved",
    ) as HTMLButtonElement
    expect(saveBtn.hasAttribute("disabled")).toBe(true)
  })

  it("error state (permission denied): shows 'Access required' and keeps Save disabled", () => {
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

    expect(screen.getByText("Access required")).toBeTruthy()
    // The permission-denied case must NOT use the generic wording.
    expect(screen.queryByText("Save failed")).toBeNull()

    const saveBtn = screen.getByLabelText(
      "template-status-error",
    ) as HTMLButtonElement
    expect(saveBtn.hasAttribute("disabled")).toBe(true)

    // The label is persistent (no auto-fade): it must remain after a long
    // delay that would have expired the previous popover-era 3s notification.
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Access required")).toBeTruthy()
  })

  it("error state (generic): shows 'Save failed' and leaves Save enabled so the user can retry", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])
    renderWithProvider()

    act(() => {
      useEditorStore.getState().setSyncStatus("error", "network blew up")
    })

    expect(screen.getByText("Save failed")).toBeTruthy()
    expect(screen.queryByText("Access required")).toBeNull()

    const saveBtn = screen.getByLabelText(
      "template-status-error",
    ) as HTMLButtonElement
    // No write block + no in-flight save + error state ⇒ retry is allowed.
    expect(saveBtn.hasAttribute("disabled")).toBe(false)
  })

  it("saving state: button shows the loading indicator and is disabled", () => {
    useEditorStore.setState({
      isPristine: false,
      syncStatus: "saving",
      localChangeVersion: 2,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider()

    // Chakra renders `loadingText` inside the button while `isLoading` is on.
    expect(screen.getByText("Saving…")).toBeTruthy()
    // The button is still queryable via the unsaved aria-label (hasPendingLocalWork
    // is true because versions diverge); it must be disabled mid-flight to
    // prevent double-saves.
    const saveBtn = screen.getByLabelText(
      "template-status-unsaved",
    ) as HTMLButtonElement
    expect(saveBtn.hasAttribute("disabled")).toBe(true)
  })

  it("clicking Save in the unsaved state invokes the storage provider's saveTemplate", async () => {
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

    useEditorStore.setState({
      templateId: "t1",
      isPristine: false,
      syncStatus: "saved",
      localChangeVersion: 2,
      lastSyncedVersion: 1,
      lastSavedAt: Date.now(),
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ saveTemplate })

    const saveBtn = screen.getByLabelText(
      "template-status-unsaved",
    ) as HTMLButtonElement
    expect(saveBtn.hasAttribute("disabled")).toBe(false)

    await act(async () => {
      fireEvent.click(saveBtn)
      await Promise.resolve()
    })

    expect(saveTemplate).toHaveBeenCalledTimes(1)
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

    // Status label is persistent in the inline UI; it must stay unsynced over
    // time (no transient toast that would have hidden it).
    expect(screen.getByLabelText("template-status-unsaved")).toBeTruthy()
    expect(screen.queryByLabelText("template-status-saved")).toBeNull()

    // No save should happen before the interval.
    const remainingBeforeInterval = Math.max(0, INTERVAL_SAVE_MS - 1)
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
    // It must stay unsaved over time (before auto-interval save).
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
})
