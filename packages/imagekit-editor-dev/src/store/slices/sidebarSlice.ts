import type { StateCreator } from "zustand"
import type { EditorStore } from "../types"

export const createSidebarSlice: StateCreator<
  EditorStore,
  [["zustand/subscribeWithSelector", never]],
  [],
  Pick<
    EditorStore,
    | "_setSidebarState"
    | "_setSelectedTransformationKey"
    | "_setTransformationToEdit"
  >
> = (set) => ({
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
})
