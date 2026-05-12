import type { StateCreator } from "zustand"
import { normalizeImage } from "../pure/normalizeImage"
import type { EditorStore } from "../types"

export const createImagesSlice: StateCreator<
  EditorStore,
  [["zustand/subscribeWithSelector", never]],
  [],
  Pick<
    EditorStore,
    | "setCurrentImage"
    | "setImageDimensions"
    | "addImage"
    | "addImages"
    | "removeImage"
  >
> = (set, get) => ({
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
      const updatedImageList = state.originalImageList.filter(
        (img) => img.url !== imageSrc,
      )

      let newCurrentImage = state.currentImage
      if (state.currentImage === imageSrc) {
        if (updatedImageList.length > 0) {
          if (index >= updatedImageList.length) {
            newCurrentImage = updatedImageList[updatedImageList.length - 1].url
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
})
