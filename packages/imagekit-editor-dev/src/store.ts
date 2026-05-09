import type { UniqueIdentifier } from "@dnd-kit/core"
import {
  buildSrc,
  buildTransformationString,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { DEFAULT_FOCUS_OBJECTS } from "./schema"
import { bumpLocalChangeVersion as bumpVersion } from "./sync/templateSyncVersioning"
import { convertTransformationToIK } from "./transformationConverter"
import { extractImagePath } from "./utils"

export const TRANSFORMATION_STATE_VERSION = "v1" as const

/**
 * Editor mode.
 * - `editing`: regular media-editing flow (host provides one or more images;
 *   future: videos). The user edits real source media.
 * - `canvas`: creative-template authoring on a sized blank canvas. The editor
 *   uses a hardcoded 1×1 transparent pixel as the source and prepends a
 *   resize step sized to `canvas.width×canvas.height` so the user sees a
 *   solid preview while authoring layer-only templates.
 */
export type EditorMode = "editing" | "canvas"

export interface CanvasConfig {
  width: number
  height: number
  /** Optional fill color (hex without `#`, e.g. "FFFFFF"). */
  background?: string
}

/**
 * Hardcoded source for canvas mode. A 1×1 fully transparent PNG hosted by
 * ImageKit; the resize step we inject in the preview pipeline expands it to
 * the configured canvas size.
 */
export const CANVAS_SOURCE_URL =
  "https://ik.imagekit.io/demo/pixel_transparent.png"

export interface Transformation {
  id: string
  key: string
  name: string
  type: "transformation"
  value: IKTransformation
  version?: typeof TRANSFORMATION_STATE_VERSION
  /** Persisted visibility flag. Absent or true = visible; false = hidden. */
  enabled?: boolean
  /**
   * Nested layer children. Only meaningful for `layers-text` and
   * `layers-image` transformations. ImageKit allows up to 3 levels of nesting
   * (root + 2 children deep). Each child is a fully-formed `Transformation`
   * with its own id; serialization recursively appends each child as a
   * nested overlay step inside the parent layer's transformation chain.
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
 * Layer-key prefix that opts a transformation into nesting. Image, text and
 * canvas (solid color) layers may host children. Per ImageKit docs the
 * children of any layer must themselves be image or text layers — canvases
 * cannot be nested. The type-picker enforces that filter; this helper only
 * gates whether the row exposes a "+" button at all.
 */
export function isLayerKey(key: string): boolean {
  return (
    key === "layers-image" ||
    key === "layers-text" ||
    key === "layers-canvas"
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

/**
 * Async picker invoked by image-path inputs (e.g. the image layer's `imageUrl`
 * field, or a host-rendered `VariableField` for an image-path variable).
 *
 * Resolve to a fully-qualified URL string (or a path the editor's URL builder
 * understands) to write it into the field. Resolve to `null`/`undefined` if
 * the user cancels the picker; the field value is left untouched.
 *
 * The editor never opens its own modal — the host owns the media library UI
 * and any backend calls. This keeps the editor decoupled from any specific
 * media catalog or asset service.
 */
export type OnPickImage = () => Promise<string | null | undefined>

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
  currentImage: string | undefined
  originalImageList: FileElement<Metadata>[]
  imageList: string[]
  transformations: Transformation[]
  visibleTransformations: Record<string, boolean>
  showOriginal: boolean
  signer?: Signer<Metadata>
  onPickImage?: OnPickImage
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

  /** Editor mode. See {@link EditorMode}. */
  mode: EditorMode
  /**
   * Canvas configuration when `mode === "canvas"`. Persisted as part of the
   * template record so re-opening a canvas template restores both the mode
   * and the dimensions.
   */
  canvas: CanvasConfig | null
}

export type EditorActions<
  Metadata extends RequiredMetadata = RequiredMetadata,
> = {
  initialize: (initialData?: {
    imageList?: Array<string | InputFileElement<Metadata>>
    signer?: Signer<Metadata>
    onPickImage?: OnPickImage
    focusObjects?: ReadonlyArray<FocusObjects>
    templateName?: string
    templateId?: string
    mode?: EditorMode
    canvas?: CanvasConfig | null
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
   * Switches editor mode and updates the source image list accordingly.
   * - canvas: replaces source list with the hardcoded transparent pixel.
   * - editing: clears the source list (host should provide images via
   *   `addImage`/`addImages`).
   */
  setMode: (mode: EditorMode, canvas?: CanvasConfig | null) => void
  /**
   * Update canvas dimensions / background. No-op outside canvas mode. Marks
   * the editor dirty and bumps the local change version so auto-save kicks in.
   */
  setCanvas: (canvas: CanvasConfig) => void
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
    imageDimensions: null,
  }
}

const DEFAULT_STATE: EditorState = {
  currentImage: undefined,
  originalImageList: [],
  imageList: [],
  transformations: initialTransformations,
  visibleTransformations: initialVisibleTransformations,
  showOriginal: false,
  signer: undefined,
  onPickImage: undefined,
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
  mode: "editing",
  canvas: null,
}

const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    initialize: (initialData) => {
      const updates: Partial<EditorState> = {}

      // Canvas mode: synthesize a single virtual image (the hardcoded
      // transparent pixel) so the existing preview pipeline has a source to
      // run transformations against. The user never sees this in the image
      // grid because canvas-mode UI hides image management.
      if (initialData?.mode === "canvas") {
        updates.mode = "canvas"
        updates.canvas = initialData.canvas ?? null
        const canvasImg: FileElement = {
          url: CANVAS_SOURCE_URL,
          metadata: { requireSignedUrl: false },
          imageDimensions: null,
        }
        updates.originalImageList = [canvasImg]
        updates.imageList = [canvasImg.url]
        updates.currentImage = canvasImg.url
      } else if (initialData?.imageList && initialData.imageList.length > 0) {
        const imgs = initialData.imageList.map(normalizeImage)
        updates.originalImageList = imgs
        updates.imageList = imgs.map((i) => i.url)
        updates.currentImage = imgs[0].url
      }
      if (initialData?.signer) {
        updates.signer = initialData.signer
      }
      if (initialData?.onPickImage) {
        updates.onPickImage = initialData.onPickImage
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
        updatedImageList[index].imageDimensions = imageDimensions
        return { originalImageList: updatedImageList }
      })
    },

    addImage: (imageSrc) => {
      if (get().mode === "canvas") return
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
      if (get().mode === "canvas") return
      const existing = get().originalImageList
      const uniqueImages = imageSrcs
        .map(normalizeImage)
        .filter((img) => !existing.some((i) => i.url === img.url))
      set((state) => ({
        originalImageList: [...state.originalImageList, ...uniqueImages],
      }))
    },

    removeImage: (imageSrc) => {
      if (get().mode === "canvas") return
      set((state) => {
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
            newCurrentImage = undefined
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

        return {
          originalImageList: updatedImageList,
          currentImage: newCurrentImage,
          signingImages: updatedSigningImages,
          signingAbortControllers: updatedSigningAbortControllers,
          signedUrlCache: updatedSignedUrlCache,
        }
      })
    },

    loadTemplate: (template) => {
      const stamp = `${Date.now()}`
      let counter = 0
      // Recursively assign fresh ids to root + nested children so saved
      // templates with nested layers re-hydrate with stable, unique ids.
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
          // enabled absent or true → visible; false → hidden
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
        // Recurse so the eye-icon on a nested child correctly toggles the
        // `enabled` flag on the matching tree node (otherwise the icon would
        // flip but the URL would keep emitting the child).
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
      // Recurse so a nested layer child can be removed by id without the
      // caller needing to know which parent it lives under.
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
      // Recurse so editing a nested child via the existing config sidebar
      // flow updates it in place. Children of the matched node are preserved.
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

    /**
     * Append a layer transformation as a nested child of the layer with id
     * `parentId`. Caller is responsible for verifying the parent is a layer
     * (`isLayerKey(parent.key)`) and within {@link MAX_LAYER_NEST_DEPTH}.
     * Returns the new child's id, mirroring `addTransformation`.
     */
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

    setMode: (mode, canvas) => {
      if (mode === "canvas") {
        const canvasImg: FileElement = {
          url: CANVAS_SOURCE_URL,
          metadata: { requireSignedUrl: false },
          imageDimensions: null,
        }
        set({
          mode: "canvas",
          canvas: canvas ?? null,
          originalImageList: [canvasImg],
          imageList: [canvasImg.url],
          currentImage: canvasImg.url,
        })
      } else {
        set({
          mode: "editing",
          canvas: null,
          originalImageList: [],
          imageList: [],
          currentImage: undefined,
        })
      }
    },

    setCanvas: (canvas) => {
      const state = get()
      if (state.mode !== "canvas") return
      set({
        canvas,
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
      })
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

const replaceImagePathPlaceholders = (
  transformations: IKTransformation[],
  imagePath: string,
): IKTransformation[] => {
  return transformations.map((transformation) => {
    const clonedTransformation = { ...transformation }

    if (
      typeof clonedTransformation.raw === "string" &&
      clonedTransformation.raw.includes("__IMAGE_PATH__")
    ) {
      clonedTransformation.raw = clonedTransformation.raw.replace(
        /__IMAGE_PATH__/g,
        imagePath,
      )
    }

    return clonedTransformation
  })
}

const calculateImageList = (
  imageList: FileElement[],
  transformations: Transformation[],
  visibleTransformations: Record<string, boolean>,
  showOriginal: boolean,
  signer: Signer | undefined,
  activeImageIndex: number,
  signedUrlCache: Record<string, string>,
  canvas: CanvasConfig | null,
) => {
  const userTransformations = transformations
    .filter((transformation) => visibleTransformations[transformation.id])
    .map((transformation) => convertTransformationToIK(transformation))

  // In canvas mode the source is a 1×1 transparent pixel; prepend a resize
  // step so the user sees a properly sized preview as the base for their
  // layer-only template. Skipped when `showOriginal` is true so the user can
  // still toggle to see the raw source.
  const canvasTransformation: IKTransformation | null =
    canvas && !showOriginal
      ? {
          width: canvas.width,
          height: canvas.height,
          cropMode: "pad_resize",
          ...(canvas.background ? { background: canvas.background } : {}),
        }
      : null

  const IKTransformations = canvasTransformation
    ? [canvasTransformation, ...userTransformations]
    : userTransformations

  const transformKey = showOriginal
    ? "original"
    : JSON.stringify(IKTransformations)

  const imgs: string[] = []
  const toSign: Array<{
    index: number
    request: SignerRequest
    cacheKey: string
  }> = []

  imageList.forEach((img, index) => {
    // Replace any __IMAGE_PATH__ placeholders with actual image path for this specific image
    const imagePath = extractImagePath(img.url)
    const transformationsForImage = showOriginal
      ? []
      : replaceImagePathPlaceholders(IKTransformations, imagePath)

    const req = {
      url: img.url,
      transformation: transformationsForImage,
      metadata: img.metadata,
    }

    if (req.transformation.length === 0) {
      imgs[index] = req.url
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
      return
    }

    imgs[index] = buildSrc({
      src: req.url,
      urlEndpoint: "does-not-matter",
      transformation: req.transformation,
    })
  })

  return { imgs, activeImageIndex, toSign, transformKey }
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

  const { imgs, activeImageIndex, toSign, transformKey } = calculateImageList(
    state.originalImageList,
    state.transformations,
    state.visibleTransformations,
    state.showOriginal,
    state.signer,
    currentIndex,
    state.signedUrlCache,
    state.canvas,
  )

  const transformationsChanged = transformKey !== state.currentTransformKey
  if (transformationsChanged) {
    Object.values(state.signingAbortControllers).forEach((c) => c.abort())
    useEditorStore.setState({ signingImages: {}, signingAbortControllers: {} })
  }

  useEditorStore.setState({
    imageList: imgs,
    currentImage: imgs[activeImageIndex],
    currentTransformKey: transformKey,
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
  (state) => state.canvas,
  () => {
    recomputeImages()
  },
)

export { useEditorStore }

/**
 * Replace the editor's current template with a record fetched from a
 * `TemplateStorageProvider`. Wraps `loadTemplate` + `hydrateTemplateMetadata`
 * so callers (templates dropdown, templates library, `initialTemplateId`
 * effect) don't have to repeat the two-step sequence.
 */
export function applyTemplateRecord(record: {
  id: string
  name: string
  isPrivate: boolean | null
  transformations: Omit<Transformation, "id">[]
  mode?: EditorMode
  canvas?: CanvasConfig | null
}) {
  const store = useEditorStore.getState()
  // Switch mode first so canvas-mode templates get their source pixel set up
  // before the preview pipeline runs against the loaded transformations.
  if (record.mode && record.mode !== store.mode) {
    store.setMode(record.mode, record.canvas ?? null)
  } else if (record.mode === "canvas") {
    // Same mode but canvas dims may differ; refresh.
    store.setMode("canvas", record.canvas ?? null)
  }
  store.loadTemplate(record.transformations)
  store.hydrateTemplateMetadata({
    templateId: record.id,
    templateName: record.name,
    templateIsPrivate: record.isPrivate,
  })
}
