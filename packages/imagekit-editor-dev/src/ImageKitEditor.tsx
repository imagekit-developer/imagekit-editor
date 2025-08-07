import { ChakraProvider, theme as defaultTheme } from "@chakra-ui/react"
import type { Dict } from "@chakra-ui/utils"
import merge from "lodash/merge"
import React, { forwardRef, useImperativeHandle } from "react"
import { EditorLayout, EditorWrapper } from "./components/editor"
import { type FileElement, type Signer, useEditorStore } from "./store"
import { themeOverrides } from "./theme"

export interface ImageKitEditorRef {
  loadImage: (image: string | FileElement) => void
  loadImages: (images: Array<string | FileElement>) => void
  setCurrentImage: (imageSrc: string) => void
}

interface EditorProps<
  Metadata extends Record<string, unknown> = Record<string, unknown>,
> {
  theme?: Dict
  initialImages?: Array<string | FileElement<Metadata>>
  signer?: Signer<Metadata>
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
    const { theme, initialImages, signer } = props
    const { addImage, addImages, setCurrentImage, initialize } =
      useEditorStore()

    React.useEffect(() => {
      if (
        initialImages?.some(
          (img) => typeof img !== "string" && img.metadata.requireSignedUrl,
        ) &&
        !signer
      ) {
        console.warn(
          "ImageKitEditor: Some images require signed URL but no signer function is provided",
        )
      }

      initialize({
        imageList: initialImages,
        signer,
      })
    }, [initialImages, signer, initialize])

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
