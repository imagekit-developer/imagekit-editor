import { useEffect } from "react"
import {
  buildPersistedEditorSession,
  EDITOR_SESSION_STORAGE_KEY,
  writeEditorSessionToLocalStorage,
} from "../persistence/editorSessionStorage"
import { useEditorStore } from "../store"

export const PERSIST_DEBOUNCE_MS = 150

export function usePersistedEditorSession(paused: boolean) {
  useEffect(() => {
    if (paused) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const persist = () => {
      const state = useEditorStore.getState()
      const session = buildPersistedEditorSession(state)
      writeEditorSessionToLocalStorage({
        key: EDITOR_SESSION_STORAGE_KEY,
        session,
      })
    }

    const unsub = useEditorStore.subscribe(
      (s) => s.localChangeVersion,
      () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(persist, PERSIST_DEBOUNCE_MS)
      },
    )

    // Persist at least once after mount so a session exists even before edits.
    // (Still cheap, and helps with abrupt refresh right after open.)
    if (timer) clearTimeout(timer)
    timer = setTimeout(persist, PERSIST_DEBOUNCE_MS)

    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [paused])
}
