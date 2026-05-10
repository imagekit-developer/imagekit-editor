import { ChakraProvider } from "@chakra-ui/react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import type { TemplateStorageProvider } from "../../storage/types"
import { useEditorStore } from "../../store"
import { SettingsModal } from "./SettingsModal"

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

function renderModal(opts: {
  data?: TemplateRecord
  onClose?: () => void
  onSaved?: (r: TemplateRecord) => void
  onDeleteRequested?: ((id: string) => Promise<void>) | undefined
  saveTemplate?: (r: unknown) => Promise<TemplateRecord>
}) {
  const data = opts.data ?? makeTemplate()

  const provider: TemplateStorageProvider = {
    getProviderName: () => "test",
    getCurrentUserSession: () => ({ id: "u1" }),
    listTemplates: async () => [],
    getTemplate: async () => data,
    saveTemplate:
      opts.saveTemplate ??
      (async (_r: unknown) => makeTemplate({ id: "saved" })),
    setTemplatePinned: vi.fn(),
  }

  return render(
    <ChakraProvider>
      <TemplateStorageContextProvider provider={provider}>
        <SettingsModal
          data={data}
          onClose={opts.onClose ?? vi.fn()}
          onSaved={opts.onSaved}
          onDeleteRequested={opts.onDeleteRequested}
        />
      </TemplateStorageContextProvider>
    </ChakraProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SettingsModal", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
  })

  describe("duplicate", () => {
    it("creates a copy via saveTemplate and switches to it", async () => {
      const onClose = vi.fn()
      const original = makeTemplate({
        id: "t-orig",
        name: "Original Template",
        clientNumber: "c1",
        isPrivate: true,
        isPinned: true,
        transformations: [
          { key: "t1", name: "Resize", type: "transformation", value: {} },
        ],
        variables: [{ id: "v1", name: "headline", defaultValue: "Hello" }],
        presets: [
          { id: "p1", name: "Default", valuesByVariableId: { v1: "World" } },
        ],
      })

      let resolveSave: ((v: TemplateRecord) => void) | null = null
      const saveTemplate = vi.fn(
        async (r: unknown) =>
          await new Promise<TemplateRecord>((res) => {
            resolveSave = res
          }),
      )

      renderModal({
        data: original,
        onClose,
        saveTemplate,
        onDeleteRequested: vi.fn(async () => {}),
      })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      act(() => {
        fireEvent.click(screen.getByText("Duplicate"))
      })

      // Loading state should show immediately while promise is pending
      expect(screen.getByText("Duplicating…")).toBeTruthy()

      expect(saveTemplate).toHaveBeenCalledTimes(1)
      expect(saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Original Template (Copy)",
          clientNumber: "c1",
          isPrivate: true,
          isPinned: true,
          transformations: original.transformations,
          variables: original.variables,
          presets: original.presets,
        }),
      )

      act(() => {
        resolveSave?.(
          makeTemplate({
            id: "t-copy",
            name: "Original Template (Copy)",
            clientNumber: "c1",
            isPrivate: true,
            isPinned: true,
            transformations: original.transformations,
            variables: original.variables,
            presets: original.presets,
          }),
        )
      })

      await waitFor(() => {
        expect(useEditorStore.getState().templateId).toBe("t-copy")
        expect(useEditorStore.getState().templateName).toBe(
          "Original Template (Copy)",
        )
        expect(useEditorStore.getState().templateIsPrivate).toBe(true)
        expect(useEditorStore.getState().templateVariables.length).toBe(1)
        expect(useEditorStore.getState().templatePresets.length).toBe(1)
      })

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe("delete confirmation flow", () => {
    it("does NOT call onDeleteRequested immediately when Delete is clicked", async () => {
      const onDeleteRequested = vi.fn(async () => {})
      renderModal({ onDeleteRequested })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      act(() => {
        fireEvent.click(screen.getByText("Delete"))
      })

      // onDeleteRequested must NOT have been called yet
      expect(onDeleteRequested).not.toHaveBeenCalled()
    })

    it("shows the confirmation panel after clicking Delete", async () => {
      renderModal({ onDeleteRequested: vi.fn(async () => {}) })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      act(() => {
        fireEvent.click(screen.getByText("Delete"))
      })

      // Confirmation panel should now be visible
      expect(screen.getByText("Delete template?")).toBeTruthy()
      expect(screen.getByText(/This action cannot be reversed/)).toBeTruthy()
      expect(screen.getByText("Yes, delete")).toBeTruthy()
    })

    it("does NOT call onDeleteRequested when confirmation is dismissed with Cancel", async () => {
      const onDeleteRequested = vi.fn(async () => {})
      renderModal({ onDeleteRequested })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      // Open confirmation panel
      act(() => {
        fireEvent.click(screen.getByText("Delete"))
      })

      expect(screen.getByText("Delete template?")).toBeTruthy()

      // Dismiss without confirming — click the Cancel inside the confirmation panel
      act(() => {
        fireEvent.click(screen.getByTestId("delete-confirm-cancel"))
      })

      // Panel should be gone
      expect(screen.queryByText("Delete template?")).toBeNull()
      // onDeleteRequested still must not have been called
      expect(onDeleteRequested).not.toHaveBeenCalled()
    })

    it("calls onDeleteRequested only after clicking Yes, delete", async () => {
      const onDeleteRequested = vi.fn(async () => {})
      const onClose = vi.fn()

      renderModal({ onDeleteRequested, onClose })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      // Open confirmation panel
      act(() => {
        fireEvent.click(screen.getByText("Delete"))
      })

      expect(screen.getByTestId("delete-confirm-submit")).toBeTruthy()

      // Confirm deletion
      act(() => {
        fireEvent.click(screen.getByTestId("delete-confirm-submit"))
      })

      await waitFor(() => {
        expect(onDeleteRequested).toHaveBeenCalledTimes(1)
        expect(onDeleteRequested).toHaveBeenCalledWith("t-1")
      })

      expect(onClose).toHaveBeenCalled()
    })

    it("Delete button is disabled while confirmation panel is open", async () => {
      renderModal({ onDeleteRequested: vi.fn(async () => {}) })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      // Before opening: Delete button is NOT disabled
      const deleteBtn = screen.getByText("Delete")
      expect(deleteBtn.closest("[aria-disabled='true']")).toBeNull()

      // Open confirmation panel
      act(() => {
        fireEvent.click(deleteBtn)
      })

      // After opening: the footer Delete button should be aria-disabled="true"
      const deleteBtnsAfter = screen.getAllByText("Delete")
      const footerDelete = deleteBtnsAfter[deleteBtnsAfter.length - 1]
      expect(footerDelete.closest("[aria-disabled='true']")).not.toBeNull()
    })
  })

  describe("export JSON", () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("renders a Download as JSON button inside the modal content", async () => {
      renderModal({})
      expect(await screen.findByText("Download as JSON")).toBeTruthy()
    })

    it("omits id, createdBy, updatedBy, and timestamp fields from the exported JSON", async () => {
      const now = Date.now()
      const template = makeTemplate({
        id: "t-export",
        name: "Export Test",
        clientNumber: "c99",
        isPrivate: true,
        isPinned: true,
        transformations: [
          { key: "k1", name: "Resize", type: "transformation", value: {} },
        ],
        variables: [{ id: "v1", name: "headline", defaultValue: "Hi" }],
        presets: [
          { id: "p1", name: "Default", valuesByVariableId: { v1: "Hello" } },
        ],
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
      })

      let capturedBlob: Blob | null = null
      vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
        capturedBlob = b as Blob
        return "blob:mock"
      })
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        () => {},
      )

      renderModal({ data: template })
      const btn = await screen.findByText("Download as JSON")
      act(() => {
        fireEvent.click(btn)
      })

      expect(capturedBlob).not.toBeNull()
      const parsed = JSON.parse(await (capturedBlob as Blob).text())

      expect(parsed.id).toBeUndefined()
      expect(parsed.createdBy).toBeUndefined()
      expect(parsed.updatedBy).toBeUndefined()
      expect(parsed.createdAt).toBeUndefined()
      expect(parsed.updatedAt).toBeUndefined()
      expect(parsed.lastUsedAt).toBeUndefined()

      expect(parsed.name).toBe("Export Test")
      expect(parsed.clientNumber).toBe("c99")
      expect(parsed.isPrivate).toBe(true)
      expect(parsed.isPinned).toBe(true)
      expect(parsed.transformations).toHaveLength(1)
      expect(parsed.variables).toHaveLength(1)
      expect(parsed.presets).toHaveLength(1)
    })

    it("sets the download filename to <sanitized_name>_<id>_exported.json", async () => {
      const template = makeTemplate({ id: "t-abc", name: "My Template" })

      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        () => {},
      )
      const setAttrSpy = vi.spyOn(HTMLAnchorElement.prototype, "setAttribute")

      renderModal({ data: template })
      const btn = await screen.findByText("Download as JSON")
      act(() => {
        fireEvent.click(btn)
      })

      expect(setAttrSpy).toHaveBeenCalledWith(
        "download",
        "My_Template_t-abc_exported.json",
      )
    })

    it("sanitizes special characters in the template name for the filename", async () => {
      const template = makeTemplate({ id: "t-xyz", name: "Hello World! (v2)" })

      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        () => {},
      )
      const setAttrSpy = vi.spyOn(HTMLAnchorElement.prototype, "setAttribute")

      renderModal({ data: template })
      const btn = await screen.findByText("Download as JSON")
      act(() => {
        fireEvent.click(btn)
      })

      // "Hello World! (v2)" → space→_, !→_, space→_, (→_, )→_ giving triple-underscore before v2
      expect(setAttrSpy).toHaveBeenCalledWith(
        "download",
        "Hello_World___v2__t-xyz_exported.json",
      )
    })
  })
})
