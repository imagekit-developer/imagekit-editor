import type { UniqueIdentifier } from "@dnd-kit/core"
import {
  buildSrc,
  buildTransformationString,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import {
  type DEFAULT_FOCUS_OBJECTS,
  getDefaultTransformationFromMode,
  type TransformationField,
  transformationFormatters,
  transformationSchema,
} from "./schema"
import { bumpLocalChangeVersion as bumpVersion } from "./sync/templateSyncVersioning"
import { extractImagePath } from "./utils"

export const TRANSFORMATION_STATE_VERSION = "v1" as const

export interface OutputDimensions {
  width: number
  height: number
}

export type OnPickImage = () => Promise<string | null | undefined>

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
  signingImages: {},
  signingAbortControllers: {},
  signedUrlCache: {},
  currentTransformKey: "",
  focusObjects: undefined,
  _internalState: {
    sidebarState: "none",
    selectedTransformationKey: null,
    transformationToEdit: null,
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
}

const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    initialize: (initialData) => {
      const updates: Partial<EditorState> = {}
      if (initialData?.imageList && initialData.imageList.length > 0) {
        const imgs = initialData.imageList.map(normalizeImage)
        updates.originalImageList = imgs
        updates.imageList = imgs.map((i) => i.url)
        updates.currentImage = imgs[0].url
      }
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
      const transformationsWithIds = template.map((transformation, index) => ({
        ...transformation,
        id: `transformation-${Date.now()}-${index}`,
        version: TRANSFORMATION_STATE_VERSION,
      }))

      const visibleTransformations: Record<string, boolean> = {}
      transformationsWithIds.forEach((t) => {
        // enabled absent or true → visible; false → hidden
        visibleTransformations[t.id] = t.enabled !== false
      })

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
        return {
          visibleTransformations: {
            ...state.visibleTransformations,
            [id]: newVisible,
          },
          // Sync enabled into the transformations array so the auto-save
          // subscription (which watches `transformations`) fires, and so the
          // visibility state is persisted alongside the transformation data.
          transformations: state.transformations.map((t) =>
            t.id === id ? { ...t, enabled: newVisible } : t,
          ),
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
      set((state) => ({
        transformations: state.transformations.filter(
          (transformation) => transformation.id !== id,
        ),
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
      }))
    },

    updateTransformation: (
      id: string,
      updatedTransformation: Transformation,
    ) => {
      set((state) => ({
        transformations: state.transformations.map((t) =>
          t.id === id ? { ...updatedTransformation, id } : t,
        ),
        isPristine: false,
        localChangeVersion: bumpVersion(state.localChangeVersion),
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
        _internalState: {
          sidebarState: "none",
          selectedTransformationKey: null,
          transformationToEdit: null,
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
      transformationOrTargetId: string,
      position = "inplace",
    ) => {
      if (!transformationOrTargetId) {
        set((state) => ({
          _internalState: {
            ...state._internalState,
            transformationToEdit: null,
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
) => {
  const IKTransformations = transformations
    .filter((transformation) => visibleTransformations[transformation.id])
    .map((transformation) => {
      const t = transformationSchema
        .find((schema) => schema.key === transformation.key.split("-")[0])
        ?.items.find((item) => item.key === transformation.key)

      const groupedTransforms: Record<
        string,
        {
          fields: Array<{
            name: string
            value: unknown
            field: TransformationField
          }>
          transformationKey: string
        }
      > = {}

      if (t?.transformations) {
        t.transformations.forEach((transform) => {
          if (
            transform.transformationGroup &&
            transform.isVisible?.(
              transformation.value as Record<string, unknown>,
            ) !== false
          ) {
            const value = (transformation.value as Record<string, unknown>)[
              transform.name
            ]
            if (value !== undefined && value !== "") {
              if (!groupedTransforms[transform.transformationGroup]) {
                groupedTransforms[transform.transformationGroup] = {
                  fields: [],
                  transformationKey:
                    transform.transformationKey || transform.name,
                }
              }
              groupedTransforms[transform.transformationGroup].fields.push({
                name: transform.name,
                value,
                field: transform,
              })
            }
          }
        })
      }

      const transforms: Record<string, unknown> = Object.fromEntries(
        Object.entries(transformation.value)
          .map(([key, value]) => {
            const transform = t?.transformations.find(
              (field) => field.name === key,
            )

            if (transform?.transformationGroup) {
              return []
            }

            if (
              transform?.isTransformation &&
              (transform.isVisible?.(
                transformation.value as Record<string, unknown>,
              ) ??
                true) &&
              value !== ""
            ) {
              return [transform.transformationKey ?? key, value]
            }
            return []
          })
          .filter((entry) => entry.length > 0),
      )

      for (const groupName in groupedTransforms) {
        const group = groupedTransforms[groupName]
        const formatter = transformationFormatters[groupName]

        if (formatter) {
          const groupValues = {} as Record<string, unknown>
          group.fields.forEach((f) => {
            groupValues[f.name] = f.value
          })

          formatter(groupValues, transforms)
        }
      }

      // Special handling for resize_and_crop transformation
      let defaultTransformation = t?.defaultTransformation || {}
      if (transformation.key === "resize_and_crop-resize_and_crop") {
        const value = transformation.value as Record<string, unknown>
        // Only add crop/cropMode when both width and height and mode are set
        if (value.width && value.height && value.mode) {
          defaultTransformation = getDefaultTransformationFromMode(
            value.mode as string,
          )
        } else {
          defaultTransformation = {}
        }
      }

      return {
        ...defaultTransformation,
        ...transforms,
      }
    })

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

export { useEditorStore }
