import type { StateCreator } from "zustand"
import { bumpLocalChangeVersion as bumpVersion } from "../../sync/templateSyncVersioning"
import type { EditorStore } from "../types"

export const createSyncSlice: StateCreator<
  EditorStore,
  [["zustand/subscribeWithSelector", never]],
  [],
  Pick<
    EditorStore,
    | "setSyncStatus"
    | "bumpLocalChangeVersion"
    | "markSynced"
    | "setLastSavedAt"
    | "setTransformationConfigFormDirty"
    | "setIsPristine"
  >
> = (set) => ({
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
})
