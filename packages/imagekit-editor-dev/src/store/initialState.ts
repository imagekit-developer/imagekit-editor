import type { EditorState, Transformation } from "./types"

const initialTransformations: Transformation[] = []

const initialVisibleTransformations: Record<string, boolean> = {}

function initTransformationStates(transformations: Transformation[]) {
  transformations.forEach((transformation) => {
    initialVisibleTransformations[transformation.id] = true
  })
}

initTransformationStates(initialTransformations)

/** Default editor store snapshot used on boot and `destroy()`. */
export const DEFAULT_STATE: EditorState = {
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
