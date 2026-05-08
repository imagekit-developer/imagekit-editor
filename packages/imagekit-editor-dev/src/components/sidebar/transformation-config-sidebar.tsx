import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  VStack,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PiArrowLeft } from "@react-icons/all-files/pi/PiArrowLeft"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiInfo } from "@react-icons/all-files/pi/PiInfo"
import { PiX } from "@react-icons/all-files/pi/PiX"
import startCase from "lodash/startCase"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod/v3"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import type { TransformationField } from "../../schema"
import {
  DEFAULT_FOCUS_OBJECTS,
  RESIZE_CROP_HELP_TEXT,
  RESIZE_CROP_MODES,
  transformationSchema,
} from "../../schema"
import { type SyncStatus, useEditorStore } from "../../store"
import {
  generateVariableName,
  isVariableRef,
  type VariableRef,
} from "../../variables"
import { listVariables } from "../../variables/listVariables"
import { SidebarBody } from "./sidebar-body"
import { SidebarFooter } from "./sidebar-footer"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"
import { TransformationFieldRenderer } from "./TransformationFieldRenderer"
import { MakeVariableButton, BoundVariableChip, isVariablizableFieldType } from "./MakeVariableButton"

export type TransformationFooterActionMode =
  | "fullySynced"
  | "applyFlow"
  | "saveFlow"

/** Pure state machine for transformation sidebar footer primary + menu labels and disabled flags. */
export function getTransformationFooterActionsConfig(input: {
  isDirty: boolean
  syncStatus: SyncStatus
  hasAppliedInSession: boolean
  templateStorageWriteBlocked: boolean
  hasUnsyncedChanges: boolean
}): {
  mode: TransformationFooterActionMode
  primary: { label: string; disabled: boolean }
  menu: Array<{ label: string; disabled: boolean }>
  menuTriggerDisabled: boolean
} {
  const {
    isDirty,
    syncStatus,
    hasAppliedInSession,
    templateStorageWriteBlocked,
    hasUnsyncedChanges,
  } = input

  const fullySynced = !isDirty && !hasUnsyncedChanges && syncStatus === "saved"
  if (fullySynced) {
    return {
      mode: "fullySynced",
      primary: { label: "Apply", disabled: true },
      menu: [
        { label: "Apply & Close", disabled: true },
        { label: "Apply & Save", disabled: true },
      ],
      menuTriggerDisabled: true,
    }
  }

  const showApplyFlow = !hasAppliedInSession || isDirty
  if (showApplyFlow) {
    const canApply = isDirty
    const primaryDisabled = !canApply
    return {
      mode: "applyFlow",
      primary: { label: "Apply", disabled: primaryDisabled },
      menu: [
        { label: "Apply & Close", disabled: primaryDisabled },
        { label: "Apply & Save", disabled: primaryDisabled },
      ],
      menuTriggerDisabled: primaryDisabled,
    }
  }

  const saveDisabled = templateStorageWriteBlocked || syncStatus === "saving"

  return {
    mode: "saveFlow",
    primary: { label: "Save Changes", disabled: saveDisabled },
    menu: [{ label: "Save & Close", disabled: saveDisabled }],
    menuTriggerDisabled: saveDisabled,
  }
}

