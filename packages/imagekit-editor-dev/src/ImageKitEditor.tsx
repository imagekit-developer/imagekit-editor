import { ChakraProvider, theme as defaultTheme } from "@chakra-ui/react"
import type { Dict } from "@chakra-ui/utils"
import merge from "lodash/merge"
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"
import { EditorLayout, EditorWrapper } from "./components/editor"
import type { HeaderProps } from "./components/header"
import type { GetTemplatePermissions } from "./context/TemplatePermissionsContext"
import { TemplatePermissionsContextProvider } from "./context/TemplatePermissionsContext"
import { TemplateStorageContextProvider } from "./context/TemplateStorageContext"
import {
  type DynamicVariableDefinition,
  isTemplateAccessDeniedError,
  type TemplateStorageProvider,
  type VariableAssetResolver,
} from "./storage"
import {
  type FocusObjects,
  type InputFileElement,
  type RequiredMetadata,
  type Signer,
  type Transformation,
  useEditorStore,
} from "./store"
import { themeOverrides } from "./theme"
import { buildUrlTemplate } from "./utils/buildUrlTemplate"

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
   * Gets the current editor template including transformations and variables.
   * @returns Object with transformations and variables
   * @example
   * ```tsx
   * const { transformations, variables } = editorRef.current?.getTemplate()
   * // Save to localStorage or backend
   * localStorage.setItem('editorTemplate', JSON.stringify({ transformations, variables }))
   * ```
   */
  getTemplate: () => {
    transformations: Transformation[]
    variables: DynamicVariableDefinition[]
    /**
     * URL transformation string with `{{variableName}}` placeholders.
     * Empty string when no transformations are active.
     */
    urlTemplate: string
  }

  /**
   * Loads a template (transformations + variables) into the editor.
   * Accepts either a full payload or a legacy transformations-only array.
   * @example
   * ```tsx
   * // Full payload (recommended)
   * editorRef.current?.loadTemplate({ transformations, variables })
   *
   * // Legacy: transformations-only array
   * editorRef.current?.loadTemplate(savedTransformations)
   * ```
   */
  loadTemplate: (
    template:
      | Omit<Transformation, "id">[]
      | {
          transformations: Omit<Transformation, "id">[]
          variables?: DynamicVariableDefinition[]
        },
  ) => void

  /**
   * Explicitly saves the current template to the configured storage provider.
   * No-op if no storage provider is configured.
   */
  saveTemplate: () => Promise<void>
}

interface EditorProps<Metadata extends RequiredMetadata = RequiredMetadata> {
  theme?: Dict
  initialImages?: Array<string | InputFileElement<Metadata>>
  signer?: Signer<Metadata>
  onAddImage?: () => void
  exportOptions?: HeaderProps<Metadata>["exportOptions"]
  focusObjects?: ReadonlyArray<FocusObjects>
  onClose: (args: { dirty: boolean; destroy: () => void }) => void
  /**
   * Template persistence (list/save/delete/pin). Implemented by the host app —
   * the editor does not perform media library or other remote API calls itself.
   * Omit or pass `null` to disable template sync UI.
   */
  templateStorage?: TemplateStorageProvider | null
  variableAssetResolver?: VariableAssetResolver
  /**
   * Custom metadata field definitions from the host app (matches the shape of
   * the ImageKit Get Custom Metadata Fields API response). When provided, the
   * Variables modal renders typed form fields for each definition instead of
   * falling back to free-form key-value pairs.
   */
  customMetadataFields?: import("./variables/types").CustomMetadataFieldDefinition[]
  /**
   * Host-controlled, per-template permissions for template management UI.
   * If omitted, the editor defaults to allowing all actions.
   */
  getTemplatePermissions?: GetTemplatePermissions
  /**
   * Called whenever dynamic variables change (add, update, remove).
   * Use this to persist variables to your backend or localStorage.
   */
  onVariablesChange?: (variables: DynamicVariableDefinition[]) => void
  /**
   * Called when the user clicks "Bulk Generate" on a template row.
   * The host app handles CSV upload and batch URL generation.
   */
  onBulkGenerate?: (template: { id: string; name: string }) => void
  /**
   * When provided, the editor fetches this template from `templateStorage`
   * on mount and loads its transformations and variables.
   */
  templateId?: string
}

