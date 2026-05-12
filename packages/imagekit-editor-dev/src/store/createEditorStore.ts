import type { StoreApi, UseBoundStore } from "zustand"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { DEFAULT_STATE } from "./initialState"
import { calculateImageList } from "./pure/calculateImageList"
import { createImagesSlice } from "./slices/imagesSlice"
import { createLifecycleSlice } from "./slices/lifecycleSlice"
import { createSidebarSlice } from "./slices/sidebarSlice"
import { createSyncSlice } from "./slices/syncSlice"
import { createTemplateSlice } from "./slices/templateSlice"
import { createTransformationsSlice } from "./slices/transformationsSlice"
import type { EditorStore } from "./types"

export function createEditorStore(): UseBoundStore<StoreApi<EditorStore>> {
  const useEditorStore = create<EditorStore>()(
    subscribeWithSelector((set, get, store) => ({
      ...DEFAULT_STATE,
      ...createLifecycleSlice(set, get, store),
      ...createImagesSlice(set, get, store),
      ...createTransformationsSlice(set, get, store),
      ...createTemplateSlice(set, get, store),
      ...createSyncSlice(set, get, store),
      ...createSidebarSlice(set, get, store),
    })),
  )

  /**
   * Recomputes the image list based on the current state of the store.
   * This is used to ensure that the image list is always up to date based
   * on the current state of the store.
   */
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
      useEditorStore.setState({
        signingImages: {},
        signingAbortControllers: {},
      })
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

  return useEditorStore
}

export const useEditorStore = createEditorStore()
