import type { UniqueIdentifier } from "@dnd-kit/core"
import { buildSrc, buildTransformationString } from "@imagekit/javascript"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { buildIkTransformations } from "./runtime/buildIkTransformations"
import { replaceImagePathPlaceholders } from "./runtime/replaceImagePathPlaceholders"
import type { DEFAULT_FOCUS_OBJECTS } from "./schema"
import type { TemplatePreset, TemplateVariable } from "./storage/types"
import { bumpLocalChangeVersion as bumpVersion } from "./sync/templateSyncVersioning"
import {
  resolveTemplateForRender,
  type TemplateRenderError,
} from "./templateRuntime/resolveTemplateForRender"
import { extractImagePath } from "./utils"

export const TRANSFORMATION_STATE_VERSION = "v1" as const

export const USER_PREFS_STORAGE_KEY = "ik-editor:user_prefs:v1" as const

export const DEFAULT_EDITOR_URL_ENDPOINT =
  "https://ik.imagekit.io/demo" as const

export type UserPrefs = {
  showUrlPreviewStrip: boolean
  showThumbnailStrip: boolean
}

const DEFAULT_USER_PREFS: UserPrefs = {
  showUrlPreviewStrip: true,
  showThumbnailStrip: true,
}

function readUserPrefsFromLocalStorage(): UserPrefs {
  if (typeof window === "undefined") return DEFAULT_USER_PREFS
  try {
    const raw = window.localStorage.getItem(USER_PREFS_STORAGE_KEY)
    if (!raw) return DEFAULT_USER_PREFS
    const parsed = JSON.parse(raw) as Partial<UserPrefs> | null
    if (!parsed || typeof parsed !== "object") return DEFAULT_USER_PREFS
    return {
      showUrlPreviewStrip:
        typeof parsed.showUrlPreviewStrip === "boolean"
          ? parsed.showUrlPreviewStrip
          : DEFAULT_USER_PREFS.showUrlPreviewStrip,
      showThumbnailStrip:
        typeof parsed.showThumbnailStrip === "boolean"
          ? parsed.showThumbnailStrip
          : DEFAULT_USER_PREFS.showThumbnailStrip,
    }
  } catch {
    return DEFAULT_USER_PREFS
  }
}

function writeUserPrefsToLocalStorage(prefs: UserPrefs) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(USER_PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

export interface Transformation {
  id: string
  key: string
  name: string
  type: "transformation"
  /**
   * Editor-facing transformation config (UI schema shape).
   * This is later mapped into ImageKit delivery transformations for URL building.
   */
  value: Record<string, unknown>
  version?: typeof TRANSFORMATION_STATE_VERSION
  /** Persisted visibility flag. Absent or true = visible; false = hidden. */
  enabled?: boolean
  /**
   * Nested layer children. Only meaningful for `layers-image` and
   * `layers-canvas` transformations (text layers cannot host children).
   * ImageKit allows up to 3 levels of nesting (root + 2 children deep).
   * Each child is a fully-formed `Transformation` with its own id;
   * serialization recursively appends each child as a nested overlay step
   * inside the parent layer's transformation chain.
   *
   * Optional and unused by older saved templates, so adding this field is
   * backwards-compatible: any template without it produces the exact same
   * URL as before.
   */
  children?: Transformation[]
}

/**
 * Maximum nesting depth allowed for layers (root layer = depth 0). ImageKit
 * supports up to 3 levels total, so children are allowed only when the parent
 * is at depth < {@link MAX_LAYER_NEST_DEPTH}.
 */
export const MAX_LAYER_NEST_DEPTH = 2

/**
 * Layer-key predicate that opts a transformation into nesting. Image and canvas
 * layers may host children. Text layers cannot. This helper gates whether a row
 * exposes an "Add nested layer" button at all.
 */
export function isLayerKey(key: string): boolean {
  return (
    key === "layers-image" || key === "layers-text" || key === "layers-canvas"
  )
}

/**
 * Recursively walks a transformation tree (root + arbitrary nested children)
 * looking for a node by id. Returns `undefined` when not found. Used by the
 * config sidebar so editing a nested child works without any caller changes.
 */
export function findTransformationDeep(
  list: Transformation[] | undefined,
  id: string,
): Transformation | undefined {
  if (!list) return undefined
  for (const t of list) {
    if (t.id === id) return t
    if (t.children && t.children.length > 0) {
      const hit = findTransformationDeep(t.children, id)
      if (hit) return hit
    }
  }
  return undefined
}

export type RequiredMetadata = { requireSignedUrl: boolean }

export interface FileElement<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  url: string
  metadata: Metadata
  /**
   * Dimensions of the original asset (iw/ih/iar).
   * Set once when we first learn dimensions; never overwritten by transformed renders.
   */
  originalImageDimensions: { width: number; height: number } | null
  /**
   * Latest known rendered dimensions for this asset in the editor (cw/ch/car).
   * This may reflect transformed preview renders.
   */
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
  /**
   * When set, the next addition from the type/config sidebar is appended as
   * a nested child of the layer with this id, rather than as a new top-level
   * step. Cleared after the addition completes (or the user cancels).
   */
  parentForChild: string | null
}

