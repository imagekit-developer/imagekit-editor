import { useEffect, useRef } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import { useEditorStore } from "../store"

const DEBOUNCE_MS = 600

/**
 * Automatically persists the template to the storage provider whenever
 * transformations or the template name change. Uses saveTemplate() so the
 * record is immediately visible in listTemplates().
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

  useEffect(() => {
    if (!provider) return

    const unsubscribe = useEditorStore.subscribe(
      (state) => ({
        transformations: state.transformations,
        templateName: state.templateName,
        isPristine: state.isPristine,
      }),
      (slice) => {
        if (slice.isPristine) return

        if (timerRef.current) clearTimeout(timerRef.current)

        timerRef.current = setTimeout(async () => {
          // Re-read fresh state at fire time: the slice snapshot can be up to
          // DEBOUNCE_MS stale by the time the timer fires.
          const state = useEditorStore.getState()
          if (state.isPristine) return

          const { setSyncStatus, setTemplateId } = state
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
            setSyncStatus(
              "error",
              err instanceof Error
                ? err.message
                : "Failed to auto-save template",
            )
          }
        }, DEBOUNCE_MS)
      },
      {
        equalityFn: (a, b) =>
          a.transformations === b.transformations &&
          a.templateName === b.templateName &&
          a.isPristine === b.isPristine,
      },
    )

    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [provider])
}
