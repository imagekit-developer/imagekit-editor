import type { StateCreator } from "zustand"
import { DEFAULT_STATE } from "../initialState"
import { normalizeImage } from "../pure/normalizeImage"
import type { EditorState, EditorStore } from "../types"

export const createLifecycleSlice: StateCreator<
  EditorStore,
  [["zustand/subscribeWithSelector", never]],
  [],
  Pick<EditorStore, "initialize" | "destroy">
> = (set) => ({
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
})
