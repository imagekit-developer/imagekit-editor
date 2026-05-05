import type { EditorState, Transformation } from "../store"

export const EDITOR_SESSION_STORAGE_VERSION = 1 as const

export type PersistedEditorSession = {
  v: typeof EDITOR_SESSION_STORAGE_VERSION
  savedAt: number
  state: PersistedEditorSessionState
}

export type PersistedEditorSessionState = Pick<
  EditorState,
  | "transformations"
  | "visibleTransformations"
  | "templateName"
  | "templateId"
  | "templateIsPrivate"
  | "syncStatus"
  | "isPristine"
  | "localChangeVersion"
  | "lastSyncedVersion"
  | "lastSavedAt"
> & {
  _internalState?: never
  signingAbortControllers?: never
  signingImages?: never
  signedUrlCache?: never
  storageError?: never
  templateStorageWriteBlocked?: never
  transformationConfigFormDirty?: never
}

export const EDITOR_SESSION_STORAGE_KEY = "ik-editor:lastSession"

export function buildPersistedEditorSession(
  state: EditorState,
): PersistedEditorSession {
  // Explicitly pick serializable + resumable fields.
  const persistedState: PersistedEditorSessionState = {
    transformations: state.transformations as Transformation[],
    visibleTransformations: state.visibleTransformations,
    templateName: state.templateName,
    templateId: state.templateId,
    templateIsPrivate: state.templateIsPrivate,
    syncStatus: state.syncStatus,
    isPristine: state.isPristine,
    localChangeVersion: state.localChangeVersion,
    lastSyncedVersion: state.lastSyncedVersion,
    lastSavedAt: state.lastSavedAt,
  }

  return {
    v: EDITOR_SESSION_STORAGE_VERSION,
    savedAt: Date.now(),
    state: persistedState,
  }
}

export function writeEditorSessionToLocalStorage(args: {
  key: string
  session: PersistedEditorSession
}): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(args.key, JSON.stringify(args.session))
  } catch {
    // Ignore quota/serialization errors; persistence is best-effort.
  }
}

export function clearEditorSessionFromLocalStorage(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function isValidSessionState(x: unknown): x is PersistedEditorSessionState {
  const v = x as Record<string, unknown> | null
  return (
    !!v &&
    typeof v === "object" &&
    Array.isArray(v.transformations) &&
    typeof v.visibleTransformations === "object" &&
    typeof v.templateName === "string" &&
    (typeof v.templateId === "string" || v.templateId === null) &&
    (typeof v.templateIsPrivate === "boolean" ||
      v.templateIsPrivate === null) &&
    typeof v.isPristine === "boolean" &&
    typeof v.localChangeVersion === "number" &&
    typeof v.lastSyncedVersion === "number"
  )
}

export function readEditorSessionFromLocalStorage(
  key: string,
): PersistedEditorSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      !parsed ||
      parsed.v !== EDITOR_SESSION_STORAGE_VERSION ||
      typeof parsed.savedAt !== "number" ||
      !isValidSessionState(parsed.state)
    ) {
      return null
    }
    return parsed as PersistedEditorSession
  } catch {
    return null
  }
}
