import type { UniqueIdentifier } from "@dnd-kit/core"
import type { Transformation as IKTransformation } from "@imagekit/javascript"
import type { DEFAULT_FOCUS_OBJECTS } from "../schema"

export const TRANSFORMATION_STATE_VERSION = "v1" as const

export interface Transformation {
  id: string
  key: string
  name: string
  type: "transformation"
  value: IKTransformation
  version?: typeof TRANSFORMATION_STATE_VERSION
  /** Persisted visibility flag. Absent or true = visible; false = hidden. */
  enabled?: boolean
}

export type RequiredMetadata = { requireSignedUrl: boolean }

export interface FileElement<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  url: string
  metadata: Metadata
  imageDimensions: { width: number; height: number } | null
}

export type InputFileElement<
  Metadata extends RequiredMetadata = RequiredMetadata,
> = Omit<FileElement<Metadata>, "imageDimensions">

export interface SignerRequest<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  url: string
  transformation: string
  metadata: Metadata
}

export type Signer<Metadata extends RequiredMetadata = RequiredMetadata> = (
  item: SignerRequest<Metadata>,
  controller?: AbortController,
) => Promise<string>

interface InternalState {
  sidebarState: "none" | "type" | "config"
  selectedTransformationKey: string | null
  transformationToEdit:
    | {
        transformationId: string
        position: "inplace"
      }
    | {
        position: "above" | "below"
        targetId: string
      }
    | null
}

export type FocusObjects =
  | (typeof DEFAULT_FOCUS_OBJECTS)[number]
  | (string & {})

export type SyncStatus = "unsaved" | "saving" | "saved" | "error"

export interface EditorState<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  currentImage: string | undefined
  originalImageList: FileElement<Metadata>[]
  imageList: string[]
  transformations: Transformation[]
  visibleTransformations: Record<string, boolean>
  showOriginal: boolean
  signer?: Signer<Metadata>
  signingImages: Record<string, boolean>
  signingAbortControllers: Record<string, AbortController>
  signedUrlCache: Record<string, string>
  currentTransformKey: string
  focusObjects?: ReadonlyArray<FocusObjects>
  _internalState: InternalState
  templateName: string
  templateId: string | null
  /**
   * Template visibility scope. For dashboard integration this maps to:
   * - true  => onlyMe (private)
   * - false => everyone (shared)
   * - null  => unknown/unloaded
   */
  templateIsPrivate: boolean | null
  syncStatus: SyncStatus
  storageError?: string
  isPristine: boolean
  /**
   * After a 401/403 template write failure, saves are blocked so a follow-up
   * save cannot POST a duplicate after the store clears `templateId`.
   */
  templateStorageWriteBlocked: boolean

  /** Versioned sync model to keep UI stable under save/edit races. */
  localChangeVersion: number
  lastSyncedVersion: number
  /**
   * Timestamp (ms) of the last successful save to remote storage.
   * Used to debounce/reset periodic auto-save scheduling.
   */
  lastSavedAt: number | null
  /**
   * True while the transformation config sidebar form has unapplied edits (RHF isDirty).
   * Used by header status and close confirmation alongside versioned unsynced state.
   */
  transformationConfigFormDirty: boolean
}

export type EditorStore<Metadata extends RequiredMetadata = RequiredMetadata> =
  EditorState<Metadata> & EditorActions<Metadata>

export type EditorActions<
  Metadata extends RequiredMetadata = RequiredMetadata,
> = {
  initialize: (initialData?: {
    imageList?: Array<string | InputFileElement<Metadata>>
    signer?: Signer<Metadata>
    focusObjects?: ReadonlyArray<FocusObjects>
    templateName?: string
    templateId?: string
  }) => void
  destroy: () => void
  setCurrentImage: (imageSrc: string | undefined) => void
  setImageDimensions: (
    imageSrc: string,
    dimensions: { width: number; height: number } | null,
  ) => void
  addImage: (imageSrc: string | InputFileElement<Metadata>) => void
  addImages: (imageSrcs: Array<string | InputFileElement<Metadata>>) => void
  removeImage: (imageSrc: string) => void
  loadTemplate: (template: Omit<Transformation, "id">[]) => void
  moveTransformation: (
    activeId: UniqueIdentifier,
    overId: UniqueIdentifier,
  ) => void
  toggleTransformationVisibility: (id: string) => void
  addTransformation: (
    transformation: Omit<Transformation, "id">,
    position?: number,
  ) => string
  removeTransformation: (id: string) => void
  updateTransformation: (
    id: string,
    updatedTransformation: Omit<Transformation, "id">,
  ) => void
  setShowOriginal: (showOriginal: boolean) => void
  setTemplateName: (name: string) => void
  setTemplateId: (id: string | null) => void
  setTemplateIsPrivate: (isPrivate: boolean | null) => void
  /**
   * Sets template metadata from storage responses without bumping local version.
   * Use this when hydrating from server/list responses (save success, load from library).
   */
  hydrateTemplateMetadata: (meta: {
    templateId: string | null
    templateName: string
    templateIsPrivate: boolean | null
  }) => void
  setSyncStatus: (status: SyncStatus, error?: string) => void
  setIsPristine: (pristine: boolean) => void
  bumpLocalChangeVersion: () => void
  markSynced: (version?: number) => void
  setLastSavedAt: (ts: number | null) => void
  setTransformationConfigFormDirty: (dirty: boolean) => void
  resetToNewTemplate: () => void
  restoreSession: (
    state: Pick<
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
    >,
  ) => void
  /**
   * Blocks any further writes to template storage while keeping the current
   * template state intact (so the user can keep viewing/editing locally).
   * Intended for 401/403 write failures.
   */
  blockTemplateStorageWrites: (message?: string) => void
  /**
   * Clears the loaded template and surfaces an error when access is revoked
   * for viewing/loading the template.
   */
  denyTemplateStorageAccessAndReset: (message?: string) => void

  _setSidebarState: (state: "none" | "type" | "config") => void
  _setSelectedTransformationKey: (key: string | null) => void
  _setTransformationToEdit: (
    transformationId: string | null,
    position?: "inplace" | "above" | "below",
  ) => void
}
