import { useToast } from "@chakra-ui/react"
import { useCallback, useEffect } from "react"
import { useTemplateStorage } from "../context/TemplateStorageContext"
import { useEditorStore } from "../store"
import { useTemplateSync } from "./useTemplateSync"

export const APPLY_CHANGES_BEFORE_SAVE_MESSAGE =
  "You need to apply changes before you can save them."

export function useSaveTemplate() {
  const provider = useTemplateStorage()
  const { saveNow } = useTemplateSync()
  const toast = useToast()
  const save = useCallback(() => saveNow({ reason: "manual" }), [saveNow])

  useEffect(() => {
    if (!provider) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (useEditorStore.getState().transformationConfigFormDirty) {
          toast({
            title: APPLY_CHANGES_BEFORE_SAVE_MESSAGE,
            status: "warning",
            duration: 4000,
            isClosable: true,
          })
          return
        }
        void save()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [provider, save, toast])

  return { save }
}
