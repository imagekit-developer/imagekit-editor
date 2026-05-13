import { useCallback, useRef } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import type { SaveTemplateInput, TemplateRecord } from "../storage"
import { isTemplateAccessDeniedError } from "../storage/templateAccessError"
import { useEditorStore } from "../store"
import { shouldMarkSyncedAfterSave } from "../sync/templateSyncVersioning"

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
      // Don't persist an "overlay" with zero layers — that produces a
      // record that can't be inserted anywhere. Require Apply first.
      if (
        state._internalState.overlayMode &&
        state.transformations.length === 0
      ) {
        return null
      }

      const saveStartedAtVersion = state.localChangeVersion
      savingRef.current = true
      state.setSyncStatus("saving")

      try {
        const isOverlay = state._internalState.overlayMode
        const record = await provider.saveTemplate({
          id: state.templateId ?? undefined,
          name: args.overrides?.name ?? state.templateName,
          transformations: state.transformations.map(
            ({ id: _id, ...rest }) => rest,
          ),
          kind: isOverlay ? "overlay" : "template",
          ...(args.overrides?.isPrivate !== undefined
            ? { isPrivate: args.overrides.isPrivate }
            : state.templateIsPrivate !== null
              ? { isPrivate: state.templateIsPrivate }
              : {}),
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
      }
    },
    [provider],
  )

  return { saveNow, hasProvider: Boolean(provider) }
}