export type FocusObjects =
  | (typeof DEFAULT_FOCUS_OBJECTS)[number]
  | (string & {})

export type SyncStatus = "unsaved" | "saving" | "saved" | "error"

export interface EditorState<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  /**
   * Host-provided URL endpoint used for default blank canvas loading.
   * When no images are provided, the editor will load `${urlEndpoint}/ik-canvas.png`.
   */
  urlEndpoint: string
  currentImage: string | undefined
  /** Current image URL before resolving template variables (placeholders intact). */
  currentPrimitiveImage: string | undefined
  originalImageList: FileElement<Metadata>[]
  imageList: string[]
  /** Image URLs before resolving template variables (placeholders intact). */
  primitiveImageList: string[]
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
  /** Template-scoped variables (wired as `{{variableId}}` in URLs), persisted with the template. */
  templateVariables: TemplateVariable[]
  /** Named preset value sets for variables. */
  templatePresets: TemplatePreset[]
  /** Active preset used for preview-time variable overrides. */
  activeTemplatePresetId: string | null
  /** Blocks rendering when variables are unresolved. */
  templateRenderError: TemplateRenderError | null

  /** Local (per-user, per-browser) UI preferences. */
  userPrefs: UserPrefs
}

export type EditorActions<
  Metadata extends RequiredMetadata = RequiredMetadata,
