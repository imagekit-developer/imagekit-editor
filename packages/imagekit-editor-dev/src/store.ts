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

interface InternalState {
  sidebarState: "none" | "type" | "config"
  selectedTransformationKey: string | null
  transformationToEdit: {
    transformationId: string
    position: "inplace" | "above" | "below"
  } | null
}

export interface EditorState {
  currentImage: string | undefined
  originalImageList: string[]
  imageList: string[]
  transformations: Transformation[]
  visibleTransformations: Record<string, boolean>
  _internalState: InternalState
}

export type EditorActions = {
  initialize: (initialData?: { imageList?: string[] }) => void
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
  addTransformation: (transformation: Omit<Transformation, "id">) => string
  removeTransformation: (id: string) => void
  updateTransformation: (
    id: string,
    updatedTransformation: Omit<Transformation, "id">,
  ) => void

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
    _internalState: {
      sidebarState: "none",
      selectedTransformationKey: null,
      transformationToEdit: null,
    },

    initialize: (initialData) => {
      console.log("initialTransformations", initialTransformations)
      if (initialData?.imageList && initialData.imageList.length > 0) {
        set({
          originalImageList: initialData.imageList,
          imageList: initialData.imageList,
          currentImage: initialData.imageList[0],
        })
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

    addTransformation: (transformation) => {
      const id = `transformation-${Date.now()}`

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

    _setTransformationToEdit: (transformationId, position = "inplace") => {
      if (!transformationId) {
        set((state) => ({
          _internalState: {
            ...state._internalState,
            transformationToEdit: null,
          },
        }))
      } else {
        set((state) => ({
          _internalState: {
            ...state._internalState,
            transformationToEdit: { transformationId, position },
          },
        }))
      }
    },
  })),
)

const calculateImageList = (
  imageList: string[],
  transformations: Transformation[],
  visibleTransformations: Record<string, boolean>,
) => {
  let activeImageIndex = 0
  const imgs = imageList.map((img) => {
    if (img === useEditorStore.getState().currentImage) {
      activeImageIndex = imageList.indexOf(img)
    }

    const IKTransformations = transformations
      .filter((transformation) => visibleTransformations[transformation.id])
      .map((transformation) => {
        const t = transformationSchema
          .find((schema) => schema.key === transformation.key.split("-")[0])
          ?.items.find((item) => item.key === transformation.key)

        // Process grouped transformations
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

        console.log(t?.transformations)

        // Collect all fields that are part of transformation groups
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

        console.log("groupedTransforms", groupedTransforms)

        // Process regular (non-grouped) transformations
        const transforms: Record<string, unknown> = Object.fromEntries(
          Object.entries(transformation.value)
            .map(([key, value]) => {
              const transform = t?.transformations.find(
                (field) => field.name === key,
              )

              // Skip fields that are part of a transformation group
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

          // If a formatter is provided, use it
          if (formatter) {
            const groupValues = {} as Record<string, unknown>
            group.fields.forEach((f) => {
              groupValues[f.name] = f.value
            })

            formatter(groupValues, transforms)
          }
        }

        console.log("transforms", transforms)

        return {
          ...t?.defaultTransformation,
          ...transforms,
        }
      })

    return buildSrc({
      src: img,
      urlEndpoint: "does-not-matter",
      transformation: IKTransformations,
    })
  })

  return { imgs, activeImageIndex }
}

useEditorStore.subscribe(
  (state) => state.transformations,
  (transformations) => {
    const { imgs, activeImageIndex } = calculateImageList(
      useEditorStore.getState().originalImageList,
      transformations,
      useEditorStore.getState().visibleTransformations,
    )

    useEditorStore.setState({
      imageList: imgs,
      currentImage: imgs[activeImageIndex],
    })
  },
)

useEditorStore.subscribe(
  (state) => state.visibleTransformations,
  (visibleTransformations) => {
    const { imgs, activeImageIndex } = calculateImageList(
      useEditorStore.getState().originalImageList,
      useEditorStore.getState().transformations,
      visibleTransformations,
    )

    useEditorStore.setState({
      imageList: imgs,
      currentImage: imgs[activeImageIndex],
    })
  },
)

useEditorStore.subscribe(
  (state) => state.originalImageList,
  (originalImageList) => {
    const { imgs, activeImageIndex } = calculateImageList(
      originalImageList,
      useEditorStore.getState().transformations,
      useEditorStore.getState().visibleTransformations,
    )

    useEditorStore.setState({
      imageList: imgs,
      currentImage: imgs[activeImageIndex],
    })
  },
)

export { useEditorStore }
