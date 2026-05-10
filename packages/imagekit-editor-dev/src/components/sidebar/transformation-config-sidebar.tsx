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
  Input,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PiArrowLeft } from "@react-icons/all-files/pi/PiArrowLeft"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiCodeBold } from "@react-icons/all-files/pi/PiCodeBold"
import { PiInfo } from "@react-icons/all-files/pi/PiInfo"
import { PiX } from "@react-icons/all-files/pi/PiX"
import startCase from "lodash/startCase"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ColorPickerProps } from "react-best-gradient-color-picker"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import Select from "react-select"
import CreateableSelect from "react-select/creatable"
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
import { isStepAligned } from "../../utils"
import { isVariableNameUnique, validateVariableName } from "../../utils/params"
import AnchorField from "../common/AnchorField"
import CheckboxCardField from "../common/CheckboxCardField"
import ColorPickerField from "../common/ColorPickerField"
import RadiusInputField, {
  type RadiusErrors,
  type RadiusState,
} from "../common/CornerRadiusInput"
import DistortPerspectiveInput, {
  type PerspectiveErrors,
  type PerspectiveObject,
} from "../common/DistortPerspectiveInput"
import GradientPicker, {
  type GradientPickerState,
} from "../common/GradientPicker"
import PaddingInputField, {
  type PaddingErrors,
  type PaddingState,
} from "../common/PaddingInput"
import RadioCardField from "../common/RadioCardField"
import ZoomInput from "../common/ZoomInput"
import { SidebarBody } from "./sidebar-body"
import { SidebarFooter } from "./sidebar-footer"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"

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