function ImageKitEditorImpl<M extends RequiredMetadata>(
  props: EditorProps<M>,
  ref: React.Ref<ImageKitEditorRef>,
) {
  const {
    theme,
    initialImages,
    signer,
    focusObjects,
    templateStorage,
    variableAssetResolver,
    customMetadataFields,
    getTemplatePermissions,
  } = props
  const {
    addImage,
    addImages,
    setCurrentImage,
    initialize,
    destroy,
    loadTemplate,
    loadTemplatePayload,
  } = useEditorStore()

  const resolvedProvider = useMemo<TemplateStorageProvider | null>(
    () => templateStorage ?? null,
    [templateStorage],
  )

  const saveTemplateImperative = useCallback(async () => {
    // Avoid importing hooks here; implement via store+provider with version gating.
    if (!resolvedProvider) return
    const state = useEditorStore.getState()
    if (state.templateStorageWriteBlocked) return

    const saveStartedAtVersion = state.localChangeVersion
    state.setSyncStatus("saving")
    try {
      const saved = await resolvedProvider.saveTemplate({
        id: state.templateId ?? undefined,
        name: state.templateName,
        transformations: state.transformations.map(
          ({ id: _id, ...rest }) => rest,
        ),
        variables: state.dynamicVariables,
        urlTemplate: buildUrlTemplate(
          state.transformations,
          state.visibleTransformations,
          state.dynamicVariables,
        ),
        ...(state.templateIsPrivate !== null
          ? { isPrivate: state.templateIsPrivate }
          : {}),
      })
      const after = useEditorStore.getState()
      after.hydrateTemplateMetadata({
        templateId: saved.id,
        templateName: saved.name,
        templateIsPrivate:
          typeof saved.isPrivate === "boolean" ? saved.isPrivate : null,
      })
      if (after.localChangeVersion === saveStartedAtVersion) {
        after.markSynced(saveStartedAtVersion)
        after.setSyncStatus("saved")
      } else {
        after.setSyncStatus("unsaved")
      }
      after.setLastSavedAt(Date.now())
    } catch (err) {
      if (isTemplateAccessDeniedError(err)) {
        useEditorStore
          .getState()
          .blockTemplateStorageWrites(
            err instanceof Error
              ? err.message
              : "You no longer have access to this template.",
          )
        return
      }
      state.setSyncStatus(
        "error",
        err instanceof Error ? err.message : "Failed to save template",
      )
    }
  }, [resolvedProvider])

  const handleOnClose = () => {
    // `dirty` should represent *unsynced* changes (host uses it to decide
    // whether to show a close confirmation).
    const state = useEditorStore.getState()
    const dirty =
      state.transformationConfigFormDirty ||
      (resolvedProvider
        ? state.localChangeVersion !== state.lastSyncedVersion
        : !state.isPristine)
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
      variableAssetResolver,
      customMetadataFields,
      onBulkGenerate: props.onBulkGenerate,
      onAddImage: props.onAddImage,
    })
    // Trigger onAddImage if initial image list is empty
    if (!initialImages || initialImages.length === 0) {
      props.onAddImage?.()
    }
  }, [
    initialImages,
    signer,
    focusObjects,
    variableAssetResolver,
    customMetadataFields,
    initialize,
  ])

  // Keep onBulkGenerate in sync with latest prop value
  useEffect(() => {
    useEditorStore.setState({ onBulkGenerate: props.onBulkGenerate })
  }, [props.onBulkGenerate])

  // Keep onAddImage in sync with latest prop value
  useEffect(() => {
    useEditorStore.setState({ onAddImage: props.onAddImage })
  }, [props.onAddImage])

  // Trigger onAddImage when image list becomes empty
  useEffect(() => {
    return useEditorStore.subscribe(
      (state) => state.originalImageList.length,
      (count, prevCount) => {
        // Trigger when transitioning to empty (0 images) and not on initial mount (prevCount > 0)
        if (count === 0 && prevCount > 0) {
          useEditorStore.getState().onAddImage?.()
        }
      },
    )
  }, [])

  // Load template by ID from storage on mount
  const templateIdProp = props.templateId
  const hasLoadedTemplateRef = useRef(false)
  useEffect(() => {
    if (!templateIdProp || !resolvedProvider || hasLoadedTemplateRef.current)
      return
    hasLoadedTemplateRef.current = true
    resolvedProvider.getTemplate(templateIdProp).then((record) => {
      if (!record) return
      loadTemplatePayload({
        transformations: record.transformations,
        variables: record.variables,
      })
      useEditorStore.getState().hydrateTemplateMetadata({
        templateId: record.id,
        templateName: record.name,
        templateIsPrivate: record.isPrivate,
      })
    })
  }, [templateIdProp, resolvedProvider, loadTemplatePayload])

  // Fire onVariablesChange callback when dynamic variables change
  const onVariablesChangeRef = useRef(props.onVariablesChange)
  onVariablesChangeRef.current = props.onVariablesChange
  useEffect(() => {
    return useEditorStore.subscribe(
      (state) => state.dynamicVariables,
      (variables) => {
        onVariablesChangeRef.current?.(variables)
      },
    )
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      loadImage: addImage,
      loadImages: addImages,
      setCurrentImage,
      getTemplate: () => {
        const state = useEditorStore.getState()
        return {
          transformations: state.transformations,
          variables: state.dynamicVariables,
          urlTemplate: buildUrlTemplate(
            state.transformations,
            state.visibleTransformations,
            state.dynamicVariables,
          ),
        }
      },
      loadTemplate: (
        template:
          | Omit<Transformation, "id">[]
          | {
              transformations: Omit<Transformation, "id">[]
              variables?: DynamicVariableDefinition[]
            },
      ) => {
        if (Array.isArray(template)) {
          loadTemplate(template)
        } else {
          loadTemplatePayload(template)
        }
      },
      saveTemplate: saveTemplateImperative,
    }),
    [
      addImage,
      addImages,
      setCurrentImage,
      loadTemplate,
      loadTemplatePayload,
      saveTemplateImperative,
    ],
  )

  const mergedThemes = merge(defaultTheme, themeOverrides, theme)

  return (
    <React.StrictMode>
      <ChakraProvider cssVarsRoot="#ik-editor" theme={mergedThemes} resetCSS>
        <TemplatePermissionsContextProvider
          getTemplatePermissions={getTemplatePermissions}
        >
          <TemplateStorageContextProvider provider={resolvedProvider}>
            <EditorWrapper>
              <EditorLayout
                onAddImage={props.onAddImage}
                onClose={handleOnClose}
                exportOptions={props.exportOptions}
              />
            </EditorWrapper>
          </TemplateStorageContextProvider>
        </TemplatePermissionsContextProvider>
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
