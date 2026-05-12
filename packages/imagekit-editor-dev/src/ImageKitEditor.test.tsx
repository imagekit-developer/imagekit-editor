import "@testing-library/jest-dom/vitest"
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ImageKitEditor } from "./ImageKitEditor"
import {
  EDITOR_SESSION_STORAGE_KEY,
  EDITOR_SESSION_STORAGE_VERSION,
} from "./persistence/editorSessionStorage"
import type { TemplateStorageProvider } from "./storage"
import { useEditorStore } from "./store"

const RESUME_HEADING = "Resume previous session?"

function stubTemplateStorage(): TemplateStorageProvider {
  return {
    getProviderName: () => "test",
    getCurrentUserSession: () => ({}),
    listTemplates: async () => [],
    getTemplate: async () => null,
    saveTemplate: async (record) => ({
      id: record.id ?? "t-new",
      clientNumber: "c1",
      isPrivate: record.isPrivate ?? false,
      name: record.name,
      transformations: record.transformations ?? [],
      isPinned: false,
      createdBy: { userId: "u1", name: "U", email: "u@example.com" },
      updatedBy: { userId: "u1", name: "U", email: "u@example.com" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    setTemplatePinned: async () => {
      throw new Error("not used")
    },
  }
}

function writeLastSessionToLocalStorage(args: {
  localChangeVersion: number
  lastSyncedVersion: number
  isPristine: boolean
}) {
  const session = {
    v: EDITOR_SESSION_STORAGE_VERSION,
    savedAt: Date.now(),
    state: {
      transformations: [],
      visibleTransformations: {},
      templateName: "Untitled Template",
      templateId: null,
      templateIsPrivate: null,
      syncStatus: "saved" as const,
      isPristine: args.isPristine,
      localChangeVersion: args.localChangeVersion,
      lastSyncedVersion: args.lastSyncedVersion,
      lastSavedAt: Date.now(),
    },
  }
  window.localStorage.setItem(
    EDITOR_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  )
}

describe("ImageKitEditor resume session modal", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY)
  })

  afterEach(() => {
    useEditorStore.getState().destroy()
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY)
    vi.restoreAllMocks()
  })

  it("does not show resume modal when localStorage is empty", async () => {
    render(
      <ImageKitEditor
        onClose={() => {}}
        templateStorage={stubTemplateStorage()}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByText(RESUME_HEADING)).not.toBeInTheDocument()
    })
  })

  it("with template storage: does not show resume modal when versions are in sync", async () => {
    writeLastSessionToLocalStorage({
      localChangeVersion: 3,
      lastSyncedVersion: 3,
      isPristine: false,
    })

    render(
      <ImageKitEditor
        onClose={() => {}}
        templateStorage={stubTemplateStorage()}
      />,
    )

    await waitFor(() => {
      expect(screen.queryByText(RESUME_HEADING)).not.toBeInTheDocument()
    })
  })

  it("with template storage: shows resume modal when local changes are ahead of last sync", async () => {
    writeLastSessionToLocalStorage({
      localChangeVersion: 4,
      lastSyncedVersion: 2,
      isPristine: true,
    })

    render(
      <ImageKitEditor
        onClose={() => {}}
        templateStorage={stubTemplateStorage()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(RESUME_HEADING)).toBeInTheDocument()
    })
  })

  it("without template storage: does not show resume modal when session is pristine", async () => {
    writeLastSessionToLocalStorage({
      localChangeVersion: 0,
      lastSyncedVersion: 0,
      isPristine: true,
    })

    render(<ImageKitEditor onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.queryByText(RESUME_HEADING)).not.toBeInTheDocument()
    })
  })

  it("without template storage: shows resume modal when session is not pristine", async () => {
    writeLastSessionToLocalStorage({
      localChangeVersion: 1,
      lastSyncedVersion: 1,
      isPristine: false,
    })

    render(<ImageKitEditor onClose={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(RESUME_HEADING)).toBeInTheDocument()
    })
  })
})
