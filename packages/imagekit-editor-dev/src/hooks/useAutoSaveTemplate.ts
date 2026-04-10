import { useEffect, useRef } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import { applyTemplateStorageAccessFailure } from "../storage/templateAccessError"
import { useEditorStore } from "../store"

const DEBOUNCE_MS = 600
const INTERVAL_SAVE_MS = 2 * 60 * 1000

/**
 * Automatically persists template *metadata* (name / visibility) to the storage
 * provider. Transformations are intentionally NOT auto-saved; they are kept as
 * local unsynced changes until the user explicitly saves (Cmd/Ctrl+S or save UI).
 *
 * Why transformationToEdit is NOT in the subscribed slice
 * --------------------------------------------------------
 * The Zustand store only holds committed transformation state.
 * updateTransformation / addTransformation are called on "Apply", not on
 * every keystroke — react-hook-form owns the live form state and never touches
 * the store. So whether a config sidebar is open is irrelevant to whether the
 * store data is ready to save. Including transformationToEdit as a guard
 * causes exactly the bug it was meant to prevent: "Apply" without closing the
 * form leaves transformationToEdit non-null, so the subscription callback
 * returns early and the change is never persisted.
 *
 * Why templateId is NOT in the subscribed slice
 * -----------------------------------------------
 * setTemplateId() is called on every save success. Including it would
 * re-trigger the subscription and cause an infinite save loop.
 */
export function useAutoSaveTemplate() {
  const provider = useTemplateStorage()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)

  useEffect(() => {
    if (!provider) return

    const saveNow = async () => {
      if (isSavingRef.current) return
      const state = useEditorStore.getState()
      if (state.isPristine || state.templateStorageWriteBlocked) return
      if (state.syncStatus === "saving") return

      isSavingRef.current = true
      const { setSyncStatus, setTemplateId, denyTemplateStorageAccess } = state
      setSyncStatus("saving")
      try {
        const saved = await provider.saveTemplate({
          id: state.templateId ?? undefined,
          name: state.templateName,
          transformations: state.transformations.map(
            ({ id: _id, ...rest }) => rest,
          ),
        })
        setTemplateId(saved.id)
        setSyncStatus("saved")
      } catch (err) {
        if (
          applyTemplateStorageAccessFailure(err, {
            denyTemplateStorageAccess,
          })
        ) {
          return
        }
        setSyncStatus(
          "error",
          err instanceof Error ? err.message : "Failed to auto-save template",
        )
      } finally {
        isSavingRef.current = false
      }
    }

    const unsubscribe = useEditorStore.subscribe(
      (state) => ({
        templateName: state.templateName,
        isPristine: state.isPristine,
      }),
      (slice) => {
        if (slice.isPristine) return

        if (timerRef.current) clearTimeout(timerRef.current)

        timerRef.current = setTimeout(() => {
          void saveNow()
        }, DEBOUNCE_MS)
      },
      {
        equalityFn: (a, b) =>
          a.templateName === b.templateName && a.isPristine === b.isPristine,
      },
    )

    // Background safety-net: periodically save unsynced changes (e.g. transformations).
    const intervalId = window.setInterval(() => {
      const state = useEditorStore.getState()
      if (state.templateStorageWriteBlocked) return
      if (state.isPristine) return
      if (state.syncStatus !== "unsaved") return
      void saveNow()
    }, INTERVAL_SAVE_MS)

    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
      window.clearInterval(intervalId)
    }
  }, [provider])
}
