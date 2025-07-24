import { ChakraProvider, theme as defaultTheme } from "@chakra-ui/react"
import type { Dict } from "@chakra-ui/utils"
import merge from "lodash/merge"
import React, { forwardRef, useImperativeHandle } from "react"
import { EditorLayout, EditorWrapper } from "./components/editor"
import { useEditorStore } from "./store"
import { themeOverrides } from "./theme"

export interface ImageKitEditorRef {
  loadImage: (imageSrc: string) => void
  loadImages: (imageSrcs: string[]) => void
  setCurrentImage: (imageSrc: string) => void
}

interface EditorProps {
  theme?: Dict
  initialImages?: string[]
  onAddImage?: () => void
  exportOptions?:
    | {
        label: string
        icon?: React.ReactElement
        onClick: (images: string[]) => void
      }
    | {
        label: string
        icon?: React.ReactElement
        options: Array<{
          label: string
          isVisible: boolean | ((images: string[]) => boolean)
          onClick: (images: string[]) => void
        }>
      }

  onClose: () => void
}

export const ImageKitEditor = forwardRef<ImageKitEditorRef, EditorProps>(
  (props, ref) => {
    const { theme, initialImages } = props
    const { addImage, addImages, setCurrentImage, initialize } =
      useEditorStore()

    React.useEffect(() => {
      if (initialImages && initialImages.length > 0) {
        initialize({ imageList: initialImages })
      }
    }, [initialImages, initialize])

    useImperativeHandle(
      ref,
      () => ({
        loadImage: addImage,
        loadImages: addImages,
        setCurrentImage,
      }),
      [addImage, addImages, setCurrentImage],
    )

    const mergedThemes = merge(defaultTheme, themeOverrides, theme)

    return (
      <React.StrictMode>
        <ChakraProvider cssVarsRoot="#ik-editor" theme={mergedThemes} resetCSS>
          <EditorWrapper>
            <EditorLayout
              onAddImage={props.onAddImage}
              onClose={props.onClose}
              exportOptions={props.exportOptions}
            />
          </EditorWrapper>
        </ChakraProvider>
      </React.StrictMode>
    )
  },
)

export type { EditorProps as ImageKitEditorProps }
