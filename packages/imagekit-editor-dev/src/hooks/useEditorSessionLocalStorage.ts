import { useEffect } from "react"
import { shallow } from "zustand/shallow"
import {
  buildPersistedEditorSession,
  EDITOR_SESSION_STORAGE_KEY,
  writeEditorSessionToLocalStorage,
} from "../persistence/editorSessionStorage"
import type { EditorStore } from "../store"
import { useEditorStore } from "../store"

export const PERSIST_DEBOUNCE_MS = 150

/** When true, debounced writes and `persistEditorSessionNow` are skipped (e.g. resume modal open). */
let sessionPersistencePaused = false

function writeSessionSnapshot(): void {
  const state = useEditorStore.getState()
  const session = buildPersistedEditorSession(state)
  writeEditorSessionToLocalStorage({
    key: EDITOR_SESSION_STORAGE_KEY,
    session,
  })
}

/**
 * Writes the current editor store snapshot to localStorage immediately.
 * Call after template sync completes so the draft matches `lastSyncedVersion` / metadata.
 */
export function persistEditorSessionNow(): void {
  if (sessionPersistencePaused) return
  writeSessionSnapshot()
}

/** Fields that can change during template save/sync without bumping `localChangeVersion`. */
function selectPostSyncPersistSlice(state: EditorStore) {
  return {
    lastSyncedVersion: state.lastSyncedVersion,
    lastSavedAt: state.lastSavedAt,
    syncStatus: state.syncStatus,
    templateId: state.templateId,
    templateName: state.templateName,
    templateIsPrivate: state.templateIsPrivate,
    isPristine: state.isPristine,
  }
}

export function useEditorSessionLocalStorage(paused: boolean) {
  useEffect(() => {
    sessionPersistencePaused = paused
  }, [paused])

  useEffect(() => {
    return () => {
      sessionPersistencePaused = false
    }
  }, [])

  useEffect(() => {
    if (paused) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const schedulePersist = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        writeSessionSnapshot()
        timer = null
      }, PERSIST_DEBOUNCE_MS)
    }

    const unsubVersion = useEditorStore.subscribe(
      (s) => s.localChangeVersion,
      schedulePersist,
    )

    const unsubSync = useEditorStore.subscribe(
      selectPostSyncPersistSlice,
      schedulePersist,
      { equalityFn: shallow },
    )

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      writeSessionSnapshot()
      timer = null
    }, PERSIST_DEBOUNCE_MS)

    return () => {
      unsubVersion()
      unsubSync()
      if (timer) clearTimeout(timer)
    }
  }, [paused])
}