> = {
  initialize: (initialData?: {
    imageList?: Array<string | InputFileElement<Metadata>>
    urlEndpoint?: string
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
  hydrateTemplateVariables: (
    variables?: TemplateVariable[],
    presets?: TemplatePreset[],
  ) => void
  /** Replaces the full variables list (modal-style edits). */
  setTemplateVariables: (variables: TemplateVariable[]) => void
  /** Replaces the full presets list (modal-style edits). */
  setTemplatePresets: (presets: TemplatePreset[]) => void
  setActiveTemplatePresetId: (presetId: string | null) => void
  upsertTemplateVariable: (variable: {
    /** When set, update the existing definition with this stable id. */
    id?: string
    name: string
    defaultValue: string
    description?: string
  }) => TemplateVariable
  deleteTemplateVariable: (variableId: string) => void
  upsertTemplatePreset: (preset: {
    id?: string
    name: string
    valuesByVariableId?: Record<string, string | undefined>
  }) => TemplatePreset
  deleteTemplatePreset: (presetId: string) => void
  setTemplatePresetValue: (args: {
    presetId: string
    variableId: string
    value: string
  }) => void
  moveTransformation: (
    activeId: UniqueIdentifier,
    overId: UniqueIdentifier,
  ) => void
  toggleTransformationVisibility: (id: string) => void
  addTransformation: (
    transformation: Omit<Transformation, "id">,
    position?: number,
  ) => string
  addChildTransformation: (
    parentId: string,
    transformation: Omit<Transformation, "id">,
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

  hydrateUserPrefsFromStorage: () => void
  setUserPrefs: (next: Partial<UserPrefs>) => void

  _setSidebarState: (state: "none" | "type" | "config") => void
  _setSelectedTransformationKey: (key: string | null) => void
  _setTransformationToEdit: (
    transformationId: string | null,
    position?: "inplace" | "above" | "below",
  ) => void
  _setParentForChild: (parentId: string | null) => void
}

const initialTransformations: Transformation[] = []

const initialVisibleTransformations: Record<string, boolean> = {}

function initTransformationStates(transformations: Transformation[]) {
  transformations.forEach((transformation) => {
    initialVisibleTransformations[transformation.name] = true
  })
}

initTransformationStates(initialTransformations)

function normalizeImage<Metadata extends RequiredMetadata = RequiredMetadata>(
  image: string | InputFileElement<Metadata>,
): FileElement<Metadata> {
  if (typeof image === "string") {
    return {
      url: image,
      metadata: { requireSignedUrl: false } as Metadata,
      originalImageDimensions: null,
      imageDimensions: null,
    }
  }
  return {
    url: image.url,
    metadata: image.metadata
      ? {
          ...image.metadata,
          requireSignedUrl: image.metadata.requireSignedUrl ?? false,
        }
      : ({ requireSignedUrl: false } as Metadata),
    originalImageDimensions: null,
    imageDimensions: null,
  }
}

const DEFAULT_STATE: EditorState = {
  urlEndpoint: DEFAULT_EDITOR_URL_ENDPOINT,
  currentImage: undefined,
  currentPrimitiveImage: undefined,
  originalImageList: [],
  imageList: [],
  primitiveImageList: [],
  transformations: initialTransformations,
  visibleTransformations: initialVisibleTransformations,
  showOriginal: false,
  signer: undefined,
  signingImages: {},
  signingAbortControllers: {},
  signedUrlCache: {},
  currentTransformKey: "",
  focusObjects: undefined,
  _internalState: {
    sidebarState: "none",
    selectedTransformationKey: null,
    transformationToEdit: null,
    parentForChild: null,
  },
  templateName: "Untitled Template",
  templateId: null,
  templateIsPrivate: null,
  syncStatus: "unsaved",
  storageError: undefined,
  isPristine: true,
  templateStorageWriteBlocked: false,
  localChangeVersion: 0,
  lastSyncedVersion: 0,
  lastSavedAt: null,
  transformationConfigFormDirty: false,
  templateVariables: [],
  templatePresets: [],
  activeTemplatePresetId: null,
  templateRenderError: null,
  userPrefs: DEFAULT_USER_PREFS,
}

const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    initialize: (initialData) => {
      // Load per-user preferences on first mount in the browser.
      get().hydrateUserPrefsFromStorage()

      const updates: Partial<EditorState> = {}
      const nextUrlEndpoint =
        initialData?.urlEndpoint?.trim() || DEFAULT_EDITOR_URL_ENDPOINT
      updates.urlEndpoint = nextUrlEndpoint

      const canvasUrl = `${nextUrlEndpoint}/ik-canvas.png`

      const provided =
        initialData?.imageList && initialData.imageList.length > 0
          ? initialData.imageList
          : [canvasUrl]

      const imgs = provided.map(normalizeImage)
      updates.originalImageList = imgs
      updates.imageList = imgs.map((i) => i.url)
      updates.currentImage = imgs[0]?.url
      if (initialData?.signer) {
        updates.signer = initialData.signer
      }
      if (initialData?.focusObjects) {
        updates.focusObjects = initialData.focusObjects
      }
      if (initialData?.templateName) {
        updates.templateName = initialData.templateName
        updates.isPristine = false
      }
      if (initialData?.templateId) {
        updates.templateId = initialData.templateId
        updates.isPristine = false
      }
      // If host provides a template id/name, assume we're starting from a synced template.
      if (initialData?.templateId || initialData?.templateName) {
        updates.syncStatus = "saved"
        updates.localChangeVersion = 0
        updates.lastSyncedVersion = 0
      }
      if (Object.keys(updates).length > 0) {
        set(updates as EditorState)
      }
    },

    destroy: () => {
      set(DEFAULT_STATE)
    },

    hydrateUserPrefsFromStorage: () => {
      set({ userPrefs: readUserPrefsFromLocalStorage() })
    },

    setUserPrefs: (next) => {
      set((state) => ({ userPrefs: { ...state.userPrefs, ...next } }))
    },

    // Actions
    setCurrentImage: (imageSrc) => {
      set({ currentImage: imageSrc })
    },

    setImageDimensions: (imageSrc, imageDimensions) => {
      set((state) => {
        const index = state.originalImageList.findIndex(
          (img) => img.url === imageSrc,
        )
        if (index === -1) return state
        const updatedImageList = [...state.originalImageList]
        // Preserve the original asset dimensions the first time we see them.
        if (!updatedImageList[index].originalImageDimensions) {
          updatedImageList[index].originalImageDimensions = imageDimensions
        }
        // Always update current (rendered) dimensions.
        updatedImageList[index].imageDimensions = imageDimensions
        return { originalImageList: updatedImageList }
      })
    },

    addImage: (imageSrc) => {
      const img = normalizeImage(imageSrc)
      if (!get().originalImageList.some((i) => i.url === img.url)) {
        set((state) => ({
          originalImageList: [...state.originalImageList, img],
          currentImage: img.url,
        }))
      } else {
        set({ currentImage: img.url })
      }
    },

    addImages: (imageSrcs) => {
      const existing = get().originalImageList
      const uniqueImages = imageSrcs
        .map(normalizeImage)
        .filter((img) => !existing.some((i) => i.url === img.url))
      set((state) => ({
        originalImageList: [...state.originalImageList, ...uniqueImages],
      }))
    },

    removeImage: (imageSrc) => {
      set((state) => {
        const canvasUrl = `${state.urlEndpoint}/ik-canvas.png`
        // Never allow the editor to become image-less; the canvas is the fallback.
        if (state.originalImageList.length === 1) {
          if (state.originalImageList[0]?.url === canvasUrl) return state
          const canvas = normalizeImage(canvasUrl)
          return {
            originalImageList: [canvas],
            currentImage: canvasUrl,
            signingImages: {},
            signingAbortControllers: {},
            signedUrlCache: {},
          }
        }

        const index = state.originalImageList.findIndex(
          (img) => img.url === imageSrc,
        )
        // Remove the image from the list
        const updatedImageList = state.originalImageList.filter(
          (img) => img.url !== imageSrc,
        )

        let newCurrentImage = state.currentImage
        if (state.currentImage === imageSrc) {
          if (updatedImageList.length > 0) {
            if (index >= updatedImageList.length) {
              newCurrentImage =
                updatedImageList[updatedImageList.length - 1].url
            } else {
              newCurrentImage = updatedImageList[index].url
            }
          } else {
            newCurrentImage = canvasUrl
          }
        }

        const updatedSigningImages = { ...state.signingImages }
        delete updatedSigningImages[imageSrc]

        const updatedSigningAbortControllers = {
          ...state.signingAbortControllers,
        }
        const controller = updatedSigningAbortControllers[imageSrc]
        if (controller) {
          controller.abort()
          delete updatedSigningAbortControllers[imageSrc]
        }

        const updatedSignedUrlCache = { ...state.signedUrlCache }
        Object.keys(updatedSignedUrlCache).forEach((key) => {
          if (key.startsWith(`${imageSrc}::`)) {
            delete updatedSignedUrlCache[key]
          }
        })

        if (updatedImageList.length === 0) {
          const canvas = normalizeImage(canvasUrl)
          return {
            originalImageList: [canvas],
            currentImage: canvasUrl,
            signingImages: updatedSigningImages,
            signingAbortControllers: updatedSigningAbortControllers,
            signedUrlCache: updatedSignedUrlCache,
          }
        }

        return {
          originalImageList: updatedImageList,
          currentImage: newCurrentImage,
          signingImages: updatedSigningImages,
          signingAbortControllers: updatedSigningAbortControllers,
          signedUrlCache: updatedSignedUrlCache,
        }
      })
    },

    hydrateTemplateVariables: (variables, presets) => {
      set((state) => ({
        ...(variables !== undefined ? { templateVariables: variables } : {}),
        ...(presets !== undefined ? { templatePresets: presets } : {}),
      }))
    },

    setTemplateVariables: (variables) => {
      set((state) => ({
        templateVariables: variables,
        // Strip deleted variable ids from all preset overrides.
        templatePresets: state.templatePresets.map((p) => ({
          ...p,
          valuesByVariableId: Object.fromEntries(
            Object.entries(p.valuesByVariableId ?? {}).filter(([id]) =>
              variables.some((v) => v.id === id),
            ),
          ),
        })),
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
      }))
    },

    setTemplatePresets: (presets) => {
      set((state) => {
        const exists = state.activeTemplatePresetId
          ? presets.some((p) => p.id === state.activeTemplatePresetId)
          : true
        return {
          templatePresets: presets,
          activeTemplatePresetId: exists ? state.activeTemplatePresetId : null,
          isPristine: false,
          localChangeVersion: bumpVersion(state.localChangeVersion),
        }
      })
    },

    setActiveTemplatePresetId: (presetId) => {
      set({ activeTemplatePresetId: presetId })
    },

    upsertTemplateVariable: (partial) => {
      let result: TemplateVariable | null = null
      set((state) => {
        const list = [...state.templateVariables]
        const idx = partial.id
          ? list.findIndex((v) => v.id === partial.id)
          : list.findIndex((v) => v.name === partial.name)
        const makeId = () =>
          typeof globalThis.crypto !== "undefined" &&
          typeof globalThis.crypto.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `var_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        if (idx >= 0) {
          const prev = list[idx]
          list[idx] = {
            ...prev,
            name: partial.name,
            defaultValue: partial.defaultValue,
            description: partial.description,
          }
          result = list[idx] ?? null
        } else {
          const nextVar: TemplateVariable = {
            id: partial.id ?? makeId(),
            name: partial.name,
            defaultValue: partial.defaultValue,
            description: partial.description,
          }
          list.push(nextVar)
          result = nextVar
        }
        return {
          templateVariables: list,
          isPristine: false,
          localChangeVersion: bumpVersion(state.localChangeVersion),
        }
      })
      if (!result) {
        throw new Error("upsertTemplateVariable: expected variable result")
      }
      return result
    },

    deleteTemplateVariable: (variableId) => {
      set((state) => {
        const nextVars = state.templateVariables.filter(
          (v) => v.id !== variableId,
        )
        const nextPresets = state.templatePresets.map((p) => {
          const { [variableId]: _deleted, ...rest } = p.valuesByVariableId ?? {}
          return { ...p, valuesByVariableId: rest }
        })
        return {
          templateVariables: nextVars,
          templatePresets: nextPresets,
          isPristine: false,
          localChangeVersion: bumpVersion(state.localChangeVersion),
        }
      })
    },

    upsertTemplatePreset: (partial) => {
      let result: TemplatePreset | null = null
      set((state) => {
        const list = [...state.templatePresets]
        const idx = partial.id
          ? list.findIndex((p) => p.id === partial.id)
          : list.findIndex((p) => p.name === partial.name)
        const makeId = () =>
          typeof globalThis.crypto !== "undefined" &&
          typeof globalThis.crypto.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `preset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        if (idx >= 0) {
          const prev = list[idx]
          list[idx] = {
            ...prev,
            name: partial.name,
            valuesByVariableId:
              partial.valuesByVariableId ?? prev.valuesByVariableId,
          }
          result = list[idx] ?? null
        } else {
          const nextPreset: TemplatePreset = {
            id: partial.id ?? makeId(),
            name: partial.name,
            valuesByVariableId: partial.valuesByVariableId ?? {},
          }
          list.push(nextPreset)
          result = nextPreset
        }
        return {
          templatePresets: list,
          isPristine: false,
          localChangeVersion: bumpVersion(state.localChangeVersion),
        }
      })
      if (!result)
        throw new Error("upsertTemplatePreset: expected preset result")
      return result
    },

    deleteTemplatePreset: (presetId) => {
      set((state) => {
        const nextPresets = state.templatePresets.filter(
          (p) => p.id !== presetId,
        )
        return {
          templatePresets: nextPresets,
          activeTemplatePresetId:
            state.activeTemplatePresetId === presetId
              ? null
              : state.activeTemplatePresetId,
          isPristine: false,
          localChangeVersion: bumpVersion(state.localChangeVersion),
        }
      })
    },

    setTemplatePresetValue: ({ presetId, variableId, value }) => {
      set((state) => ({
        templatePresets: state.templatePresets.map((p) =>
          p.id !== presetId
            ? p
            : {
                ...p,
                valuesByVariableId: {
                  ...(p.valuesByVariableId ?? {}),
                  [variableId]: value,
                },
              },
        ),
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
      }))
    },

    loadTemplate: (template) => {
      const stamp = `${Date.now()}`
      let counter = 0
      const stampIds = (
        list: Array<Omit<Transformation, "id">>,
      ): Transformation[] =>
        list.map((transformation) => ({
          ...transformation,
          id: `transformation-${stamp}-${counter++}`,
          version: TRANSFORMATION_STATE_VERSION,
          children: transformation.children
            ? stampIds(
                transformation.children as Array<Omit<Transformation, "id">>,
              )
            : undefined,
        }))
      const transformationsWithIds = stampIds(template)

      const visibleTransformations: Record<string, boolean> = {}
      const collectVisibility = (list: Transformation[]): void => {
        list.forEach((t) => {
          visibleTransformations[t.id] = t.enabled !== false
          if (t.children && t.children.length > 0) {
            collectVisibility(t.children)
          }
        })
      }
      collectVisibility(transformationsWithIds)

      set((state) => {
        const nextVersion = bumpVersion(state.localChangeVersion)
        return {
          transformations: transformationsWithIds,
          visibleTransformations: {
            ...state.visibleTransformations,
            ...visibleTransformations,
          },
          _internalState: {
            sidebarState: "none",
            selectedTransformationKey: null,
            transformationToEdit: null,
            parentForChild: null,
          },
          isPristine: false,
          // Loading an existing template implies we're in sync with storage.
          syncStatus: "saved",
          localChangeVersion: nextVersion,
          lastSyncedVersion: nextVersion,
          templateStorageWriteBlocked: false,
          transformationConfigFormDirty: false,
        }
      })
    },

    moveTransformation: (activeId, overId) => {
      set((state) => {
        const activeIdStr = String(activeId)
        const overIdStr = String(overId)
        const oldIndex = state.transformations.findIndex(
          (item) => item.id === activeIdStr,
        )
        const newIndex = state.transformations.findIndex(
          (item) => item.id === overIdStr,
        )

        if (oldIndex !== -1 && newIndex !== -1) {
          const updatedTransformations = [...state.transformations]
          const [removed] = updatedTransformations.splice(oldIndex, 1)
          updatedTransformations.splice(newIndex, 0, removed)

          return {
            transformations: updatedTransformations,
            isPristine: false,
            localChangeVersion: bumpVersion(state.localChangeVersion),
          }
        }
        return { transformations: state.transformations }
      })
    },

    toggleTransformationVisibility: (id) => {
      set((state) => {
        const newVisible = !state.visibleTransformations[id]
        const flipById = (list: Transformation[]): Transformation[] =>
          list.map((t) => {
            if (t.id === id) return { ...t, enabled: newVisible }
            if (t.children && t.children.length > 0) {
              return { ...t, children: flipById(t.children) }
            }
            return t
          })
        return {
          visibleTransformations: {
            ...state.visibleTransformations,
            [id]: newVisible,
          },
          transformations: flipById(state.transformations),
          isPristine: false,
          localChangeVersion: bumpVersion(state.localChangeVersion),
        }
      })
    },

    addTransformation: (transformation, position) => {
      const id = `transformation-${Date.now()}`

      if (typeof position === "number") {
        set((state) => {
          const transformations = [...state.transformations]
          transformations.splice(position, 0, { ...transformation, id })
          return {
            transformations,
            visibleTransformations: {
              ...state.visibleTransformations,
              [id]: true,
            },
            isPristine: false,
            localChangeVersion: bumpVersion(state.localChangeVersion),
          }
        })

        return id
      }

      set((state) => {
        return {
          transformations: [
            ...state.transformations,
            { ...transformation, id },
          ],
          visibleTransformations: {
            ...state.visibleTransformations,
            [id]: true,
          },
          isPristine: false,
          localChangeVersion: bumpVersion(state.localChangeVersion),
        }
      })

      return id
    },

    removeTransformation: (id) => {
      const stripById = (list: Transformation[]): Transformation[] =>
        list
          .filter((t) => t.id !== id)
          .map((t) =>
            t.children && t.children.length > 0
              ? { ...t, children: stripById(t.children) }
              : t,
          )
      set((state) => ({
        transformations: stripById(state.transformations),
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
      }))
    },

    updateTransformation: (
      id: string,
      updatedTransformation: Omit<Transformation, "id">,
    ) => {
      const replaceById = (list: Transformation[]): Transformation[] =>
        list.map((t) => {
          if (t.id === id) {
            return {
              ...updatedTransformation,
              id,
              children: t.children,
            }
          }
          if (t.children && t.children.length > 0) {
            return { ...t, children: replaceById(t.children) }
          }
          return t
        })
      set((state) => ({
        transformations: replaceById(state.transformations),
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
      }))
    },

    addChildTransformation: (parentId, transformation) => {
      const id = `transformation-${Date.now()}`
      const appendChild = (list: Transformation[]): Transformation[] =>
        list.map((t) => {
          if (t.id === parentId) {
            return {
              ...t,
              children: [...(t.children ?? []), { ...transformation, id }],
            }
          }
          if (t.children && t.children.length > 0) {
            return { ...t, children: appendChild(t.children) }
          }
          return t
        })
      set((state) => ({
        transformations: appendChild(state.transformations),
        visibleTransformations: {
          ...state.visibleTransformations,
          [id]: true,
        },
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
      }))
      return id
    },

    _setParentForChild: (parentId) => {
      set((state) => ({
        _internalState: {
          ...state._internalState,
          parentForChild: parentId,
        },
      }))
    },

    setShowOriginal: (showOriginal) => {
      set(() => ({
        showOriginal,
      }))
    },

    setTemplateName: (name) => {
      set((state) => ({
        templateName: name,
        isPristine: state.templateName === name ? state.isPristine : false,
        localChangeVersion:
          state.templateName === name
            ? state.localChangeVersion
            : bumpVersion(state.localChangeVersion),
      }))
    },

    setTemplateId: (id) => {
      set({ templateId: id })
    },

    setTemplateIsPrivate: (isPrivate) => {
      set((state) => ({
        templateIsPrivate: isPrivate,
        localChangeVersion:
          state.templateIsPrivate === isPrivate
            ? state.localChangeVersion
            : bumpVersion(state.localChangeVersion),
      }))
    },

    hydrateTemplateMetadata: ({
      templateId,
      templateName,
      templateIsPrivate,
    }) => {
      set(() => ({
        templateId,
        templateName,
        templateIsPrivate,
      }))
    },

    setSyncStatus: (status, error?) => {
      set({ syncStatus: status, storageError: error })
    },

    bumpLocalChangeVersion: () => {
      set((state) => ({
        localChangeVersion: bumpVersion(state.localChangeVersion),
      }))
    },

    markSynced: (version) => {
      set((state) => ({
        lastSyncedVersion: version ?? state.localChangeVersion,
      }))
    },

    setLastSavedAt: (ts) => {
      set({ lastSavedAt: ts })
    },

    setTransformationConfigFormDirty: (dirty) => {
      set({ transformationConfigFormDirty: dirty })
    },

    setIsPristine: (pristine: boolean) => {
      set({ isPristine: pristine })
    },

    resetToNewTemplate: () => {
      set({
        transformations: [],
        visibleTransformations: {},
        templateName: "Untitled Template",
        templateId: null,
        templateIsPrivate: null,
        syncStatus: "unsaved",
        storageError: undefined,
        isPristine: true,
        templateStorageWriteBlocked: false,
        localChangeVersion: 0,
        lastSyncedVersion: 0,
        lastSavedAt: null,
        transformationConfigFormDirty: false,
        templateVariables: [],
        templatePresets: [],
        activeTemplatePresetId: null,
        templateRenderError: null,
        _internalState: {
          sidebarState: "none",
          selectedTransformationKey: null,
          transformationToEdit: null,
          parentForChild: null,
        },
      })
    },

    blockTemplateStorageWrites: (message) => {
      set({
        syncStatus: "error",
        storageError: message ?? "You no longer have access to this template.",
        templateStorageWriteBlocked: true,
      })
    },

    denyTemplateStorageAccessAndReset: (message) => {
      set({
        transformations: [],
        visibleTransformations: {},
        templateName: "Untitled Template",
        templateId: null,
        templateIsPrivate: null,
        syncStatus: "error",
        storageError: message ?? "You no longer have access to this template.",
        isPristine: true,
        templateStorageWriteBlocked: true,
        localChangeVersion: 0,
        lastSyncedVersion: 0,
        lastSavedAt: null,
        transformationConfigFormDirty: false,
        templateVariables: [],
        templatePresets: [],
        activeTemplatePresetId: null,
        templateRenderError: null,
        _internalState: {
          sidebarState: "none",
          selectedTransformationKey: null,
          transformationToEdit: null,
          parentForChild: null,
        },
      })
    },

    _setSidebarState: (sidebarState) => {
      set((state) => ({
        _internalState: { ...state._internalState, sidebarState },
      }))
    },

    _setSelectedTransformationKey: (key) => {
      set((state) => ({
        _internalState: {
          ...state._internalState,
          selectedTransformationKey: key,
        },
      }))
    },

    _setTransformationToEdit: (
      transformationOrTargetId: string | null,
      position: "inplace" | "above" | "below" = "inplace",
    ) => {
      if (!transformationOrTargetId) {
        set((state) => ({
          _internalState: {
            ...state._internalState,
            transformationToEdit: null,
            parentForChild: null,
          },
        }))
      } else if (position === "inplace") {
        set((state) => ({
          _internalState: {
            ...state._internalState,
            transformationToEdit: {
              transformationId: transformationOrTargetId,
              position,
            },
          },
        }))
      } else if (position === "above") {
        set((state) => ({
          _internalState: {
            ...state._internalState,
            transformationToEdit: {
              position,
              targetId: transformationOrTargetId,
            },
          },
        }))
      } else if (position === "below") {
        set((state) => ({
          _internalState: {
            ...state._internalState,
            transformationToEdit: {
              position,
              targetId: transformationOrTargetId,
            },
          },
        }))
      }
    },
  })),
)

