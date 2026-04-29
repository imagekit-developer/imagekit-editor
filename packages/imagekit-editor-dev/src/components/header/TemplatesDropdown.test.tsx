import { ChakraProvider } from "@chakra-ui/react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"
import { TemplatesDropdown } from "./TemplatesDropdown"

function makeTemplate(partial: Partial<TemplateRecord>): TemplateRecord {
  const now = Date.now()
  return {
    id: "t1",
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

function renderWithProvider(opts?: {
  templates?: TemplateRecord[]
  setTemplatePinned?: (id: string, pinned: boolean) => Promise<TemplateRecord>
}) {
  const templates = opts?.templates ?? []
  const setTemplatePinned =
    opts?.setTemplatePinned ??
    vi.fn(async (id: string, pinned: boolean) => {
      const original = templates.find((t) => t.id === id)
      if (!original) throw new Error("template not found in stub")
      return { ...original, isPinned: pinned }
    })

  const provider = {
    getProviderName: () => "library",
    getCurrentUserSession: () => ({}),
    listTemplates: async () => templates,
    getTemplate: async () => null,
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    saveTemplate: async (_r: any) => makeTemplate({ id: "saved" }),
    setTemplatePinned,
  }

  return render(
    <ChakraProvider>
      {/* biome-ignore lint/suspicious/noExplicitAny: test stub */}
      <TemplateStorageContextProvider provider={provider as any}>
        <TemplatesDropdown />
      </TemplateStorageContextProvider>
    </ChakraProvider>,
  )
}

async function openDropdown() {
  fireEvent.click(screen.getByLabelText("Open templates dropdown"))
  // wait for popover content to mount
  expect(await screen.findByPlaceholderText("Search templates...")).toBeTruthy()
}

describe("TemplatesDropdown", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    vi.useFakeTimers()
    // JSDOM doesn't implement this; we use it for keyboard navigation.
    Element.prototype.scrollIntoView = vi.fn()
  })

  it("shows only template name by default; shows creator + pin on hover", async () => {
    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    const t = makeTemplate({
      id: "t-1",
      name: "Vintage Look",
      isPinned: false,
      createdBy: { userId: "u-1", name: "Ada Lovelace", email: "ada@ex.com" },
    })

    renderWithProvider({ templates: [t] })
    await openDropdown()

    expect(await screen.findByText("Vintage Look")).toBeTruthy()
    // Creator text exists in DOM but is hidden (not visible until hover)
    const creatorElement = screen.queryByTestId(
      `templates-dropdown-creator-${t.id}`,
    )
    expect(creatorElement).toBeTruthy()
    // Pin button is in the DOM but hidden (visibility: hidden) before hover
    expect(screen.getByLabelText(/Pin template Vintage Look/i)).toBeTruthy()

    const row = screen
      .getByText("Vintage Look")
      .closest('[data-testid="templates-dropdown-row-t-1"]')
    expect(row).toBeTruthy()

    act(() => {
      fireEvent.mouseEnter(row as Element)
    })

    // After hover, creator is visible
    expect(screen.getByText("Ada Lovelace")).toBeTruthy()
    expect(
      screen.getByTestId("templates-dropdown-creator-avatar-t-1"),
    ).toBeTruthy()
    expect(screen.getByLabelText(/Pin template Vintage Look/i)).toBeTruthy()

    act(() => {
      fireEvent.mouseLeave(row as Element)
    })

    // After leaving, pin button is still in DOM (just hidden)
    expect(screen.getByLabelText(/Pin template Vintage Look/i)).toBeTruthy()
  })

  it("keeps pin icon visible when a template is pinned (even without hover)", async () => {
    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    const pinned = makeTemplate({
      id: "t-pinned",
      name: "My Pinned Template",
      isPinned: true,
      createdBy: { userId: "u-1", name: "Grace", email: "g@ex.com" },
    })

    renderWithProvider({ templates: [pinned] })
    await openDropdown()

    expect(await screen.findByText("My Pinned Template")).toBeTruthy()
    expect(
      screen.getByLabelText(/Unpin template My Pinned Template/i),
    ).toBeTruthy()
    // Creator is in DOM but hidden (not interactable)
    expect(
      screen.queryByTestId(`templates-dropdown-creator-${pinned.id}`),
    ).toBeTruthy()
  })

  it('shows a "Current" indicator row when the current template is active', async () => {
    useEditorStore.setState({
      isPristine: false,
      templateId: null,
      templateName: "In progress",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ templates: [] })
    await openDropdown()

    expect(screen.getByText("Current")).toBeTruthy()
    expect(screen.getByText("In progress")).toBeTruthy()
  })

  it("supports ArrowUp/ArrowDown to hover + cycle through search results", async () => {
    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    const t1 = makeTemplate({
      id: "t-1",
      name: "Alpha",
      isPinned: false,
      createdBy: { userId: "u-1", name: "Ada", email: "ada@ex.com" },
    })
    const t2 = makeTemplate({
      id: "t-2",
      name: "Alpine",
      isPinned: false,
      createdBy: { userId: "u-2", name: "Grace", email: "grace@ex.com" },
    })
    const t3 = makeTemplate({
      id: "t-3",
      name: "Beta",
      isPinned: false,
      createdBy: { userId: "u-3", name: "Linus", email: "linus@ex.com" },
    })

    renderWithProvider({ templates: [t1, t2, t3] })
    await openDropdown()

    const input = await screen.findByPlaceholderText("Search templates...")
    act(() => {
      fireEvent.change(input, { target: { value: "al" } })
    })

    expect(await screen.findByText("Alpha")).toBeTruthy()
    expect(screen.getByText("Alpine")).toBeTruthy()
    expect(screen.queryByText("Beta")).toBeNull()

    // ArrowDown should move "hover" to first result.
    act(() => {
      fireEvent.keyDown(input, { key: "ArrowDown" })
    })
    expect(screen.getByText("Ada")).toBeTruthy()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(
      screen
        .getByTestId("templates-dropdown-row-t-1")
        .getAttribute("data-active"),
    ).toBe("true")

    // ArrowDown should move to next result.
    act(() => {
      fireEvent.keyDown(input, { key: "ArrowDown" })
    })
    expect(screen.getByText("Grace")).toBeTruthy()

    // ArrowDown cycles back to the first result.
    act(() => {
      fireEvent.keyDown(input, { key: "ArrowDown" })
    })
    expect(screen.getByText("Ada")).toBeTruthy()

    // ArrowUp cycles to the last result.
    act(() => {
      fireEvent.keyDown(input, { key: "ArrowUp" })
    })
    expect(screen.getByText("Grace")).toBeTruthy()
  })

  it("maintains consistent row height when hovering (no layout shift)", async () => {
    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    const t = makeTemplate({
      id: "t-1",
      name: "Test Template",
      isPinned: false,
      createdBy: { userId: "u-1", name: "John Doe", email: "john@ex.com" },
    })

    renderWithProvider({ templates: [t] })
    await openDropdown()

    expect(await screen.findByText("Test Template")).toBeTruthy()

    const row = screen
      .getByText("Test Template")
      .closest('[data-testid="templates-dropdown-row-t-1"]')
    expect(row).toBeTruthy()

    // Count child nodes in the row before hover — the DOM structure must not change
    const childCountBefore = (row as HTMLElement).querySelectorAll("*").length

    // Hover over the row
    act(() => {
      fireEvent.mouseEnter(row as Element)
    })

    // DOM structure must be identical — no nodes added or removed
    const childCountOnHover = (row as HTMLElement).querySelectorAll("*").length
    expect(childCountOnHover).toBe(childCountBefore)

    // Move away from row
    act(() => {
      fireEvent.mouseLeave(row as Element)
    })

    const childCountAfterHover = (row as HTMLElement).querySelectorAll(
      "*",
    ).length
    expect(childCountAfterHover).toBe(childCountBefore)
  })

  it("loads the selected template on Enter (keyboard)", async () => {
    useEditorStore.setState({
      isPristine: true,
      templateId: null,
      templateName: "New template",
      transformations: [],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    const t1 = makeTemplate({
      id: "t-1",
      name: "Alpha",
      createdBy: { userId: "u-1", name: "Ada", email: "ada@ex.com" },
    })
    const t2 = makeTemplate({
      id: "t-2",
      name: "Alpine",
      createdBy: { userId: "u-2", name: "Grace", email: "grace@ex.com" },
    })

    renderWithProvider({ templates: [t1, t2] })
    await openDropdown()

    const input = await screen.findByPlaceholderText("Search templates...")
    act(() => {
      fireEvent.change(input, { target: { value: "al" } })
    })

    // ArrowDown to activate first result, then Enter to load it.
    act(() => {
      fireEvent.keyDown(input, { key: "ArrowDown" })
      fireEvent.keyDown(input, { key: "Enter" })
    })

    expect(useEditorStore.getState().templateId).toBe("t-1")
    expect(useEditorStore.getState().templateName).toBe("Alpha")
  })
})
