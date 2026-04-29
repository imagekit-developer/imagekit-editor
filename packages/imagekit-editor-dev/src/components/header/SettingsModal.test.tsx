import { ChakraProvider } from "@chakra-ui/react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TemplateStorageContextProvider } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
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
  onDeleted?: () => void
  deleteTemplate?: ((id: string) => Promise<void>) | undefined
  // biome-ignore lint/suspicious/noExplicitAny: test stub
  saveTemplate?: (r: any) => Promise<TemplateRecord>
}) {
  const data = opts.data ?? makeTemplate()

  const provider = {
    getProviderName: () => "test",
    getCurrentUserSession: () => ({ id: "u1" }),
    listTemplates: async () => [],
    getTemplate: async () => data,
    // biome-ignore lint/suspicious/noExplicitAny: test stub
    saveTemplate:
      opts.saveTemplate ?? (async (_r: any) => makeTemplate({ id: "saved" })),
    setTemplatePinned: vi.fn(),
    ...(opts.deleteTemplate !== undefined
      ? { deleteTemplate: opts.deleteTemplate }
      : {}),
  }

  return render(
    <ChakraProvider>
      {/* biome-ignore lint/suspicious/noExplicitAny: test stub */}
      <TemplateStorageContextProvider provider={provider as any}>
        <SettingsModal
          data={data}
          onClose={opts.onClose ?? vi.fn()}
          onSaved={opts.onSaved}
          onDeleted={opts.onDeleted}
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

  describe("delete confirmation flow", () => {
    it("does NOT call deleteTemplate immediately when Delete is clicked", async () => {
      const deleteTemplate = vi.fn(async () => {})
      renderModal({ deleteTemplate })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      act(() => {
        fireEvent.click(screen.getByText("Delete"))
      })

      // deleteTemplate must NOT have been called yet
      expect(deleteTemplate).not.toHaveBeenCalled()
    })

    it("shows the confirmation panel after clicking Delete", async () => {
      renderModal({ deleteTemplate: vi.fn(async () => {}) })

      expect(await screen.findByText("Template Settings")).toBeTruthy()

      act(() => {
        fireEvent.click(screen.getByText("Delete"))
      })

      // Confirmation panel should now be visible
      expect(screen.getByText("Delete template?")).toBeTruthy()
      expect(screen.getByText(/This action cannot be reversed/)).toBeTruthy()
      expect(screen.getByText("Yes, delete")).toBeTruthy()
    })

    it("does NOT call deleteTemplate when confirmation is dismissed with Cancel", async () => {
      const deleteTemplate = vi.fn(async () => {})
      renderModal({ deleteTemplate })

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
      // deleteTemplate still must not have been called
      expect(deleteTemplate).not.toHaveBeenCalled()
    })

    it("calls deleteTemplate only after clicking Yes, delete", async () => {
      const deleteTemplate = vi.fn(async () => {})
      const onDeleted = vi.fn()
      const onClose = vi.fn()

      renderModal({ deleteTemplate, onDeleted, onClose })

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
        expect(deleteTemplate).toHaveBeenCalledTimes(1)
        expect(deleteTemplate).toHaveBeenCalledWith("t-1")
      })

      expect(onDeleted).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalled()
    })

    it("Delete button is disabled while confirmation panel is open", async () => {
      renderModal({ deleteTemplate: vi.fn(async () => {}) })

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
})
