import { ChakraProvider } from "@chakra-ui/react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"
import { TemplatesLibraryView } from "./TemplatesLibraryView"

function makeTemplate(partial: Partial<TemplateRecord>): TemplateRecord {
  const now = Date.now()
  return {
    id: "t-1",
    clientNumber: "c1",
    isPrivate: true,
    name: "Template 1",
    transformations: [],
    isPinned: false,
    createdBy: { userId: "u1", name: "Creator", email: "c@example.com" },
    updatedBy: { userId: "u1", name: "Creator", email: "c@example.com" },
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

function renderWithProvider(opts: {
  templates: TemplateRecord[]
  onClose?: () => void
}) {
  const provider = {
    getProviderName: () => "library",
    getCurrentUserSession: () => ({}),
    listTemplates: async () => opts.templates,
    getTemplate: async () => null,
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    saveTemplate: async (_r: any) => makeTemplate({ id: "saved" }),
    setTemplatePinned: vi.fn(async (id: string, pinned: boolean) => {
      const original = opts.templates.find((t) => t.id === id)
      if (!original) throw new Error("template not found in stub")
      return { ...original, isPinned: pinned }
    }),
    deleteTemplate: vi.fn(async () => {}),
  }

  return render(
    <ChakraProvider>
      {/* biome-ignore lint/suspicious/noExplicitAny: test stub */}
      <TemplateStorageContextProvider provider={provider as any}>
        <TemplatesLibraryView onClose={opts.onClose ?? (() => {})} />
      </TemplateStorageContextProvider>
    </ChakraProvider>,
  )
}

function mockLayoutForVirtualizer(opts?: { estimatedRowCount?: number }) {
  const estimatedRowCount = opts?.estimatedRowCount ?? 3000
  // TanStack Virtual measures element sizes; JSDOM reports 0 by default.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const el = this as HTMLElement
      const width = Number.parseFloat(el.style.width || "800") || 800
      const height =
        Number.parseFloat(el.style.height || "") ||
        (el.dataset.testid?.includes("templates-library-scroll") ? 400 : 84)
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON: () => ({}),
      } as DOMRect
    },
  )

  // Provide stable layout metrics used by the virtualizer.
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      const el = this as HTMLElement
      return el.dataset.testid?.includes("templates-library-scroll") ? 400 : 84
    },
  })

  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      const el = this as HTMLElement
      return el.dataset.testid?.includes("templates-library-scroll") ? 400 : 84
    },
  })

  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return 84 * estimatedRowCount
    },
  })
}

