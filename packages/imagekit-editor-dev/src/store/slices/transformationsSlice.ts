import type { StateCreator } from "zustand"
import { bumpLocalChangeVersion as bumpVersion } from "../../sync/templateSyncVersioning"
import {
  type EditorStore,
  TRANSFORMATION_STATE_VERSION,
  type Transformation,
} from "../types"

export const createTransformationsSlice: StateCreator<
  EditorStore,
  [["zustand/subscribeWithSelector", never]],
  [],
  Pick<
    EditorStore,
    | "loadTemplate"
    | "moveTransformation"
    | "toggleTransformationVisibility"
    | "addTransformation"
    | "removeTransformation"
    | "updateTransformation"
    | "setShowOriginal"
  >
> = (set) => ({
  loadTemplate: (template) => {
    const transformationsWithIds = template.map((transformation, index) => ({
      ...transformation,
      id: `transformation-${Date.now()}-${index}`,
      version: TRANSFORMATION_STATE_VERSION,
    }))

    const visibleTransformations: Record<string, boolean> = {}
    transformationsWithIds.forEach((t) => {
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
        transformations: [...state.transformations, { ...transformation, id }],
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

  updateTransformation: (id: string, updatedTransformation: Transformation) => {
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
})
