import { useCallback, useRef } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import type { SaveTemplateInput, TemplateRecord } from "../storage"
import { isTemplateAccessDeniedError } from "../storage/templateAccessError"
import { useEditorStore } from "../store"
import { shouldMarkSyncedAfterSave } from "../sync/templateSyncVersioning"
import { dedupeVariableMarkersInList } from "../variables"
import { persistEditorSessionNow } from "./useEditorSessionLocalStorage"

export type SaveReason =
  | "manual"
  | "auto_metadata"
  | "auto_interval"
  | "sidebar"
  | "settings"
  | "imperative"

export function useTemplateSync() {
  const provider = useTemplateStorage()
  const savingRef = useRef(false)

  const saveNow = useCallback(
    async (
      args: {
        reason: SaveReason
        overrides?: Partial<Pick<SaveTemplateInput, "name" | "isPrivate">>
      } = { reason: "manual" },
    ): Promise<TemplateRecord | null> => {
      if (!provider) return null
      if (savingRef.current) return null

      const state = useEditorStore.getState()
      if (state.templateStorageWriteBlocked) return null
      // Auto-save must never create a brand new template (noise on blank slate).
      // Creating a new template is reserved for explicit user actions (manual/imperative/etc).
      if (
        state.templateId === null &&
        (args.reason === "auto_metadata" || args.reason === "auto_interval")
      ) {
        return null
      }

      const saveStartedAtVersion = state.localChangeVersion
      savingRef.current = true
      state.setSyncStatus("saving")

      try {
        // Dedupe variable markers at the save boundary so the persisted JSON
        // never contains two `$var` markers with the same name (e.g. after
        // a step is duplicated, both copies start out bound to the same
        // variable). First occurrence keeps its name; later collisions get
        // a fresh suffixed name via `generateVariableName`.
        const safeTransformations = dedupeVariableMarkersInList(
          state.transformations,
        )
        const record = await provider.saveTemplate({
          id: state.templateId ?? undefined,
          name: args.overrides?.name ?? state.templateName,
          transformations: safeTransformations.map(
            ({ id: _id, ...rest }) => rest,
          ),
          ...(args.overrides?.isPrivate !== undefined
            ? { isPrivate: args.overrides.isPrivate }
            : state.templateIsPrivate !== null
              ? { isPrivate: state.templateIsPrivate }
              : {}),
          // Persist authoring mode + canvas config so the template re-opens
          // in the correct mode regardless of how the host invoked the editor.
          mode: state.mode,
          ...(state.mode === "canvas" ? { canvas: state.canvas } : {}),
        })

        const after = useEditorStore.getState()
        after.hydrateTemplateMetadata({
          templateId: record.id,
          templateName: record.name,
          templateIsPrivate:
            typeof record.isPrivate === "boolean" ? record.isPrivate : null,
        })

        const markSynced = shouldMarkSyncedAfterSave({
          saveStartedAtVersion,
          localChangeVersionAtCompletion: after.localChangeVersion,
        })

        if (markSynced) {
          after.markSynced(saveStartedAtVersion)
          after.setSyncStatus("saved")
        } else {
          // Changes happened mid-save; do not claim we are fully synced.
          after.setSyncStatus("unsaved")
        }
        after.setLastSavedAt(Date.now())

        return record
      } catch (err) {
        if (isTemplateAccessDeniedError(err)) {
          useEditorStore
            .getState()
            .blockTemplateStorageWrites(
              err instanceof Error
                ? err.message
                : "You no longer have access to this template.",
            )
          return null
        }
        useEditorStore
          .getState()
          .setSyncStatus(
            "error",
            err instanceof Error ? err.message : "Failed to save template",
          )
        return null
      } finally {
        savingRef.current = false
        persistEditorSessionNow()
      }
    },
    [provider],
  )

  return { saveNow, hasProvider: Boolean(provider) }
}
