import { useCallback, useEffect } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import { applyTemplateStorageAccessFailure } from "../storage/templateAccessError"
import { useEditorStore } from "../store"

export function useSaveTemplate() {
  const provider = useTemplateStorage()
  const {
    setSyncStatus,
    setTemplateId,
    setTemplateName,
    denyTemplateStorageAccess,
  } = useEditorStore()

  const save = useCallback(async () => {
    if (!provider) return

    const state = useEditorStore.getState()
    if (state.templateStorageWriteBlocked) return

    const { transformations, templateName, templateId } = state

    setSyncStatus("saving")
    try {
      const saved = await provider.saveTemplate({
        id: templateId ?? undefined,
        name: templateName,
        transformations: transformations.map(({ id: _id, ...rest }) => rest),
      })
      setTemplateId(saved.id)
      setTemplateName(saved.name)
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
        err instanceof Error ? err.message : "Failed to save template",
      )
    }
  }, [
    provider,
    setSyncStatus,
    setTemplateId,
    setTemplateName,
    denyTemplateStorageAccess,
  ])

  useEffect(() => {
    if (!provider) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        save()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [provider, save])

  return { save }
}
