import { useCallback, useEffect } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import { useTemplateSync } from "./useTemplateSync"

export function useSaveTemplate() {
  const provider = useTemplateStorage()
  const { saveNow } = useTemplateSync()
  const save = useCallback(() => saveNow({ reason: "manual" }), [saveNow])

  useEffect(() => {
    if (!provider) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        void save()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [provider, save])

  return { save }
}
