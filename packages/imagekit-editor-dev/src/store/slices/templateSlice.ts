import type { StateCreator } from "zustand"
import { bumpLocalChangeVersion as bumpVersion } from "../../sync/templateSyncVersioning"
import type { EditorStore } from "../types"

export const createTemplateSlice: StateCreator<
  EditorStore,
  [["zustand/subscribeWithSelector", never]],
  [],
  Pick<
    EditorStore,
    | "setTemplateName"
    | "setTemplateId"
    | "setTemplateIsPrivate"
    | "hydrateTemplateMetadata"
    | "resetToNewTemplate"
    | "restoreSession"
    | "blockTemplateStorageWrites"
    | "denyTemplateStorageAccessAndReset"
  >
> = (set) => ({
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

  restoreSession: (persisted) => {
    set(() => ({
      transformations: persisted.transformations,
      visibleTransformations: persisted.visibleTransformations,
      templateName: persisted.templateName,
      templateId: persisted.templateId,
      templateIsPrivate: persisted.templateIsPrivate,
      syncStatus: persisted.syncStatus,
      isPristine: persisted.isPristine,
      localChangeVersion: persisted.localChangeVersion,
      lastSyncedVersion: persisted.lastSyncedVersion,
      lastSavedAt: persisted.lastSavedAt,
      storageError: undefined,
      templateStorageWriteBlocked: false,
      transformationConfigFormDirty: false,
      _internalState: {
        sidebarState: "none",
        selectedTransformationKey: null,
        transformationToEdit: null,
      },
    }))
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
})