export const TransformationConfigSidebar: React.FC = () => {
  const {
    transformations,
    addTransformation,
    updateTransformation,
    imageList,
    focusObjects,
    _setSidebarState,
    _internalState,
    _setTransformationToEdit,
    _setSelectedTransformationKey,
    setTransformationConfigFormDirty,
  } = useEditorStore()
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )
  const { saveNow } = useTemplateSync()
  const hasUnsyncedChanges = useEditorStore(
    (s) => s.localChangeVersion !== s.lastSyncedVersion,
  )
  const save = useCallback(() => saveNow({ reason: "sidebar" }), [saveNow])

  const selectedTransformation = useMemo(() => {
    return transformationSchema
      .find(
        (transformation) =>
          transformation.key ===
          _internalState.selectedTransformationKey?.split("-")[0],
      )
      ?.items.find(
        (item) => item.key === _internalState.selectedTransformationKey,
      )
  }, [_internalState.selectedTransformationKey])

  const transformationToEdit = _internalState.transformationToEdit as {
    transformationId: string
    position: "inplace"
  }

  const editedTransformation = useMemo(() => {
    if (!transformationToEdit) return undefined
    return transformations.find(
      (transformation) =>
        transformation.id === transformationToEdit.transformationId,
    )
  }, [transformations, transformationToEdit])

  const [hasAppliedInSession, setHasAppliedInSession] = useState(false)

  const footerSessionResetKey = `${_internalState.selectedTransformationKey ?? ""}:${editedTransformation?.id ?? ""}`

  // biome-ignore lint/correctness/useExhaustiveDependencies: must reset when switching transformation / edit target
  useEffect(() => {
    setHasAppliedInSession(false)
  }, [footerSessionResetKey])

  const editedTransformationValue = editedTransformation?.value as
    | Record<string, unknown>
    | undefined

  // ── Variables (canvas mode only) ─────────────────────────────────────────
  // The marker `{ $var, label }` is the source of truth and lives
  // inside the persisted transformation value. While the user is editing in
  // the sidebar we keep two parallel mirrors:
  //   - RHF holds the resolved default for each variabilized field, so Zod
  //     validation passes and the live editor preview keeps rendering with
  //     real values;
  //   - `boundFields` holds the marker, indexed by field name, so on Apply
  //     we can overlay markers back onto `data` before persistence.
  // This split avoids two earlier failure modes: Zod rejecting non-scalar
  // values, and the dirty flag not flipping on bind/unbind alone.
  const editorMode = useEditorStore((s) => s.mode)
  const isCanvasMode = editorMode === "canvas"
  const allTransformations = useEditorStore((s) => s.transformations)
  const allTakenVariableNames = useMemo(
    () => listVariables(allTransformations).map((v) => v.name),
    [allTransformations],
  )

  const initialBoundFields = useMemo(() => {
    const out: Record<string, VariableRef> = {}
    if (!editedTransformationValue) return out
    for (const [k, v] of Object.entries(editedTransformationValue)) {
      if (isVariableRef(v)) out[k] = v
    }
    return out
  }, [editedTransformationValue])

  const [boundFields, setBoundFields] =
    useState<Record<string, VariableRef>>(initialBoundFields)
  // Flips when the user binds, unbinds, or renames a variable. RHF's own
  // `isDirty` only reflects field-value diffs; binding can leave the
  // resolved default identical to RHF's seed value, so we need a separate
  // signal to enable Apply.
  const [bindingDirty, setBindingDirty] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when switching transformations / edit targets
  useEffect(() => {
    setBoundFields(initialBoundFields)
    setBindingDirty(false)
  }, [initialBoundFields, footerSessionResetKey])

  const defaultValues = useMemo(() => {
    if (
      transformationToEdit &&
      selectedTransformation &&
      transformationToEdit.position === "inplace"
    ) {
      const currentValues: Record<string, unknown> = {}

      selectedTransformation.transformations.forEach((field) => {
        if (
          editedTransformationValue &&
          field.name in editedTransformationValue
        ) {
          const stored = editedTransformationValue[field.name]
          // Variabilized field: seed RHF with the field's schema default so
          // the (hidden) input + Zod validator have something sane to work
          // with. The marker is the source of truth and is restored on Apply.
          currentValues[field.name] = isVariableRef(stored)
            ? (field.fieldProps?.defaultValue ?? "")
            : stored
        } else {
          currentValues[field.name] = field.fieldProps?.defaultValue ?? ""
        }
      })

      return currentValues
    } else if (selectedTransformation) {
      return selectedTransformation.transformations.reduce(
        (acc, field) => {
          acc[field.name] = field.fieldProps?.defaultValue ?? ""
          return acc
        },
        {} as Record<string, unknown>,
      )
    }
    return {}
  }, [transformationToEdit, selectedTransformation, editedTransformationValue])

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    control,
    trigger,
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(selectedTransformation?.schema ?? z.object({})),
    defaultValues: defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [reset, defaultValues])

  useEffect(() => {
    setTransformationConfigFormDirty(isDirty)
    return () => setTransformationConfigFormDirty(false)
  }, [isDirty, setTransformationConfigFormDirty])

  const setDirtyValue = useCallback(
    (name: string, value: unknown) => {
      setValue(name, value, { shouldDirty: true, shouldTouch: true })
    },
    [setValue],
  )

  const values = watch()

  const onClose = useCallback(() => {
    if (transformations.length === 0) {
      _setSidebarState("type")
    } else {
      _setSidebarState("none")
    }
    _setSelectedTransformationKey(null)
    _setTransformationToEdit(null)
  }, [
    transformations.length,
    _setSidebarState,
    _setSelectedTransformationKey,
    _setTransformationToEdit,
  ])

  const onBack = () => {
    _setSidebarState("type")
  }

  const onApply = useCallback(
    (data: Record<string, unknown>) => {
      if (!selectedTransformation) {
        return
      }

      const transformationToEdit = _internalState.transformationToEdit

      // Generate display name for resize_and_crop transformation
      let displayName = selectedTransformation.name
      if (
        selectedTransformation.key === "resize_and_crop-resize_and_crop" &&
        data.mode
      ) {
        const modeInfo = RESIZE_CROP_MODES.find((m) => m.value === data.mode)
        if (modeInfo) {
          displayName = `Resize and Crop (${modeInfo.label})`
        }
      }

      // Helper to check if a name is auto-generated for resize_and_crop
      const isAutoGeneratedName = (name: string) => {
        if (name === "Resize and Crop") return true
        // Check if it matches pattern "Resize and Crop (ModeName)"
        return RESIZE_CROP_MODES.some(
          (mode) => name === `Resize and Crop (${mode.label})`,
        )
      }

      if (transformationToEdit && transformationToEdit.position === "inplace") {
        // For resize_and_crop, only update name if it's still auto-generated
        // If user has manually changed it, preserve their custom name
        let finalName = editedTransformation?.name ?? displayName
        if (
          selectedTransformation.key === "resize_and_crop-resize_and_crop" &&
          editedTransformation?.name
        ) {
          if (isAutoGeneratedName(editedTransformation.name)) {
            finalName = displayName
          }
        }

        // Overlay variable markers onto the form data so the persisted
        // value carries the marker rather than the placeholder seeded into
        // RHF for the (hidden) input.
        const persistedData: Record<string, unknown> = { ...data }
        for (const [fieldName, ref] of Object.entries(boundFields)) {
          persistedData[fieldName] = ref
        }

        updateTransformation(transformationToEdit.transformationId, {
          type: "transformation",
          name: finalName,
          key: selectedTransformation.key,
          value: persistedData,
        })
      } else if (
        transformationToEdit &&
        (transformationToEdit.position === "above" ||
          transformationToEdit.position === "below")
      ) {
        const index = transformations.findIndex(
          (transformation) =>
            transformation.id === transformationToEdit.targetId,
        )

        const persistedData: Record<string, unknown> = { ...data }
        for (const [fieldName, ref] of Object.entries(boundFields)) {
          persistedData[fieldName] = ref
        }

        const transformationId = addTransformation(
          {
            type: "transformation",
            name: displayName,
            key: selectedTransformation.key,
            value: persistedData,
          },
          index + (transformationToEdit.position === "above" ? 0 : 1),
        )

        _setTransformationToEdit(transformationId, "inplace")
      } else {
        const persistedData: Record<string, unknown> = { ...data }
        for (const [fieldName, ref] of Object.entries(boundFields)) {
          persistedData[fieldName] = ref
        }
        const transformationId = addTransformation({
          type: "transformation",
          name: displayName,
          key: selectedTransformation.key,
          value: persistedData,
        })

        _setTransformationToEdit(transformationId, "inplace")
      }

      setHasAppliedInSession(true)
      setBindingDirty(false)
    },
    [
      _internalState.transformationToEdit,
      addTransformation,
      editedTransformation,
      selectedTransformation,
      transformations,
      updateTransformation,
      _setTransformationToEdit,
      boundFields,
    ],
  )

  const onSubmit = useCallback(
    (shouldClose = false): SubmitHandler<Record<string, unknown>> => {
      return (data) => {
        onApply(data)
        if (shouldClose) {
          onClose()
        }
      }
    },
    [onApply, onClose],
  )

  const footerActionsConfig = useMemo(
    () =>
      getTransformationFooterActionsConfig({
        isDirty: isDirty || bindingDirty,
        syncStatus,
        hasAppliedInSession,
        templateStorageWriteBlocked,
        hasUnsyncedChanges,
      }),
    [
      isDirty,
      bindingDirty,
      syncStatus,
      hasAppliedInSession,
      templateStorageWriteBlocked,
      hasUnsyncedChanges,
    ],
  )

  const footerActions = useMemo(() => {
    const noop = () => {}
    const applySubmit = handleSubmit(onSubmit())
    const applyCloseSubmit = handleSubmit(onSubmit(true))
    const applySaveSubmit = handleSubmit((data) => {
      onApply(data)
      void save()
    })

    switch (footerActionsConfig.mode) {
      case "fullySynced":
        return {
          primary: { ...footerActionsConfig.primary, onClick: noop },
          menuItems: footerActionsConfig.menu.map((item) => ({
            ...item,
            onClick: noop,
          })),
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled,
        }
      case "applyFlow":
        return {
          primary: {
            ...footerActionsConfig.primary,
            onClick: () => {
              void applySubmit()
            },
          },
          menuItems: [
            {
              ...footerActionsConfig.menu[0],
              onClick: () => {
                void applyCloseSubmit()
              },
            },
            {
              ...footerActionsConfig.menu[1],
              onClick: () => {
                void applySaveSubmit()
              },
            },
          ],
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled,
        }
      case "saveFlow":
        return {
          primary: {
            ...footerActionsConfig.primary,
            onClick: () => {
              void save()
            },
          },
          menuItems: [
            {
              ...footerActionsConfig.menu[0],
              onClick: () => {
                void save().finally(() => onClose())
              },
            },
          ],
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled,
        }
    }
  }, [footerActionsConfig, handleSubmit, onSubmit, onApply, save, onClose])

  if (!selectedTransformation) {
    return null
  }

  return (
    <SidebarRoot>
      <SidebarHeader>
        {!_internalState.transformationToEdit ? (
          <IconButton
            icon={<Icon as={PiArrowLeft} />}
            onClick={onBack}
            variant="ghost"
            size="sm"
            aria-label="Back Button"
          />
        ) : null}
        <Text fontSize="md" fontWeight="normal">
          {selectedTransformation.name}
        </Text>

        {(selectedTransformation.description ||
          selectedTransformation.docsLink) && (
          <Popover
            trigger="hover"
            isLazy
            lazyBehavior="unmount"
            gutter={2}
            placement="bottom-end"
          >
            <PopoverTrigger>
              <IconButton
                icon={<Icon as={PiInfo} />}
                variant="ghost"
                size="sm"
                aria-label="Info Button"
              />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverBody fontSize="sm">
                {selectedTransformation.description && (
                  <Text>{selectedTransformation.description}</Text>
                )}
                {selectedTransformation.docsLink && (
                  <Link
                    fontSize="10px"
                    href={selectedTransformation.docsLink}
                    isExternal
                    color="editorBlue.500"
                  >
                    Click here to view docs
                  </Link>
                )}
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
        {_internalState.transformationToEdit && (
          <IconButton
            icon={<Icon as={PiX} />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close Button"
            ml="auto"
          />
        )}
      </SidebarHeader>

      <SidebarBody gap="6" p="4">
        {selectedTransformation.key === "resize_and_crop-resize_and_crop" && (
          <Text fontSize="sm" color="gray.600" mb={2}>
            {RESIZE_CROP_HELP_TEXT}
          </Text>
        )}
        {selectedTransformation.transformations
          .filter((field) => {
            if (field.isVisible) {
              return field.isVisible(values)
            }
            return true
          })
          .map((field: TransformationField) => {
            const boundVariable = boundFields[field.name]
            const showMakeVariable =
              isCanvasMode &&
              !boundVariable &&
              isVariablizableFieldType(field.fieldType)
            return (
              <FormControl
                key={field.name}
                isInvalid={
                  !!errors[field.name] &&
                  !["gradient-picker", "padding-input"].some(
                    (type) => field.fieldType === type,
                  )
                }
              >
                <Flex
                  align="center"
                  justify="space-between"
                  role="group"
                  mb="1"
                >
                  <FormLabel htmlFor={field.name} fontSize="sm" mb="0">
                    {field.label}
                  </FormLabel>
                  {showMakeVariable && (
                    <MakeVariableButton
                      fieldLabel={field.label}
                      takenNames={allTakenVariableNames}
                      onCreate={(variable) => {
                        setBoundFields((prev) => ({
                          ...prev,
                          [field.name]: {
                            $var: variable.name,
                            label: variable.label,
                          },
                        }))
                        setBindingDirty(true)
                        // Touching the form value forces RHF to refresh its
                        // dependents (preview, isDirty subscribers).
                        setDirtyValue(field.name, values[field.name])
                      }}
                    />
                  )}
                </Flex>
                {boundVariable ? (
                  <BoundVariableChip
                    variable={boundVariable}
                    onRename={(newLabel) => {
                      setBoundFields((prev) => ({
                        ...prev,
                        [field.name]: { ...prev[field.name], label: newLabel },
                      }))
                      setBindingDirty(true)
                    }}
                    onUnbind={() => {
                      setBoundFields((prev) => {
                        const next = { ...prev }
                        delete next[field.name]
                        return next
                      })
                      setBindingDirty(true)
                    }}
                  />
                ) : (
                  <Controller
                    name={field.name}
                    control={control}
                    render={({ field: controllerField }) => (
                      <TransformationFieldRenderer
                        field={field}
                        value={controllerField.value}
                        onChange={controllerField.onChange}
                        onBlur={controllerField.onBlur}
                        errors={errors}
                        disabled={
                          selectedTransformation.key ===
                            "resize_and_crop-resize_and_crop" &&
                          field.name === "aspectRatio" &&
                          !!values.width &&
                          !!values.height
                        }
                        selectOptionsOverride={
                          field.name === "focusObject"
                            ? (focusObjects || DEFAULT_FOCUS_OBJECTS).map(
                                (obj) => ({
                                  value: obj,
                                  label: startCase(obj),
                                }),
                              )
                            : undefined
                        }
                        onTrigger={() => trigger(field.name)}
                      />
                    )}
                  />
                )}
                <FormErrorMessage fontSize="sm">
                  {String(
                    errors[field.name as keyof typeof errors]?.message ?? "",
                  )}
                </FormErrorMessage>
                {field.helpText && (
                  <FormHelperText fontSize="sm">
                    {field.helpText}
                    {/* Additional help text for aspect ratio when both dimensions are set */}
                    {selectedTransformation.key ===
                      "resize_and_crop-resize_and_crop" &&
                      field.name === "aspectRatio" &&
                      values.width &&
                      values.height && (
                        <Text
                          as="span"
                          color="orange.500"
                          display="block"
                          mt={1}
                        >
                          Note: Aspect ratio is ignored when both width and
                          height are specified.
                        </Text>
                      )}
                  </FormHelperText>
                )}
                {field.examples && (
                  <FormHelperText fontSize="sm">
                    <b>Example{field.examples.length > 1 ? "s" : ""}</b>:{" "}
                    {field.examples.join(", ")}
                  </FormHelperText>
                )}
              </FormControl>
            )
          })}
      </SidebarBody>
      {selectedTransformation?.warning && (
        <Alert status="warning" fontSize="sm" px="8" py="2">
          <VStack alignItems="start" justifyContent="space-between">
            {selectedTransformation.warning.heading ? (
              <AlertTitle>{selectedTransformation.warning.heading}</AlertTitle>
            ) : null}
            {selectedTransformation.warning.message ? (
              <AlertDescription lineHeight="normal">
                {selectedTransformation.warning.message.replace(
                  "{imageList.length}",
                  String(imageList.length),
                )}
              </AlertDescription>
            ) : null}
          </VStack>
        </Alert>
      )}
      {errors[""] && (
        <Alert status="error" fontSize="sm" px="8" py="2">
          <VStack alignItems="start" justifyContent="space-between">
            <AlertTitle>Invalid transformation</AlertTitle>
            <AlertDescription lineHeight="normal">
              {errors[""]?.message}
            </AlertDescription>
          </VStack>
        </Alert>
      )}
      <SidebarFooter>
        <HStack spacing={2} w="full" justifyContent="space-between">
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              if (isDirty) {
                reset()
              } else {
                onClose()
              }
            }}
          >
            {isDirty ? "Discard changes" : "Close"}
          </Button>

          <ButtonGroup size="md" isAttached variant="solid" colorScheme="blue">
            <Button
              type="button"
              isDisabled={footerActions.primary.disabled}
              onClick={footerActions.primary.onClick}
            >
              {footerActions.primary.label}
            </Button>
            <Menu placement="top-end" closeOnSelect>
              <MenuButton
                as={Button}
                isDisabled={footerActions.menuTriggerDisabled}
                colorScheme="blue"
                borderLeft="1px"
                borderLeftColor="blue.300"
                px="2"
              >
                <Icon as={PiCaretDown} />
              </MenuButton>
              <MenuList minW="160px">
                {footerActions.menuItems.map((item) => (
                  <MenuItem
                    key={item.label}
                    isDisabled={item.disabled}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </ButtonGroup>
        </HStack>
      </SidebarFooter>
    </SidebarRoot>
  )
}
