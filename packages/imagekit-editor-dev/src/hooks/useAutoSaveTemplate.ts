import { useEffect, useRef } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import { useEditorStore } from "../store"
import { useTemplateSync } from "./useTemplateSync"

export const DEBOUNCE_MS = 600
export const INTERVAL_SAVE_MS = 2 * 60 * 1000

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
  const intervalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { saveNow } = useTemplateSync()

  useEffect(() => {
    if (!provider) return

    const scheduleNextInterval = (ms = INTERVAL_SAVE_MS) => {
      if (intervalTimerRef.current) clearTimeout(intervalTimerRef.current)
      intervalTimerRef.current = setTimeout(() => {
        const state = useEditorStore.getState()
        if (state.templateStorageWriteBlocked || state.isPristine) {
          scheduleNextInterval()
          return
        }
        if (state.localChangeVersion === state.lastSyncedVersion) {
          scheduleNextInterval()
          return
        }
        void saveNow({ reason: "auto_interval" }).finally(() => {
          scheduleNextInterval()
        })
      }, ms)
    }

    // Start periodic auto-save loop (resets on successful saves).
    scheduleNextInterval()

    const unsubscribe = useEditorStore.subscribe(
      (state) => ({
        templateName: state.templateName,
        templateIsPrivate: state.templateIsPrivate,
      }),
      () => {
        if (timerRef.current) clearTimeout(timerRef.current)

        timerRef.current = setTimeout(() => {
          void saveNow({ reason: "auto_metadata" }).finally(() => {
            // Reset the 2-minute timer after a save attempt.
            scheduleNextInterval()
          })
        }, DEBOUNCE_MS)
      },
      {
        equalityFn: (a, b) =>
          a.templateName === b.templateName &&
          a.templateIsPrivate === b.templateIsPrivate,
      },
    )

    const unsubscribeLastSaved = useEditorStore.subscribe(
      (s) => s.lastSavedAt,
      (ts) => {
        if (!ts) return
        scheduleNextInterval()
      },
    )

    return () => {
      unsubscribe()
      unsubscribeLastSaved()
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalTimerRef.current) clearTimeout(intervalTimerRef.current)
    }
  }, [provider, saveNow])
}