/** Inline param variable name editor for a single form field. */
function FieldParamToggle({
  transformationId,
  fieldName,
  currentVariable,
  onSetParam,
}: {
  transformationId: string | undefined
  fieldName: string
  currentVariable: string | undefined
  onSetParam?: (
    fieldName: string,
    variableName: string | undefined,
  ) => { success: boolean; error?: string }
}) {
  const setFieldParam = useEditorStore((s) => s.setFieldParam)
  const [isEditing, setIsEditing] = useState(false)
  const [localValue, setLocalValue] = useState(currentVariable ?? "")
  const [error, setError] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync from store when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(currentVariable ?? "")
      setError(undefined)
    }
  }, [currentVariable, isEditing])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  const commitParam = useCallback(
    (fName: string, varName: string | undefined) => {
      if (onSetParam) {
        return onSetParam(fName, varName)
      }
      if (!transformationId) {
        return { success: false, error: "Transformation not found." }
      }
      return setFieldParam(transformationId, fName, varName)
    },
    [onSetParam, transformationId, setFieldParam],
  )

  const handleCommit = () => {
    const trimmed = localValue.trim()
    if (!trimmed) {
      // Remove binding
      commitParam(fieldName, undefined)
      setError(undefined)
      setIsEditing(false)
      return
    }
    const result = commitParam(fieldName, trimmed)
    if (result.success) {
      setError(undefined)
      setIsEditing(false)
    } else {
      setError(result.error)
    }
  }

  if (!isEditing && !currentVariable) {
    return (
      <IconButton
        icon={<Icon as={PiCodeBold} />}
        size="xs"
        variant="ghost"
        aria-label={`Parameterize ${fieldName}`}
        title="Assign a variable name to this field"
        opacity={0.5}
        _hover={{ opacity: 1 }}
        onClick={() => setIsEditing(true)}
      />
    )
  }

  if (!isEditing && currentVariable) {
    return (
      <HStack spacing={1}>
        <Text
          fontSize="xs"
          color="purple.600"
          fontFamily="mono"
          cursor="pointer"
          onClick={() => setIsEditing(true)}
          title={`Variable: ${currentVariable} (click to edit)`}
        >
          {`{${currentVariable}}`}
        </Text>
        <IconButton
          icon={<Icon as={PiX} />}
          size="xs"
          variant="ghost"
          aria-label={`Remove param ${currentVariable}`}
          onClick={() => {
            commitParam(fieldName, undefined)
          }}
        />
      </HStack>
    )
  }

  return (
    <VStack align="stretch" spacing={0}>
      <HStack spacing={1}>
        <Input
          ref={inputRef}
          size="xs"
          fontSize="xs"
          fontFamily="mono"
          placeholder="variable_name"
          value={localValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setLocalValue(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") handleCommit()
            if (e.key === "Escape") {
              setIsEditing(false)
              setError(undefined)
            }
          }}
          onBlur={handleCommit}
          isInvalid={!!error}
          width="120px"
        />
      </HStack>
      {error && (
        <Text fontSize="xs" color="red.500" mt={0.5}>
          {error}
        </Text>
      )}
    </VStack>
  )
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
  const [draftParams, setDraftParams] = useState<Record<string, string>>({})

  const footerSessionResetKey = `${_internalState.selectedTransformationKey ?? ""}:${editedTransformation?.id ?? ""}`

  // biome-ignore lint/correctness/useExhaustiveDependencies: must reset when switching transformation / edit target
  useEffect(() => {
    setHasAppliedInSession(false)
    setDraftParams({})
  }, [footerSessionResetKey])

  const editedTransformationValue = editedTransformation?.value as
    | Record<string, unknown>
    | undefined

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
          let val = editedTransformationValue[field.name]
          // Normalize raw padding values (e.g. from older templates or SDK format)
          // into the { mode, padding } shape expected by PaddingInputField.
          if (
            field.fieldType === "padding-input" &&
            val != null &&
            typeof val !== "object"
          ) {
            const str = String(val)
            const parts = str.split("_").map(Number)
            if (parts.length === 4 && parts.every((p) => !Number.isNaN(p))) {
              val = {
                mode: "individual",
                padding: {
                  top: parts[0],
                  right: parts[1],
                  bottom: parts[2],
                  left: parts[3],
                },
              }
            } else if (
              parts.length === 2 &&
              parts.every((p) => !Number.isNaN(p))
            ) {
              val = {
                mode: "individual",
                padding: {
                  top: parts[0],
                  right: parts[1],
                  bottom: parts[0],
                  left: parts[1],
                },
              }
            } else {
              val = { mode: "uniform", padding: str }
            }
          }
          currentValues[field.name] = val
        } else {
          currentValues[field.name] =
            field.fieldProps?.defaultValue ??
            (field.fieldType === "anchor" ? undefined : "")
        }
      })

      return currentValues
    } else if (selectedTransformation) {
      return selectedTransformation.transformations.reduce(
        (acc, field) => {
          acc[field.name] =
            field.fieldProps?.defaultValue ??
            (field.fieldType === "anchor" ? undefined : "")
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

  const handleDraftParam = useCallback(
    (
      fieldName: string,
      variableName: string | undefined,
    ): { success: boolean; error?: string } => {
      if (!variableName) {
        setDraftParams((prev) => {
          const { [fieldName]: _, ...rest } = prev
          return rest
        })
        return { success: true }
      }
      const validation = validateVariableName(variableName)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }
      // Check uniqueness across store transformations
      const state = useEditorStore.getState()
      if (
        !isVariableNameUnique(
          variableName,
          "",
          fieldName,
          state.transformations,
        )
      ) {
        return {
          success: false,
          error: `Variable name "${variableName}" is already in use.`,
        }
      }
      // Check uniqueness within draft params
      for (const [fn, vn] of Object.entries(draftParams)) {
        if (fn !== fieldName && vn === variableName) {
          return {
            success: false,
            error: `Variable name "${variableName}" is already in use.`,
          }
        }
      }
      setDraftParams((prev) => ({ ...prev, [fieldName]: variableName }))
      return { success: true }
    },
    [draftParams],
  )

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

        updateTransformation(transformationToEdit.transformationId, {
          type: "transformation",
          name: finalName,
          key: selectedTransformation.key,
          value: data,
          params: editedTransformation?.params,
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

        const pendingParams =
          Object.keys(draftParams).length > 0 ? draftParams : undefined
        const transformationId = addTransformation(
          {
            type: "transformation",
            name: displayName,
            key: selectedTransformation.key,
            value: data,
            params: pendingParams,
          },
          index + (transformationToEdit.position === "above" ? 0 : 1),
        )

        _setTransformationToEdit(transformationId, "inplace")
      } else {
        const pendingParams =
          Object.keys(draftParams).length > 0 ? draftParams : undefined
        const transformationId = addTransformation({
          type: "transformation",
          name: displayName,
          key: selectedTransformation.key,
          value: data,
          params: pendingParams,
        })

        _setTransformationToEdit(transformationId, "inplace")
      }

      setDraftParams({})
      setHasAppliedInSession(true)
    },
    [
      _internalState.transformationToEdit,
      addTransformation,
      draftParams,
      editedTransformation,
      selectedTransformation,
      transformations,
      updateTransformation,
      _setTransformationToEdit,
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
        isDirty,
        syncStatus,
        hasAppliedInSession,
        templateStorageWriteBlocked,
        hasUnsyncedChanges,
      }),
    [
      isDirty,
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
          .map((field: TransformationField) => (
            <FormControl
              key={field.name}
              isInvalid={
                !!errors[field.name] &&
                !["gradient-picker", "padding-input"].some(
                  (type) => field.fieldType === type,
                )
              }
            >
              <Flex justify="space-between" align="center">
                <FormLabel htmlFor={field.name} fontSize="sm" mb={0}>
                  {field.label}
                </FormLabel>
                <FieldParamToggle
                  transformationId={transformationToEdit?.transformationId}
                  fieldName={field.name}
                  currentVariable={
                    transformationToEdit
                      ? editedTransformation?.params?.[field.name]
                      : draftParams[field.name]
                  }
                  onSetParam={
                    !transformationToEdit ? handleDraftParam : undefined
                  }
                />
              </Flex>
              {field.fieldType === "select" ? (
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: controllerField }) => {
                    // For focusObject field, use focusObjects from store or default list
                    const selectOptions =
                      field.name === "focusObject"
                        ? (focusObjects || DEFAULT_FOCUS_OBJECTS).map(
                            (obj) => ({
                              value: obj,
                              label: startCase(obj),
                            }),
                          )
                        : field.fieldProps?.options?.map((option) => ({
                            value: option.value,
                            label: option.label,
                          }))

                    const isCreatable = field.fieldProps?.isCreatable === true
                    const isClearable: boolean =
                      field.fieldProps?.isClearable ?? false

                    // For creatable selects, find the value in options or create a custom one
                    const selectedValue = isCreatable
                      ? selectOptions?.find(
                          (option) => option.value === controllerField.value,
                        ) ||
                        (controllerField.value
                          ? {
                              value: controllerField.value as string,
                              label: startCase(controllerField.value as string),
                            }
                          : null)
                      : selectOptions?.find(
                          (option) => option.value === controllerField.value,
                        )

                    return isCreatable ? (
                      <CreateableSelect
                        id={field.name}
                        formatCreateLabel={(inputValue: string) =>
                          `Use "${inputValue}"`
                        }
                        isClearable={isClearable}
                        placeholder="Select"
                        menuPlacement="auto"
                        options={selectOptions}
                        value={selectedValue}
                        onChange={(selectedOption) =>
                          controllerField.onChange(selectedOption?.value)
                        }
                        onBlur={controllerField.onBlur}
                        styles={{
                          control: (base) => ({
                            ...base,
                            fontSize: "12px",
                            minHeight: "32px",
                            borderColor: "#E2E8F0",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 10,
                          }),
                          option: (base) => ({
                            ...base,
                            fontSize: "12px",
                          }),
                        }}
                      />
                    ) : (
                      <Select
                        id={field.name}
                        isClearable={isClearable}
                        placeholder="Select"
                        menuPlacement="auto"
                        options={selectOptions}
                        value={selectedValue}
                        onChange={(selectedOption) =>
                          controllerField.onChange(selectedOption?.value)
                        }
                        onBlur={controllerField.onBlur}
                        styles={{
                          control: (base) => ({
                            ...base,
                            fontSize: "12px",
                            minHeight: "32px",
                            borderColor: "#E2E8F0",
                          }),
                          menu: (base) => ({
                            ...base,
                            zIndex: 10,
                          }),
                          option: (base) => ({
                            ...base,
                            fontSize: "12px",
                          }),
                        }}
                      />
                    )
                  }}
                />
              ) : null}
              {field.fieldType === "select-creatable" ? (
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: controllerField }) => (
                    <CreateableSelect
                      id={field.name}
                      placeholder="Select"
                      menuPlacement="auto"
                      options={field.fieldProps?.options?.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                      value={field.fieldProps?.options?.find(
                        (option) => option.value === controllerField.value,
                      )}
                      onChange={(selectedOption) =>
                        controllerField.onChange(selectedOption?.value)
                      }
                      onBlur={controllerField.onBlur}
                      styles={{
                        control: (base) => ({
                          ...base,
                          fontSize: "12px",
                          minHeight: "32px",
                          borderColor: "#E2E8F0",
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 10,
                        }),
                        option: (base) => ({
                          ...base,
                          fontSize: "12px",
                        }),
                      }}
                    />
                  )}
                />
              ) : null}
              {field.fieldType === "input" ? (
                <Input
                  id={field.name}
                  fontSize="sm"
                  {...register(field.name)}
                  {...(field.fieldProps ?? {})}
                  defaultValue={
                    field.fieldProps?.defaultValue as
                      | string
                      | number
                      | readonly string[]
                      | undefined
                  }
                  disabled={
                    // Disable aspect ratio when both width and height are set
                    selectedTransformation.key ===
                      "resize_and_crop-resize_and_crop" &&
                    field.name === "aspectRatio" &&
                    !!values.width &&
                    !!values.height
                  }
                />
              ) : null}
              {field.fieldType === "textarea" ? (
                <Textarea
                  id={field.name}
                  fontSize="sm"
                  {...register(field.name)}
                />
              ) : null}
              {field.fieldType === "switch" ? (
                <Switch
                  id={field.name}
                  fontSize="sm"
                  isChecked={watch(field.name) === true}
                  {...register(field.name)}
                />
              ) : null}
              {field.fieldType === "slider" ? (
                <Box pt={2} pb={2}>
                  <Flex justify="space-between" mb={1}>
                    <Input
                      id={`${field.name}-input`}
                      type={
                        field.fieldProps?.inputType ||
                        field.fieldProps?.autoOption
                          ? "text"
                          : "number"
                      }
                      fontSize="sm"
                      width="80px"
                      value={(watch(field.name) as string) ?? ""}
                      defaultValue={field.fieldProps?.defaultValue as number}
                      onBlur={() => {
                        const raw = watch(field.name)
                        const n = Number(
                          String(raw).toUpperCase().replace(/^N/, "-"),
                        )
                        const isNumberWithN =
                          typeof raw === "string" &&
                          !Number.isNaN(n) &&
                          raw.toUpperCase().startsWith("N")
                        if (!Number.isFinite(n)) return

                        const { step, min, max, skipStepCheck } =
                          field.fieldProps ?? {}
                        let v = n

                        if (min !== undefined) v = Math.max(v, min)
                        if (max !== undefined) v = Math.min(v, max)
                        if (!skipStepCheck && step) {
                          v = Math.round(v / step) * step
                          const dp = (String(step).split(".")[1] || "").length
                          v = Number(v.toFixed(dp))
                        }
                        const finalValue =
                          v < 0 && isNumberWithN ? `N${Math.abs(v)}` : String(v)
                        setValue(field.name, finalValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }}
                      onChange={(e) => {
                        const val = e.target.value
                        const numSafeVal = String(val)
                          .toUpperCase()
                          .replace(/^N/, "-")
                        const isNumberWithN =
                          typeof val === "string" &&
                          !Number.isNaN(Number(numSafeVal)) &&
                          val.toUpperCase().startsWith("N")

                        if (val === "") {
                          setValue(field.name, "", {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                          return
                        }

                        if (val === "-") {
                          setValue(field.name, "-", {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                          return
                        }

                        if (
                          field.fieldProps?.autoOption &&
                          val.match(/au?t?o?/i)
                        ) {
                          setValue(field.name, "auto", {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        } else if (
                          !field.fieldProps?.skipStepCheck &&
                          field.fieldProps?.step &&
                          !isStepAligned(val, field.fieldProps?.step)
                        ) {
                          return
                        } else if (
                          field.fieldProps?.min !== undefined &&
                          Number(numSafeVal) < field.fieldProps.min
                        ) {
                          const finalVal =
                            field.fieldProps.min < 0 && isNumberWithN
                              ? `N${Math.abs(field.fieldProps.min)}`
                              : String(field.fieldProps.min)
                          setValue(field.name, finalVal, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        } else if (
                          field.fieldProps?.max !== undefined &&
                          Number(numSafeVal) > field.fieldProps.max
                        ) {
                          setValue(field.name, field.fieldProps.max, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        } else {
                          setValue(field.name, val, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                      }}
                    />
                    {field.fieldProps?.autoOption && (
                      <Button
                        size="sm"
                        colorScheme={
                          watch(field.name) === "auto" ? "blue" : "gray"
                        }
                        onClick={() =>
                          setValue(field.name, "auto", {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                      >
                        Auto
                      </Button>
                    )}
                  </Flex>
                  <Slider
                    id={field.name}
                    min={field.fieldProps?.min || 0}
                    max={field.fieldProps?.max || 100}
                    step={field.fieldProps?.step || 1}
                    value={
                      Number.isNaN(
                        Number(
                          String(watch(field.name))
                            .toUpperCase()
                            .replace(/^N/, "-"),
                        ),
                      )
                        ? 0
                        : Number(
                            String(watch(field.name))
                              .toUpperCase()
                              .replace(/^N/, "-"),
                          )
                    }
                    defaultValue={field.fieldProps?.defaultValue as number}
                    onChange={(val) =>
                      setValue(field.name, val.toString(), {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    focusThumbOnChange={false}
                  >
                    <SliderTrack>
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb borderColor="blue.500" border="1px" />
                  </Slider>
                </Box>
              ) : null}
              {field.fieldType === "color-picker" ? (
                <ColorPickerField
                  fieldName={field.name}
                  value={watch(field.name) as string}
                  setValue={
                    setDirtyValue as unknown as (
                      name: string,
                      value: string,
                    ) => void
                  }
                  fieldProps={field.fieldProps as ColorPickerProps}
                  isClearable={field.fieldProps?.isClearable ?? false}
                />
              ) : null}
              {field.fieldType === "gradient-picker" ? (
                <GradientPicker
                  fieldName={field.name}
                  value={watch(field.name) as GradientPickerState}
                  setValue={
                    setDirtyValue as unknown as (
                      name: string,
                      value: GradientPickerState | string,
                    ) => void
                  }
                  errors={errors}
                />
              ) : null}
              {field.fieldType === "anchor" ? (
                <AnchorField
                  value={watch(field.name) as string}
                  positions={field.fieldProps?.positions as string[]}
                  onChange={(value) =>
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                />
              ) : null}
              {field.fieldType === "radio-card" ? (
                <RadioCardField
                  value={watch(field.name) as string}
                  options={field.fieldProps?.options ?? []}
                  onChange={(value) =>
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  {...field.fieldProps}
                />
              ) : null}
              {field.fieldType === "checkbox-card" ? (
                <CheckboxCardField
                  value={watch(field.name) as string[]}
                  options={field.fieldProps?.options ?? []}
                  onChange={(value) =>
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  {...field.fieldProps}
                />
              ) : null}
              {field.fieldType === "padding-input" ? (
                <PaddingInputField
                  onChange={(value) => {
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                    trigger(field.name)
                  }}
                  errors={errors as PaddingErrors}
                  name={field.name}
                  {...field.fieldProps}
                  value={watch(field.name) as Partial<PaddingState>}
                />
              ) : null}
              {field.fieldType === "zoom" ? (
                <ZoomInput
                  value={watch(field.name) as number}
                  onChange={(value) =>
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  defaultValue={
                    typeof field.fieldProps?.defaultValue === "number"
                      ? (field.fieldProps.defaultValue as number)
                      : undefined
                  }
                />
              ) : null}
              {field.fieldType === "distort-perspective-input" ? (
                <DistortPerspectiveInput
                  onChange={(value) => {
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                    trigger(field.name)
                  }}
                  errors={errors as PerspectiveErrors}
                  name={field.name}
                  value={watch(field.name) as PerspectiveObject}
                  {...field.fieldProps}
                />
              ) : null}
              {field.fieldType === "radius-input" ? (
                <RadiusInputField
                  onChange={(value) => {
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                    trigger(field.name)
                  }}
                  errors={errors as RadiusErrors}
                  name={field.name}
                  value={watch(field.name) as Partial<RadiusState>}
                  {...field.fieldProps}
                />
              ) : null}
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
                      <Text as="span" color="orange.500" display="block" mt={1}>
                        Note: Aspect ratio is ignored when both width and height
                        are specified.
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
          ))}
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
