import { ChakraProvider, theme as defaultTheme } from "@chakra-ui/react"
import type { Dict } from "@chakra-ui/utils"
import merge from "lodash/merge"
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from "react"
import { EditorLayout, EditorWrapper } from "./components/editor"
import type { HeaderProps } from "./components/header"
import type { GetTemplatePermissions } from "./context/TemplatePermissionsContext"
import { TemplatePermissionsContextProvider } from "./context/TemplatePermissionsContext"
import { TemplateStorageContextProvider } from "./context/TemplateStorageContext"
import {
  applyTemplateStorageAccessFailure,
  isTemplateAccessDeniedError,
  type TemplateStorageProvider,
} from "./storage"
import {
  applyTemplateRecord,
  type CanvasConfig,
  type EditorMode,
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
  /**
   * Host-controlled, per-template permissions for template management UI.
   * If omitted, the editor defaults to allowing all actions.
   */
  getTemplatePermissions?: GetTemplatePermissions
  /**
   * Open the editor with this template pre-loaded. The editor calls
   * `templateStorage.getTemplate(initialTemplateId)` on mount and applies
   * the result. Requires `templateStorage` to be configured.
   *
   * Failures (template not found, access denied, network error) are surfaced
   * via the standard sync-status error UI; the editor still opens empty.
   */
  initialTemplateId?: string
  /**
   * Editor authoring mode. Defaults to `"editing"` (regular media editing).
   * Pass `"canvas"` to author a layer-only template against a sized blank
   * canvas; `canvas` prop must also be provided in that case.
   *
   * If `initialTemplateId` is supplied and the loaded template has its own
   * `mode`, that wins (the template carries its authoring context).
   */
  mode?: EditorMode
  /** Canvas dimensions and optional background. Required when `mode === "canvas"`. */
  canvas?: CanvasConfig
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
    getTemplatePermissions,
    initialTemplateId,
    mode,
    canvas,
  } = props
  const {
    addImage,
    addImages,
    setCurrentImage,
    transformations,
    initialize,
    destroy,
    loadTemplate,
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
        ...(state.templateIsPrivate !== null
          ? { isPrivate: state.templateIsPrivate }
          : {}),
        mode: state.mode,
        ...(state.mode === "canvas" ? { canvas: state.canvas } : {}),
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
      mode,
      canvas,
    })
  }, [initialImages, signer, focusObjects, initialize, mode, canvas])

  // Load template by id from the configured storage provider when
  // `initialTemplateId` is supplied. This runs after `initialize` so it can
  // overwrite any reset metadata. Keyed on (provider, id) so switching either
  // re-fetches.
  React.useEffect(() => {
    if (!initialTemplateId) return
    if (!resolvedProvider) {
      console.warn(
        "ImageKitEditor: `initialTemplateId` was provided but no `templateStorage` is configured.",
      )
      return
    }

    let cancelled = false
    const store = useEditorStore.getState()

    resolvedProvider
      .getTemplate(initialTemplateId)
      .then((record) => {
        if (cancelled) return
        if (!record) {
          useEditorStore
            .getState()
            .setSyncStatus("error", "Template not found.")
          return
        }
        applyTemplateRecord(record)
      })
      .catch((err) => {
        if (cancelled) return
        const handled = applyTemplateStorageAccessFailure(err, {
          denyTemplateStorageAccessAndReset:
            store.denyTemplateStorageAccessAndReset,
        })
        if (handled) return
        useEditorStore
          .getState()
          .setSyncStatus(
            "error",
            err instanceof Error ? err.message : "Failed to load template",
          )
      })

    return () => {
      cancelled = true
    }
  }, [resolvedProvider, initialTemplateId])

  useImperativeHandle(
    ref,
    () => ({
      loadImage: addImage,
      loadImages: addImages,
      setCurrentImage,
      getTemplate: () => transformations,
      loadTemplate,
      saveTemplate: saveTemplateImperative,
    }),
    [
      addImage,
      addImages,
      setCurrentImage,
      transformations,
      loadTemplate,
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
