import type { UniqueIdentifier } from "@dnd-kit/core"
import {
  buildSrc,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import {
  type TransformationField,
  transformationFormatters,
  transformationSchema,
} from "./schema"

export interface Transformation {
  id: string
  key: string
  name: string
  type: "transformation"
  value: IKTransformation
}

export interface SignerRequest {
  url: string
  transformation: IKTransformation[]
}

export type Signer = (items: SignerRequest[]) => Promise<string[]>

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

export interface EditorState {
  currentImage: string | undefined
  originalImageList: string[]
  imageList: string[]
  transformations: Transformation[]
  visibleTransformations: Record<string, boolean>
  showOriginal: boolean
  shouldSignUrls: boolean
  signer?: Signer
  isSigning: boolean
  _internalState: InternalState
}

export type EditorActions = {
  initialize: (initialData?: {
    imageList?: string[]
    shouldSignUrls?: boolean
    signer?: Signer
  }) => void
  setCurrentImage: (imageSrc: string | undefined) => void
  addImage: (imageSrc: string) => void
  addImages: (imageSrcs: string[]) => void
  removeImage: (imageSrc: string) => void
  setTransformations: (transformations: Omit<Transformation, "id">[]) => void
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

const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    currentImage: undefined,
    originalImageList: [],
    imageList: [],
    transformations: initialTransformations,
    visibleTransformations: initialVisibleTransformations,
    showOriginal: false,
    shouldSignUrls: false,
    signer: undefined,
    isSigning: false,
    _internalState: {
      sidebarState: "none",
      selectedTransformationKey: null,
      transformationToEdit: null,
    },

    initialize: (initialData) => {
      const updates: Partial<EditorState> = {}
      if (initialData?.imageList && initialData.imageList.length > 0) {
        updates.originalImageList = initialData.imageList
        updates.imageList = initialData.imageList
        updates.currentImage = initialData.imageList[0]
      }
      if (typeof initialData?.shouldSignUrls === "boolean") {
        updates.shouldSignUrls = initialData.shouldSignUrls
      }
      if (initialData?.signer) {
        updates.signer = initialData.signer
      }
      if (Object.keys(updates).length > 0) {
        set(updates as EditorState)
      }
    },

    // Actions
    setCurrentImage: (imageSrc) => {
      set({ currentImage: imageSrc })
    },

    addImage: (imageSrc) => {
      if (!get().originalImageList.includes(imageSrc)) {
        set((state) => ({
          originalImageList: [...state.originalImageList, imageSrc],
          currentImage: imageSrc,
        }))
      } else {
        set({ currentImage: imageSrc })
      }
    },

    addImages: (imageSrcs) => {
      const uniqueImages = imageSrcs.filter(
        (img) => !get().originalImageList.includes(img),
      )
      set((state) => ({
        originalImageList: [...state.originalImageList, ...uniqueImages],
      }))
    },

    removeImage: (imageSrc) => {
      set((state) => {
        // Remove the image from the list
        const updatedImageList = state.originalImageList.filter(
          (img) => img !== imageSrc,
        )

        // If the current image is being removed, set a new current image if available
        let newCurrentImage = state.currentImage
        if (state.currentImage === imageSrc && updatedImageList.length > 0) {
          newCurrentImage = updatedImageList[0]
        } else if (updatedImageList.length === 0) {
          newCurrentImage = undefined
        }

        return {
          originalImageList: updatedImageList,
          currentImage: newCurrentImage,
        }
      })
    },

    setTransformations: (transformations) => {
      const transformationsWithIds = transformations.map((transformation) => ({
        ...transformation,
        id: `transformation-${Date.now()}`,
      }))
      set({ transformations: transformationsWithIds })
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
          // Create a new array with the moved item
          const updatedTransformations = [...state.transformations]
          const [removed] = updatedTransformations.splice(oldIndex, 1)
          updatedTransformations.splice(newIndex, 0, removed)

          return { transformations: updatedTransformations }
        }
        return { transformations: state.transformations }
      })
    },

    toggleTransformationVisibility: (id) => {
      set((state) => ({
        visibleTransformations: {
          ...state.visibleTransformations,
          [id]: !state.visibleTransformations[id],
        },
      }))
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
        }
      })

      return id
    },

    removeTransformation: (id) => {
      set((state) => ({
        transformations: state.transformations.filter(
          (transformation) => transformation.id !== id,
        ),
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
      }))
    },

    setShowOriginal: (showOriginal) => {
      set(() => ({
        showOriginal,
      }))
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

const calculateImageList = async (
  imageList: string[],
  transformations: Transformation[],
  visibleTransformations: Record<string, boolean>,
  showOriginal: boolean,
  shouldSignUrls: boolean,
  signer?: Signer,
) => {
  let activeImageIndex = 0
  const current = useEditorStore.getState().currentImage

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

      return {
        ...t?.defaultTransformation,
        ...transforms,
      }
    })

  const requests: SignerRequest[] = imageList.map((img) => {
    if (img === current) {
      activeImageIndex = imageList.indexOf(img)
    }

    return {
      url: img,
      transformation: showOriginal ? [] : IKTransformations,
    }
  })

  let imgs: string[]

  if (shouldSignUrls && signer) {
    imgs = await signer(requests)
  } else {
    imgs = requests.map((req) => {
      if (req.transformation.length === 0) {
        return req.url
      }
      return buildSrc({
        src: req.url,
        urlEndpoint: "does-not-matter",
        transformation: req.transformation,
      })
    })
  }

  return { imgs, activeImageIndex }
}

async function recomputeImages() {
  const state = useEditorStore.getState()
  if (state.shouldSignUrls && state.signer) {
    useEditorStore.setState({ isSigning: true })
  }
  const { imgs, activeImageIndex } = await calculateImageList(
    state.originalImageList,
    state.transformations,
    state.visibleTransformations,
    state.showOriginal,
    state.shouldSignUrls,
    state.signer,
  )

  useEditorStore.setState({
    imageList: imgs,
    currentImage: imgs[activeImageIndex],
    isSigning: false,
  })
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
  (state) => state.shouldSignUrls,
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
