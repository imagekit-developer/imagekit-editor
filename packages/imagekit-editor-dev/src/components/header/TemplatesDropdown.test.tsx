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
    expect(screen.queryByText("Ada Lovelace")).toBeNull()
    expect(screen.queryByLabelText(/Pin template Vintage Look/i)).toBeNull()

    const row = screen
      .getByText("Vintage Look")
      .closest('[data-testid="templates-dropdown-row-t-1"]')
    expect(row).toBeTruthy()

    act(() => {
      fireEvent.mouseEnter(row as Element)
    })

    expect(screen.getByText("Ada Lovelace")).toBeTruthy()
    expect(
      screen.getByTestId("templates-dropdown-creator-avatar-t-1"),
    ).toBeTruthy()
    expect(screen.getByLabelText(/Pin template Vintage Look/i)).toBeTruthy()

    act(() => {
      fireEvent.mouseLeave(row as Element)
    })

    expect(screen.queryByText("Ada Lovelace")).toBeNull()
    expect(screen.queryByLabelText(/Pin template Vintage Look/i)).toBeNull()
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
    expect(screen.queryByText("Grace")).toBeNull()
  })

  it('shows a "Current" indicator row when the current template is active', async () => {
    useEditorStore.setState({
      isPristine: false,
      templateId: null,
      templateName: "In progress",
      transformations: [{ id: "x" }],
      syncStatus: "saved",
      localChangeVersion: 1,
      lastSyncedVersion: 1,
    } as unknown as Parameters<typeof useEditorStore.setState>[0])

    renderWithProvider({ templates: [] })
    await openDropdown()

    expect(screen.getByText("Current")).toBeTruthy()
    expect(screen.getByText("In progress")).toBeTruthy()
  })
})