const calculateImageList = (
  imageList: FileElement[],
  transformations: Transformation[],
  visibleTransformations: Record<string, boolean>,
  showOriginal: boolean,
  templateVariables: TemplateVariable[],
  templatePresets: TemplatePreset[],
  activeTemplatePresetId: string | null,
  signer: Signer | undefined,
  activeImageIndex: number,
  signedUrlCache: Record<string, string>,
) => {
  if (showOriginal) {
    const imgs = imageList.map((i) => i.url)
    return {
      imgs,
      primitiveImgs: imgs,
      activeImageIndex,
      toSign: [] as Array<{
        index: number
        request: SignerRequest
        cacheKey: string
      }>,
      transformKey: "original",
      renderError: null as TemplateRenderError | null,
    }
  }

  const visibleSteps = transformations
    .filter((transformation) => visibleTransformations[transformation.id])
    .map(({ id: _id, ...rest }) => rest)

  // Primitive = apply transformations without substituting user variables.
  const primitiveTransformations = visibleSteps

  const resolved = resolveTemplateForRender({
    transformations: visibleSteps,
    variables: templateVariables,
    presets: templatePresets,
    activePresetId: activeTemplatePresetId,
  })

  if (!resolved.ok) {
    const imgs = imageList.map((i) => i.url)
    return {
      imgs,
      primitiveImgs: imgs,
      activeImageIndex,
      toSign: [] as Array<{
        index: number
        request: SignerRequest
        cacheKey: string
      }>,
      transformKey: `render-error:${resolved.error.type}:${resolved.error.unresolved.map((u) => u.id).join(",")}`,
      renderError: resolved.error,
    }
  }

  const IKTransformations = buildIkTransformations(resolved.transformations)
  const IKPrimitiveTransformations = buildIkTransformations(
    primitiveTransformations,
  )

  const transformKey = JSON.stringify(IKTransformations)

  const imgs: string[] = []
  const primitiveImgs: string[] = []
  const toSign: Array<{
    index: number
    request: SignerRequest
    cacheKey: string
  }> = []

  imageList.forEach((img, index) => {
    // Replace any __IMAGE_PATH__ placeholders with actual image path for this specific image
    const imagePath = extractImagePath(img.url)
    const transformationsForImage = replaceImagePathPlaceholders(
      IKTransformations,
      imagePath,
    )
    const primitiveTransformationsForImage = replaceImagePathPlaceholders(
      IKPrimitiveTransformations,
      imagePath,
    )

    const req = {
      url: img.url,
      transformation: transformationsForImage,
      metadata: img.metadata,
    }
    const primitiveReq = {
      url: img.url,
      transformation: primitiveTransformationsForImage,
      metadata: img.metadata,
    }

    if (req.transformation.length === 0) {
      imgs[index] = req.url
      primitiveImgs[index] = primitiveReq.url
      return
    }

    if (req.metadata.requireSignedUrl && signer) {
      const imageTransformKey = JSON.stringify(req.transformation)
      const cacheKey = `${req.url}::${imageTransformKey}`
      const cached = signedUrlCache[cacheKey]
      if (cached) {
        imgs[index] = cached
      } else {
        imgs[index] = req.url
        toSign.push({
          index,
          request: {
            ...req,
            transformation: buildTransformationString(req.transformation),
          },
          cacheKey,
        })
      }
      primitiveImgs[index] = buildSrc({
        src: primitiveReq.url,
        urlEndpoint: "does-not-matter",
        transformation: primitiveReq.transformation,
      })
      return
    }

    imgs[index] = buildSrc({
      src: req.url,
      urlEndpoint: "does-not-matter",
      transformation: req.transformation,
    })
    primitiveImgs[index] = buildSrc({
      src: primitiveReq.url,
      urlEndpoint: "does-not-matter",
      transformation: primitiveReq.transformation,
    })
  })

  return {
    imgs,
    primitiveImgs,
    activeImageIndex,
    toSign,
    transformKey,
    renderError: null,
  }
}

