import { ChakraProvider } from "@chakra-ui/react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"
import { TemplatesLibraryView } from "./TemplatesLibraryView"

// ---------------------------------------------------------------------------
// Mock useToast so we can assert calls without needing a real portal
// ---------------------------------------------------------------------------

const mockToast = vi.hoisted(() => vi.fn())

vi.mock("@chakra-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@chakra-ui/react")>()
  return { ...actual, useToast: () => mockToast }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTemplate(partial: Partial<TemplateRecord> = {}): TemplateRecord {
  const now = Date.now()
  return {
    id: "t-1",
    clientNumber: "c1",
    isPrivate: false,
    name: "My Template",
    transformations: [],
    isPinned: false,
    createdBy: { userId: "u1", name: "Creator", email: "creator@example.com" },
    updatedBy: { userId: "u1", name: "Creator", email: "creator@example.com" },
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

/** Shape that matches an exported template JSON (no identity/timestamp fields). */
function makeExportPayload(
  partial: Partial<
    Omit<
      TemplateRecord,
      | "id"
      | "createdBy"
      | "updatedBy"
      | "createdAt"
      | "updatedAt"
      | "lastUsedAt"
    >
  > = {},
) {
  return {
    name: "My Template",
    clientNumber: "c1",
    isPrivate: false,
    isPinned: false,
    transformations: [] as TemplateRecord["transformations"],
    variables: [] as TemplateRecord["variables"],
    presets: [] as TemplateRecord["presets"],
    ...partial,
  }
}

function renderView(
  opts: {
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    saveTemplate?: (r: any) => Promise<TemplateRecord>
    onClose?: () => void
  } = {},
) {
  const defaultSaved = makeTemplate({
    id: "t-imported",
    name: "My Template_imported",
  })

  const provider = {
    getProviderName: () => "test",
    getCurrentUserSession: () => ({ id: "u1" }),
    listTemplates: async () => [],
    getTemplate: async () => null,
    saveTemplate: opts.saveTemplate ?? vi.fn(async () => defaultSaved),
    setTemplatePinned: vi.fn(),
  }

  useEditorStore.setState({
    isPristine: true,
    templateId: null,
    templateName: "New template",
    transformations: [],
    syncStatus: "saved",
    localChangeVersion: 1,
    lastSyncedVersion: 1,
  } as unknown as Parameters<typeof useEditorStore.setState>[0])

  return render(
    <ChakraProvider>
      {/* biome-ignore lint/suspicious/noExplicitAny: test stub */}
      <TemplateStorageContextProvider provider={provider as any}>
        <TemplatesLibraryView onClose={opts.onClose ?? vi.fn()} />
      </TemplateStorageContextProvider>
    </ChakraProvider>,
  )
}

/** Simulates selecting a file in the hidden file input. */
function pickFile(content: string) {
  const fileInput = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement
  const file = new File([content], "template.json", {
    type: "application/json",
  })
  act(() => {
    fireEvent.change(fileInput, { target: { files: [file] } })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TemplatesLibraryView — import", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    mockToast.mockReset()

    // Minimal DOM stubs so the virtualizer does not throw layout errors.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      width: 800,
      height: 400,
      toJSON: () => ({}),
    } as DOMRect)
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    ;(globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(performance.now())
      return 0
    })
    vi.stubGlobal("cancelAnimationFrame", () => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("renders an Import button to the left of New template", async () => {
    renderView()
    expect(await screen.findByText("Import")).toBeTruthy()
    expect(await screen.findByText("New template")).toBeTruthy()
  })

  it("creates a template with _imported suffix and loads it into the editor", async () => {
    const saved = makeTemplate({
      id: "t-imported",
      name: "My Template_imported",
      variables: [{ id: "v1", name: "headline", defaultValue: "Hi" }],
      presets: [],
    })
    const saveTemplate = vi.fn(async () => saved)

    renderView({ saveTemplate })
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile(JSON.stringify(makeExportPayload({ name: "My Template" })))

    await waitFor(() => {
      expect(saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My Template_imported" }),
      )
    })

    expect(useEditorStore.getState().templateId).toBe("t-imported")
    expect(useEditorStore.getState().templateName).toBe("My Template_imported")
    expect(useEditorStore.getState().templateVariables).toHaveLength(1)
  })

  it("forwards isPrivate, isPinned, variables, and presets to saveTemplate", async () => {
    const saveTemplate = vi.fn(async () => makeTemplate({ id: "t-imported" }))
    renderView({ saveTemplate })
    expect(await screen.findByText("Import")).toBeTruthy()

    const payload = makeExportPayload({
      name: "Themed",
      isPrivate: true,
      isPinned: true,
      variables: [{ id: "v1", name: "color", defaultValue: "red" }],
      presets: [
        { id: "p1", name: "Dark", valuesByVariableId: { v1: "black" } },
      ],
    })
    pickFile(JSON.stringify(payload))

    await waitFor(() => {
      expect(saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Themed_imported",
          isPrivate: true,
          isPinned: true,
          variables: [expect.objectContaining({ id: "v1" })],
          presets: [expect.objectContaining({ id: "p1" })],
        }),
      )
    })
  })

  it("shows a success toast and closes after a successful import", async () => {
    const onClose = vi.fn()
    renderView({ onClose })
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile(JSON.stringify(makeExportPayload()))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ status: "success" }),
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it("shows an error toast for unparseable JSON", async () => {
    renderView()
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile("not { valid } json")

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      )
    })
  })

  it("shows an error toast when the JSON has no name field", async () => {
    renderView()
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile(JSON.stringify({ transformations: [] }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      )
    })
  })

  it("shows an error toast when name is an empty string", async () => {
    renderView()
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile(JSON.stringify({ name: "", transformations: [] }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      )
    })
  })

  it("shows an error toast when transformations is not an array", async () => {
    renderView()
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile(JSON.stringify({ name: "My Template" }))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      )
    })
  })

  it("shows an error toast when saveTemplate throws", async () => {
    const saveTemplate = vi.fn(async () => {
      throw new Error("API error")
    })
    renderView({ saveTemplate })
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile(JSON.stringify(makeExportPayload()))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ status: "error" }),
      )
    })
  })

  it("does not call saveTemplate or onClose when the file is invalid", async () => {
    const saveTemplate = vi.fn()
    const onClose = vi.fn()
    renderView({ saveTemplate, onClose })
    expect(await screen.findByText("Import")).toBeTruthy()

    pickFile("{ bad json")

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })

    expect(saveTemplate).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
