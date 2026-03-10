import { ChakraProvider, theme as defaultTheme } from "@chakra-ui/react"
import type { Dict } from "@chakra-ui/utils"
import merge from "lodash/merge"
import React, { forwardRef, useImperativeHandle } from "react"
import { EditorLayout, EditorWrapper } from "./components/editor"
import type { HeaderProps } from "./components/header"
import {
  type FocusObjects,
  type InputFileElement,
  type RequiredMetadata,
  type Signer,
  type Transformation,
  useEditorStore,
} from "./store"
import { themeOverrides } from "./theme"

export interface ImageKitEditorRef {
  /**
   * Loads a single image into the editor
   * @param image - Image URL string or FileElement with metadata
   */
  loadImage: (image: string | InputFileElement) => void
  
  /**
   * Loads multiple images into the editor
   * @param images - Array of image URL strings or FileElements with metadata
   */
  loadImages: (images: Array<string | InputFileElement>) => void
  
  /**
   * Switches the current active image
   * @param imageSrc - URL of the image to set as current
   */
  setCurrentImage: (imageSrc: string) => void
  
  /**
   * Gets the current editor template (transformation stack)
   * @returns Array of transformation objects representing the template
   * @example
   * ```tsx
   * const template = editorRef.current?.getTemplate()
   * // Save to localStorage or backend
   * localStorage.setItem('editorTemplate', JSON.stringify(
   *   template.map(({ id, ...rest }) => rest)
   * ))
   * ```
   */
  getTemplate: () => Transformation[]
  
  /**
   * Loads a template (transformation stack) into the editor
   * @param template - Array of transformation objects without the 'id' field
   * @example
   * ```tsx
   * const saved = JSON.parse(localStorage.getItem('editorTemplate'))
   * editorRef.current?.loadTemplate(saved)
   * ```
   */
  loadTemplate: (template: Omit<Transformation, "id">[]) => void
}

interface EditorProps<Metadata extends RequiredMetadata = RequiredMetadata> {
  theme?: Dict
  initialImages?: Array<string | InputFileElement<Metadata>>
  signer?: Signer<Metadata>
  onAddImage?: () => void
  exportOptions?: HeaderProps<Metadata>["exportOptions"]
  focusObjects?: ReadonlyArray<FocusObjects>
  onClose: (args: { dirty: boolean; destroy: () => void }) => void
}

function ImageKitEditorImpl<M extends RequiredMetadata>(
  props: EditorProps<M>,
  ref: React.Ref<ImageKitEditorRef>,
) {
  const { theme, initialImages, signer, focusObjects } = props
  const {
    addImage,
    addImages,
    setCurrentImage,
    transformations,
    initialize,
    destroy,
    loadTemplate,
  } = useEditorStore()

  const handleOnClose = () => {
    const dirty = transformations.length > 0
    props.onClose({ dirty, destroy })
  }

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
      focusObjects,
    })
  }, [initialImages, signer, focusObjects, initialize])

  useImperativeHandle(
    ref,
    () => ({
      loadImage: addImage,
      loadImages: addImages,
      setCurrentImage,
      getTemplate: () => transformations,
      loadTemplate,
    }),
    [addImage, addImages, setCurrentImage, transformations, loadTemplate],
  )

  const mergedThemes = merge(defaultTheme, themeOverrides, theme)

  return (
    <React.StrictMode>
      <ChakraProvider cssVarsRoot="#ik-editor" theme={mergedThemes} resetCSS>
        <EditorWrapper>
          <EditorLayout
            onAddImage={props.onAddImage}
            onClose={handleOnClose}
            exportOptions={props.exportOptions}
          />
        </EditorWrapper>
      </ChakraProvider>
    </React.StrictMode>
  )
}

type ImageKitEditorComponent = <M extends RequiredMetadata = RequiredMetadata>(
  props: EditorProps<M> & React.RefAttributes<ImageKitEditorRef>,
) => React.ReactElement | null

export const ImageKitEditor = forwardRef(
  ImageKitEditorImpl,
) as ImageKitEditorComponent

export type { EditorProps as ImageKitEditorProps }