function recomputeImages() {
  const state = useEditorStore.getState()

  let currentIndex = 0
  if (state.currentImage) {
    const originalIndex = state.originalImageList.findIndex(
      (img) => img.url === state.currentImage,
    )

    if (originalIndex >= 0) {
      currentIndex = originalIndex
    } else {
      const imageListIndex = state.imageList.findIndex(
        (img) => img === state.currentImage,
      )
      currentIndex = Math.max(imageListIndex, 0)
    }
  }

  const {
    imgs,
    primitiveImgs,
    activeImageIndex,
    toSign,
    transformKey,
    renderError,
  } = calculateImageList(
    state.originalImageList,
    state.transformations,
    state.visibleTransformations,
    state.showOriginal,
    state.templateVariables,
    state.templatePresets,
    state.activeTemplatePresetId,
    state.signer,
    currentIndex,
    state.signedUrlCache,
  )

  const transformationsChanged = transformKey !== state.currentTransformKey
  if (transformationsChanged) {
    Object.values(state.signingAbortControllers).forEach((c) => c.abort())
    useEditorStore.setState({ signingImages: {}, signingAbortControllers: {} })
  }

  useEditorStore.setState({
    imageList: imgs,
    primitiveImageList: primitiveImgs,
    currentImage: imgs[activeImageIndex],
    currentPrimitiveImage: primitiveImgs[activeImageIndex],
    currentTransformKey: transformKey,
    templateRenderError: renderError,
  })

  const signer = state.signer
  if (signer && toSign.length > 0) {
    toSign.forEach(({ index, request, cacheKey }) => {
      const existing =
        useEditorStore.getState().signingAbortControllers[request.url]
      if (existing) existing.abort()
      const controller = new AbortController()
      useEditorStore.setState((s) => ({
        signingImages: { ...s.signingImages, [request.url]: true },
        signingAbortControllers: {
          ...s.signingAbortControllers,
          [request.url]: controller,
        },
      }))
      signer(request, controller)
        .then((signedUrl) => {
          useEditorStore.setState((s) => {
            const updatedImgs = [...s.imageList]
            updatedImgs[index] = signedUrl
            const wasCurrent = s.currentImage === s.imageList[index]
            return {
              imageList: updatedImgs,
              currentImage: wasCurrent ? signedUrl : s.currentImage,
              signedUrlCache: {
                ...s.signedUrlCache,
                [cacheKey]: signedUrl,
              },
            }
          })
        })
        .catch((err) => {
          if ((err as DOMException)?.name !== "AbortError") {
            // eslint-disable-next-line no-console
            console.error(err)
          }
        })
        .finally(() => {
          useEditorStore.setState((s) => {
            const updatedSigningImages = { ...s.signingImages }
            delete updatedSigningImages[request.url]
            const updatedControllers = { ...s.signingAbortControllers }
            delete updatedControllers[request.url]
            return {
              signingImages: updatedSigningImages,
              signingAbortControllers: updatedControllers,
            }
          })
        })
    })
  }
}

useEditorStore.subscribe(
  (state) => state.showOriginal,
  () => {
    recomputeImages()
  },
)

useEditorStore.subscribe(
  (state) => state.transformations,
  () => {
    recomputeImages()
  },
)

useEditorStore.subscribe(
  (state) => state.visibleTransformations,
  () => {
    recomputeImages()
  },
)

useEditorStore.subscribe(
  (state) => state.originalImageList,
  () => {
    recomputeImages()
  },
)

useEditorStore.subscribe(
  (state) => state.signer,
  () => {
    recomputeImages()
  },
)

useEditorStore.subscribe(
  (state) => state.templateVariables,
  () => {
    recomputeImages()
  },
)

useEditorStore.subscribe(
  (state) => state.templatePresets,
  () => {
    recomputeImages()
  },
)

useEditorStore.subscribe(
  (state) => state.activeTemplatePresetId,
  () => {
    recomputeImages()
  },
)

export { useEditorStore }

useEditorStore.subscribe(
  (state) => state.userPrefs,
  (prefs) => {
    writeUserPrefsToLocalStorage(prefs)
  },
)
