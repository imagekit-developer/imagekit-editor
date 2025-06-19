import type { ImageKitOptions } from "imagekit-javascript/dist/src/interfaces"
import React from "react"

export interface ImageKitEditorProps {
  ikClientOptions: ImageKitOptions
  portalContainerRef?: React.RefObject<HTMLDivElement | null>
  imageUrl: string
  onClose(): void
  exportActions: Array<{
    label: string
    onClick(url: string): void
  }>
}

export default (props: ImageKitEditorProps) => {
  const { imageUrl } = props

  if (!imageUrl) {
    throw new Error("`imageUrl` is required for the image that will be edited")
  }

  return <React.StrictMode></React.StrictMode>
}