function mockResizeObserver() {
  class ResizeObserverMock {
    callback: ResizeObserverCallback
    constructor(cb: ResizeObserverCallback) {
      this.callback = cb
    }
    observe = (target: Element) => {
      // Fire once so virtualizer sees a measurement signal.
      this.callback(
        [
          {
            target,
            contentRect: target.getBoundingClientRect(),
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      )
    }
    unobserve = () => {}
    disconnect = () => {}
  }
  // biome-ignore lint/suspicious/noExplicitAny: test environment shim
  ;(globalThis as any).ResizeObserver = ResizeObserverMock
}

describe("TemplatesLibraryView (virtualized)", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    vi.useRealTimers()
    mockLayoutForVirtualizer({ estimatedRowCount: 1000 })
    mockResizeObserver()
    // TanStack Virtual batches updates through rAF; make it deterministic in JSDOM.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(performance.now())
      return 0
    })
    vi.stubGlobal("cancelAnimationFrame", () => {})
    // TanStack Virtual may use scrollTo on the scroll element.
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      value: vi.fn(),
      writable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it(
    "does not render thousands of rows at once; renders more on scroll",
    async () => {
      const now = Date.now()
      const templates = Array.from({ length: 1000 }).map((_, i) =>
        makeTemplate({
          id: `t-${i}`,
          name: `Template ${i}`,
          // Ensure deterministic sort: newest first.
          updatedAt: now - i,
          createdAt: now - i,
          createdBy: {
            userId: `u-${i}`,
            name: `User ${i}`,
            email: `u${i}@ex.com`,
          },
        }),
      )

      useEditorStore.setState({
        isPristine: true,
        templateId: null,
        templateName: "New template",
        transformations: [],
        syncStatus: "saved",
        localChangeVersion: 1,
        lastSyncedVersion: 1,
      } as unknown as Parameters<typeof useEditorStore.setState>[0])

      renderWithProvider({ templates })

      // Wait for view to load.
      expect(await screen.findByText("All templates")).toBeTruthy()

      const scrollEl = await screen.findByTestId("templates-library-scroll")

      // Top row should render (Template 0 is newest due to updatedAt).
      expect(await screen.findByText("Template 0")).toBeTruthy()

      // A far-down row should not be mounted initially.
      expect(screen.queryByText("Template 900")).toBeNull()

      // Scroll down enough to bring later items into view.
      act(() => {
        fireEvent.scroll(scrollEl, { target: { scrollTop: 84 * 900 } })
      })

      await waitFor(() => {
        expect(screen.getByText("Template 900")).toBeTruthy()
      })
    },
    15 * 1000,
  )

  it('includes a virtualized "Current" row when the active template exists', async () => {
    const now = Date.now()
    const active = makeTemplate({
      id: "t-active",
      name: "Active Template",
      updatedAt: now,
      createdAt: now,
      createdBy: { userId: "u-a", name: "Ada", email: "ada@ex.com" },
    })

    useEditorStore.setState({
      isPristine: false,
      templateId: "t-active",
      templateName: "Active Template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ templates: [active] })

    expect(await screen.findByText("All templates")).toBeTruthy()
    await screen.findByTestId("templates-library-scroll")

    expect(await screen.findByText("Current")).toBeTruthy()
    expect(await screen.findByText("Active Template")).toBeTruthy()
  })

  it("supports ArrowUp/ArrowDown to activate + cycle through search results", async () => {
    const now = Date.now()
    const templates = [
      makeTemplate({
        id: "t-0",
        name: "Alpha",
        updatedAt: now,
        createdAt: now,
        createdBy: { userId: "u-0", name: "Ada", email: "ada@ex.com" },
      }),
      makeTemplate({
        id: "t-1",
        name: "Alpine",
        updatedAt: now - 1,
        createdAt: now - 1,
        createdBy: { userId: "u-1", name: "Grace", email: "grace@ex.com" },
      }),
      makeTemplate({
        id: "t-2",
        name: "Beta",
        updatedAt: now - 2,
        createdAt: now - 2,
        createdBy: { userId: "u-2", name: "Linus", email: "linus@ex.com" },
      }),
    ]

    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ templates })

    expect(await screen.findByText("All templates")).toBeTruthy()
    await screen.findByTestId("templates-library-scroll")

    const searchInput = await screen.findByPlaceholderText(
      "Search templates...",
    )

    // Apply search (debounced).
    act(() => {
      fireEvent.change(searchInput, { target: { value: "al" } })
    })

    // Wait for debounce window to elapse.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250))
    })

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeTruthy()
      expect(screen.getByText("Alpine")).toBeTruthy()
      expect(screen.queryByText("Beta")).toBeNull()
    })

    // ArrowDown should activate first result.
    act(() => {
      fireEvent.keyDown(searchInput, { key: "ArrowDown" })
    })
    expect(
      screen
        .getByTestId("templates-library-row-t-0")
        .getAttribute("data-active"),
    ).toBe("true")
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled()

    // ArrowDown advances.
    act(() => {
      fireEvent.keyDown(searchInput, { key: "ArrowDown" })
    })
    expect(
      screen
        .getByTestId("templates-library-row-t-1")
        .getAttribute("data-active"),
    ).toBe("true")

    // ArrowDown cycles back to first result.
    act(() => {
      fireEvent.keyDown(searchInput, { key: "ArrowDown" })
    })
    expect(
      screen
        .getByTestId("templates-library-row-t-0")
        .getAttribute("data-active"),
    ).toBe("true")

    // ArrowUp cycles to last result.
    act(() => {
      fireEvent.keyDown(searchInput, { key: "ArrowUp" })
    })
    expect(
      screen
        .getByTestId("templates-library-row-t-1")
        .getAttribute("data-active"),
    ).toBe("true")

    vi.useRealTimers()
  })

  it("does not cycle with ArrowUp/ArrowDown when list size exceeds 200", async () => {
    const now = Date.now()
    const templates = Array.from({ length: 205 }).map((_, i) =>
      makeTemplate({
        id: `t-${i}`,
        name: `Template ${i}`,
        updatedAt: now - i,
        createdAt: now - i,
        createdBy: {
          userId: `u-${i}`,
          name: `User ${i}`,
          email: `u${i}@ex.com`,
        },
      }),
    )

    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ templates })

    expect(await screen.findByText("All templates")).toBeTruthy()
    const scrollEl = await screen.findByTestId("templates-library-scroll")

    const searchInput = await screen.findByPlaceholderText(
      "Search templates...",
    )

    // Move to the last row via ArrowDown.
    act(() => {
      for (let i = 0; i < 205; i++) {
        fireEvent.keyDown(searchInput, { key: "ArrowDown" })
      }
    })

    // Scroll near the bottom so the last row is mounted for assertion.
    act(() => {
      fireEvent.scroll(scrollEl, { target: { scrollTop: 84 * 204 } })
    })

    await waitFor(() => {
      expect(screen.getByText("Template 204")).toBeTruthy()
    })

    expect(
      screen
        .getByTestId("templates-library-row-t-204")
        .getAttribute("data-active"),
    ).toBe("true")

    // One more ArrowDown should NOT wrap back to the first row.
    act(() => {
      fireEvent.keyDown(searchInput, { key: "ArrowDown" })
    })

    expect(
      screen
        .getByTestId("templates-library-row-t-204")
        .getAttribute("data-active"),
    ).toBe("true")
  })

  it("loads the selected template on Enter in the library", async () => {
    const now = Date.now()
    const t1 = makeTemplate({
      id: "t-1",
      name: "Template 1",
      updatedAt: now,
      createdAt: now,
      createdBy: { userId: "u-1", name: "Ada", email: "ada@ex.com" },
    })
    const t2 = makeTemplate({
      id: "t-2",
      name: "Template 2",
      updatedAt: now - 1,
      createdAt: now - 1,
      createdBy: { userId: "u-2", name: "Grace", email: "grace@ex.com" },
    })
    const templates = [t1, t2]

    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ templates })

    expect(await screen.findByText("All templates")).toBeTruthy()
    const searchInput = await screen.findByPlaceholderText(
      "Search templates...",
    )

    // Navigate to first template with ArrowDown
    act(() => {
      fireEvent.keyDown(searchInput, { key: "ArrowDown" })
    })

    expect(
      screen
        .getByTestId("templates-library-row-t-1")
        .getAttribute("data-active"),
    ).toBe("true")

    // Press Enter to load it
    act(() => {
      fireEvent.keyDown(searchInput, { key: "Enter" })
    })

    // Verify the template was loaded into the store
    expect(useEditorStore.getState().templateId).toBe("t-1")
    expect(useEditorStore.getState().templateName).toBe("Template 1")
  })
})
