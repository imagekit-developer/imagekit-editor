import { useCallback, useEffect } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import { useEditorStore } from "../store"

export function useSaveTemplate() {
  const provider = useTemplateStorage()
  const { setSyncStatus, setTemplateId, setTemplateName } = useEditorStore()

  const save = useCallback(async () => {
    if (!provider) return

    const state = useEditorStore.getState()
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
      setSyncStatus(
        "error",
        err instanceof Error ? err.message : "Failed to save template",
      )
    }
  }, [provider, setSyncStatus, setTemplateId, setTemplateName])

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
