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
  Tooltip,
  VStack,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PiArrowLeft } from "@react-icons/all-files/pi/PiArrowLeft"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiInfo } from "@react-icons/all-files/pi/PiInfo"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { RiImageEditLine } from "@react-icons/all-files/ri/RiImageEditLine"
import startCase from "lodash/startCase"
import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import type { ColorPickerProps } from "react-best-gradient-color-picker"
import {
  Controller,
  type Control,
  type FieldErrors,
  type SubmitHandler,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormTrigger,
  type UseFormWatch,
  useForm,
} from "react-hook-form"
import Select from "react-select"
import CreateableSelect from "react-select/creatable"
import { z } from "zod/v3"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import type { TransformationField, TransformationItem } from "../../schema"
import {
  DEFAULT_FOCUS_OBJECTS,
  RESIZE_CROP_HELP_TEXT,
  RESIZE_CROP_MODES,
  transformationSchema,
} from "../../schema"
import { type SyncStatus, useEditorStore } from "../../store"
import { isStepAligned } from "../../utils"
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

type FormValues = Record<string, unknown>

/** Error map key used to track Variable Name validation errors per field. */
export const variableNameErrorKey = (fieldName: string): string =>
  `${fieldName}VariableName`

/**
 * Walk a fields list + values object and collect every active variable name
 * (i.e. fields whose `IsVariable` toggle is on, including gradient subfields).
 * Returns `[errorKey, variableName]` pairs. Used for uniqueness validation.
 */
export const collectActiveVariableNames = (
  fields: TransformationField[],
  values: Record<string, unknown>,
): Array<{ errorKey: string; name: string }> => {
  const out: Array<{ errorKey: string; name: string }> = []
  for (const field of fields) {
    if (
      field.fieldType === "gradient-picker" &&
      field.isVariable !== undefined
    ) {
      for (const sub of ["From", "To"] as const) {
        if (values[`${field.name}${sub}IsVariable`] !== true) continue
        const v = values[`${field.name}${sub}VariableName`]
        if (typeof v === "string" && v.trim() !== "") {
          out.push({ errorKey: `${field.name}${sub}VariableName`, name: v.trim() })
        }
      }
      continue
    }
    if (values[`${field.name}IsVariable`] !== true) continue
    const v = values[`${field.name}VariableName`]
    if (typeof v === "string" && v.trim() !== "") {
      out.push({ errorKey: variableNameErrorKey(field.name), name: v.trim() })
    }
  }
  return out
}

/**
 * Walk an arbitrary saved transformation `value` object and collect every
 * active variable name. Unlike `collectActiveVariableNames`, this does not
 * require a field schema — it inspects keys directly, so it works for any
 * transformation in the store (regardless of type). Recurses into
 * `nestedLayers` arrays. Returns lowercased names suitable for set lookup.
 */
const collectVariableNamesFromValue = (
  value: Record<string, unknown> | undefined | null,
): string[] => {
  if (!value || typeof value !== "object") return []
  const out: string[] = []
  for (const key of Object.keys(value)) {
    if (!key.endsWith("IsVariable")) continue
    if (value[key] !== true) continue
    const base = key.slice(0, -"IsVariable".length)
    const nameVal = value[`${base}VariableName`]
    if (typeof nameVal === "string" && nameVal.trim() !== "") {
      out.push(nameVal.trim().toLowerCase())
    }
  }
  const nested = (value as { nestedLayers?: unknown }).nestedLayers
  if (Array.isArray(nested)) {
    for (const layer of nested) {
      if (layer && typeof layer === "object") {
        out.push(
          ...collectVariableNamesFromValue(layer as Record<string, unknown>),
        )
      }
    }
  }
  return out
}

const VariableNameField: React.FC<{
  fieldName: string
  register: UseFormRegister<FormValues>
  error?: string
  onUserChange?: (value: string) => void
}> = ({ fieldName, register, error, onUserChange }) => (
  <FormControl mt={2} isInvalid={!!error}>
    <FormLabel fontSize="sm" mb={2} htmlFor={`${fieldName}-variable-name`}>
      Variable Name
    </FormLabel>
    <Input
      id={`${fieldName}-variable-name`}
      fontSize="sm"
      {...register(`${fieldName}VariableName`, {
        onChange: (e) => onUserChange?.(e.target.value),
      })}
    />
    {error ? (
      <FormErrorMessage fontSize="sm">{error}</FormErrorMessage>
    ) : null}
  </FormControl>
)

type TransformationFieldsProps = {
  fields: TransformationField[]
  values: FormValues
  errors: FieldErrors<FormValues>
  variableFieldErrors: Record<string, string>
  setVariableFieldErrors: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >
  register: UseFormRegister<FormValues>
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
  setValue: UseFormSetValue<FormValues>
  trigger: UseFormTrigger<FormValues>
  setDirtyValue: (name: string, value: unknown) => void
  transformationKey?: string
  focusObjects?: ReadonlyArray<string>
  dataFieldAttr?: string
  dataHasErrorAttr?: string
  /**
   * Returns the auto-fill name to use when a field's "isVariable" toggle is
   * turned on for the first time (i.e. the user hasn't typed a custom value).
   * Receives the field whose toggle is being switched on, and an optional
   * `subfield` qualifier for composite fields (e.g. `"From"` / `"To"` for
   * gradient pickers). Should return a stable, human-readable identifier
   * (e.g. `backgroundColor_3` or `gradientFrom_2`).
   */
  getVariableAutoFillName?: (
    field: TransformationField,
    subfield?: string,
  ) => string
}

const TransformationFields: React.FC<TransformationFieldsProps> = ({
  fields,
  values,
  errors,
  variableFieldErrors,
  setVariableFieldErrors,
  register,
  control,
  watch,
  setValue,
  trigger,
  setDirtyValue,
  transformationKey,
  focusObjects,
  dataFieldAttr = "data-field-name",
  dataHasErrorAttr = "data-has-error",
  getVariableAutoFillName,
}) => {
  const isResizeAndCrop = transformationKey === "resize_and_crop-resize_and_crop"
  return (
    <>
      {fields
        .filter((field) => {
          if (field.isVisible) {
            return field.isVisible(values)
          }
          return true
        })
        .map((field: TransformationField) => {
          const hasError =
            (!!errors[field.name] || !!variableFieldErrors[field.name]) &&
            !["gradient-picker", "padding-input"].some(
              (type) => field.fieldType === type,
            )
          return (
            <FormControl
              key={field.name}
              {...{ [dataFieldAttr]: field.name }}
              {...{ [dataHasErrorAttr]: hasError ? "true" : undefined }}
              isInvalid={hasError}
            >
              <Flex justify="space-between" align="center" mb={2}>
                <FormLabel htmlFor={field.name} fontSize="sm" mb={0}>
                  {field.label}
                </FormLabel>
                {field.isVariable !== undefined &&
                field.fieldType !== "gradient-picker" ? (
                  <Tooltip label="Mark as variable" placement="top" hasArrow>
                    <Switch
                      size="sm"
                      isChecked={watch(`${field.name}IsVariable`) === true}
                      onChange={(e) => {
                        setValue(`${field.name}IsVariable`, e.target.checked, { shouldDirty: true })
                        // Auto-fill the variable name when the toggle is first
                        // turned on and the user hasn't already provided one.
                        if (e.target.checked && getVariableAutoFillName) {
                          const current = watch(`${field.name}VariableName`)
                          if (
                            current === undefined ||
                            current === null ||
                            current === ""
                          ) {
                            setValue(
                              `${field.name}VariableName`,
                              getVariableAutoFillName(field),
                              { shouldDirty: true },
                            )
                          }
                        }
                        setVariableFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next[field.name]
                          delete next[variableNameErrorKey(field.name)]
                          return next
                        })
                        e.target.blur()
                      }}
                      _focus={{ boxShadow: "none" }}
                      _active={{ boxShadow: "none" }}
                    />
                  </Tooltip>
                ) : null}
              </Flex>
              {field.fieldType === "select" ? (
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: controllerField }) => {
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
                <Fragment>
                  <Input
                    id={field.name}
                    fontSize="sm"
                    {...register(field.name, {
                      onChange: (e) => {
                        const val = e.target.value
                        if (
                          field.isDefaultValueRequired &&
                          watch(`${field.name}IsVariable`) === true &&
                          watch(`${field.name}HasDefault`) === true &&
                          (!val || val === "")
                        ) {
                          setVariableFieldErrors((prev) => ({
                            ...prev,
                            [field.name]:
                              "Default value is required when variable is enabled.",
                          }))
                        } else if (variableFieldErrors[field.name]) {
                          setVariableFieldErrors((prev) => {
                            const next = { ...prev }
                            delete next[field.name]
                            return next
                          })
                        }
                      },
                    })}
                    {...(field.fieldProps ?? {})}
                    defaultValue={
                      field.fieldProps?.defaultValue as
                        | string
                        | number
                        | readonly string[]
                        | undefined
                    }
                    disabled={
                      isResizeAndCrop &&
                      field.name === "aspectRatio" &&
                      !!values.width &&
                      !!values.height
                    }
                  />
                </Fragment>
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
                  renderSubfieldVariableToggle={
                    field.isVariable !== undefined
                      ? (subfield) => {
                          const cap = subfield === "from" ? "From" : "To"
                          const isVarKey = `${field.name}${cap}IsVariable`
                          const nameKey = `${field.name}${cap}VariableName`
                          const errKey = nameKey
                          const isOn = watch(isVarKey) === true
                          return (
                            <Tooltip
                              label="Mark as variable"
                              placement="top"
                              hasArrow
                            >
                              <Switch
                                size="sm"
                                isChecked={isOn}
                                onChange={(e) => {
                                  setValue(isVarKey, e.target.checked, {
                                    shouldDirty: true,
                                  })
                                  if (
                                    e.target.checked &&
                                    getVariableAutoFillName
                                  ) {
                                    const current = watch(nameKey)
                                    if (
                                      current === undefined ||
                                      current === null ||
                                      current === ""
                                    ) {
                                      setValue(
                                        nameKey,
                                        getVariableAutoFillName(field, cap),
                                        { shouldDirty: true },
                                      )
                                    }
                                  }
                                  setVariableFieldErrors((prev) => {
                                    const next = { ...prev }
                                    delete next[errKey]
                                    delete next[`${field.name}${cap}`]
                                    return next
                                  })
                                  e.target.blur()
                                }}
                                _focus={{ boxShadow: "none" }}
                                _active={{ boxShadow: "none" }}
                              />
                            </Tooltip>
                          )
                        }
                      : undefined
                  }
                  renderSubfieldVariableNameInput={
                    field.isVariable !== undefined
                      ? (subfield) => {
                          const cap = subfield === "from" ? "From" : "To"
                          const isVarKey = `${field.name}${cap}IsVariable`
                          const errKey = `${field.name}${cap}VariableName`
                          const hasDefaultKey = `${field.name}${cap}HasDefault`
                          const defaultErrKey = `${field.name}${cap}`
                          const isOn = watch(isVarKey) === true
                          if (!isOn) return null
                          return (
                            <>
                              <VariableNameField
                                fieldName={`${field.name}${cap}`}
                                register={register}
                                error={variableFieldErrors[errKey]}
                                onUserChange={(v) => {
                                  if (
                                    v.trim() !== "" &&
                                    variableFieldErrors[errKey]
                                  ) {
                                    setVariableFieldErrors((prev) => {
                                      const next = { ...prev }
                                      delete next[errKey]
                                      return next
                                    })
                                  }
                                }}
                              />
                              {field.isDefaultValueRequired ? (
                                <Flex
                                  justify="space-between"
                                  align="center"
                                  mt={2}
                                >
                                  <FormLabel
                                    fontSize="sm"
                                    mb={0}
                                    htmlFor={`${field.name}-${subfield}-has-default`}
                                  >
                                    Set Default Value
                                  </FormLabel>
                                  <Switch
                                    id={`${field.name}-${subfield}-has-default`}
                                    size="sm"
                                    isChecked={watch(hasDefaultKey) === true}
                                    onChange={(e) => {
                                      setValue(
                                        hasDefaultKey,
                                        e.target.checked,
                                        { shouldDirty: true },
                                      )
                                      if (
                                        !e.target.checked &&
                                        variableFieldErrors[defaultErrKey]
                                      ) {
                                        setVariableFieldErrors((prev) => {
                                          const next = { ...prev }
                                          delete next[defaultErrKey]
                                          return next
                                        })
                                      }
                                      e.target.blur()
                                    }}
                                    _focus={{ boxShadow: "none" }}
                                    _active={{ boxShadow: "none" }}
                                  />
                                </Flex>
                              ) : null}
                            </>
                          )
                        }
                      : undefined
                  }
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
                  errors[field.name as keyof typeof errors]?.message ??
                    variableFieldErrors[field.name] ??
                    "",
                )}
              </FormErrorMessage>
              {field.helpText && (
                <FormHelperText fontSize="sm">
                  {field.helpText}
                  {isResizeAndCrop &&
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
              {field.isVariable !== undefined &&
              field.fieldType !== "gradient-picker" &&
              watch(`${field.name}IsVariable`) === true ? (
                <VariableNameField
                  fieldName={field.name}
                  register={register}
                  error={variableFieldErrors[variableNameErrorKey(field.name)]}
                  onUserChange={(v) => {
                    if (
                      v.trim() !== "" &&
                      variableFieldErrors[variableNameErrorKey(field.name)]
                    ) {
                      setVariableFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next[variableNameErrorKey(field.name)]
                        return next
                      })
                    }
                  }}
                />
              ) : null}
              {field.isDefaultValueRequired &&
              watch(`${field.name}IsVariable`) === true ? (
                <Flex justify="space-between" align="center" mt={2}>
                  <FormLabel
                    fontSize="sm"
                    mb={0}
                    htmlFor={`${field.name}-has-default`}
                  >
                    Set Default Value
                  </FormLabel>
                  <Switch
                    id={`${field.name}-has-default`}
                    size="sm"
                    isChecked={watch(`${field.name}HasDefault`) === true}
                    onChange={(e) => {
                      setValue(`${field.name}HasDefault`, e.target.checked, { shouldDirty: true })
                      if (
                        !e.target.checked &&
                        variableFieldErrors[field.name]
                      ) {
                        setVariableFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next[field.name]
                          return next
                        })
                      }
                      e.target.blur()
                    }}
                    _focus={{ boxShadow: "none" }}
                    _active={{ boxShadow: "none" }}
                  />
                </Flex>
              ) : null}
            </FormControl>
          )
        })}
    </>
  )
}

const NestedLayerForm: React.FC<{
  item: TransformationItem
  onBack: () => void
  initialValues?: Record<string, unknown>
  onApply: (values: Record<string, unknown>) => void
  /**
   * Index of the parent layer transformation in the transformations list.
   * Used to derive auto-fill names for fields inside a nested layer:
   * `${fieldName}_${parentLayerAutoFillIndex+1}_${variableAutoFillIndex+1}`.
   */
  parentLayerAutoFillIndex?: number
  /** Index used to derive auto-fill variable names (nested layer index). */
  variableAutoFillIndex?: number
  /**
   * Variable names that already exist outside this nested layer (parent
   * transformation fields and other nested layers). Used to enforce global
   * uniqueness on apply. Keys are case-folded.
   */
  externalVariableNames?: ReadonlySet<string>
}> = ({
  item,
  onBack,
  initialValues,
  onApply: onApplyProp,
  parentLayerAutoFillIndex,
  variableAutoFillIndex,
  externalVariableNames,
}) => {
  const defaultValues = useMemo(() => {
    const base = item.transformations.reduce(
      (acc, field) => {
        acc[field.name] = field.fieldProps?.defaultValue ?? ""
        return acc
      },
      {} as Record<string, unknown>,
    )
    return { ...base, ...(initialValues ?? {}) }
  }, [item, initialValues])

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
    resolver: zodResolver(item.schema),
    defaultValues,
  })

  const values = watch()

  const setDirtyValue = useCallback(
    (name: string, value: unknown) => {
      setValue(name, value, { shouldDirty: true, shouldTouch: true })
    },
    [setValue],
  )

  const [variableFieldErrors, setVariableFieldErrors] = useState<
    Record<string, string>
  >({})

  const [hasAppliedInSession, setHasAppliedInSession] = useState(false)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )
  const hasUnsyncedChanges = useEditorStore(
    (s) => s.localChangeVersion !== s.lastSyncedVersion,
  )
  const { saveNow } = useTemplateSync()
  const save = useCallback(
    () => saveNow({ reason: "sidebar" }),
    [saveNow],
  )

  const validateVariableFields = useCallback(() => {
    const data = watch()
    const newErrors: Record<string, string> = {}
    for (const field of item.transformations) {
      if (
        field.fieldType === "gradient-picker" &&
        field.isVariable !== undefined
      ) {
        const gradientVal = data[field.name] as
          | { from?: unknown; to?: unknown }
          | undefined
        for (const sub of ["From", "To"] as const) {
          if (data[`${field.name}${sub}IsVariable`] !== true) continue
          const v = data[`${field.name}${sub}VariableName`]
          if (typeof v !== "string" || v.trim() === "") {
            newErrors[`${field.name}${sub}VariableName`] =
              "Variable name is required."
          }
          if (
            field.isDefaultValueRequired &&
            data[`${field.name}${sub}HasDefault`] === true
          ) {
            const colorKey = sub === "From" ? "from" : "to"
            const colorVal = gradientVal?.[colorKey]
            if (!colorVal || colorVal === "") {
              newErrors[`${field.name}${sub}`] =
                "Default value is required when variable is enabled."
            }
          }
        }
        continue
      }
      if (data[`${field.name}IsVariable`] !== true) continue
      const variableName = data[`${field.name}VariableName`]
      if (
        typeof variableName !== "string" ||
        variableName.trim() === ""
      ) {
        newErrors[variableNameErrorKey(field.name)] =
          "Variable name is required."
      }
      if (
        field.isDefaultValueRequired &&
        data[`${field.name}HasDefault`] === true &&
        (!data[field.name] || data[field.name] === "")
      ) {
        newErrors[field.name] =
          "Default value is required when variable is enabled."
      }
    }

    // Cross-field uniqueness: own fields must not collide with each other or
    // with names already used elsewhere in the template. Every occurrence of
    // a duplicate name is flagged so the user sees the error on each input.
    const seen = new Map<string, string>()
    const markDup = (errorKey: string, name: string) => {
      if (!newErrors[errorKey]) {
        newErrors[errorKey] = `Variable name "${name}" must be unique.`
      }
    }
    const flagDup = (errorKey: string, name: string) => {
      const key = name.toLowerCase()
      if (externalVariableNames?.has(key)) {
        markDup(errorKey, name)
        return
      }
      const prevKey = seen.get(key)
      if (prevKey !== undefined) {
        markDup(prevKey, name)
        markDup(errorKey, name)
      } else {
        seen.set(key, errorKey)
      }
    }
    for (const { errorKey, name } of collectActiveVariableNames(
      item.transformations,
      data,
    )) {
      flagDup(errorKey, name)
    }

    setVariableFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [item.transformations, watch, externalVariableNames])

  const onApply: SubmitHandler<Record<string, unknown>> = useCallback(
    (data) => {
      if (!validateVariableFields()) return
      onApplyProp(data)
      // Reset to applied state so isDirty becomes false (visual feedback)
      reset(data, { keepValues: true })
      setHasAppliedInSession(true)
    },
    [onApplyProp, reset, validateVariableFields],
  )

  const onApplyAndClose: SubmitHandler<Record<string, unknown>> = useCallback(
    (data) => {
      if (!validateVariableFields()) return
      onApplyProp(data)
      setHasAppliedInSession(true)
      onBack()
    },
    [onApplyProp, onBack, validateVariableFields],
  )

  const onInvalid = useCallback(() => {
    setTimeout(() => {
      const firstInvalid = document.querySelector<HTMLElement>(
        '[data-nested-field-name][data-nested-has-error="true"]',
      )
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 50)
  }, [])

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
    const submitApply = () => {
      void handleSubmit(onApply, onInvalid)()
    }
    const submitApplyAndClose = () => {
      void handleSubmit(onApplyAndClose, onInvalid)()
    }
    const submitApplyAndSave = () => {
      void handleSubmit((data) => {
        if (!validateVariableFields()) return
        onApplyProp(data)
        reset(data, { keepValues: true })
        setHasAppliedInSession(true)
        void save()
      }, onInvalid)()
    }

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
          primary: { ...footerActionsConfig.primary, onClick: submitApply },
          menuItems: [
            {
              ...footerActionsConfig.menu[0],
              onClick: submitApplyAndClose,
            },
            {
              ...footerActionsConfig.menu[1],
              onClick: submitApplyAndSave,
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
                void save().finally(() => onBack())
              },
            },
          ],
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled,
        }
    }
  }, [
    footerActionsConfig,
    handleSubmit,
    onApply,
    onApplyAndClose,
    onApplyProp,
    onInvalid,
    reset,
    save,
    onBack,
    validateVariableFields,
  ])

  return (
    <SidebarRoot>
      <SidebarHeader>
        <IconButton
          icon={<Icon as={PiArrowLeft} />}
          onClick={onBack}
          variant="ghost"
          size="sm"
          aria-label="Back Button"
        />
        <Text fontSize="md" fontWeight="normal">
          {item.key === "layers-text" ? "Nested Text Layer" : "Nested Image Layer"}
        </Text>
        {(item.description || item.docsLink) && (
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
                {item.description && <Text>{item.description}</Text>}
                {item.docsLink && (
                  <Link
                    fontSize="10px"
                    href={item.docsLink}
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
      </SidebarHeader>
      <SidebarBody gap="6" p="4">
        <TransformationFields
          fields={item.transformations}
          values={values}
          errors={errors}
          register={register}
          control={control}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
          setDirtyValue={setDirtyValue}
          transformationKey={item.key}
          dataFieldAttr="data-nested-field-name"
          dataHasErrorAttr="data-nested-has-error"
          variableFieldErrors={variableFieldErrors}
          setVariableFieldErrors={setVariableFieldErrors}
          getVariableAutoFillName={
            variableAutoFillIndex !== undefined
              ? (field, subfield) => {
                  const parent =
                    parentLayerAutoFillIndex !== undefined
                      ? `_${parentLayerAutoFillIndex + 1}`
                      : ""
                  return `${field.name}${subfield ?? ""}${parent}_${variableAutoFillIndex + 1}`
                }
              : undefined
          }
        />
      </SidebarBody>
      {errors[""] && (
        <Alert status="error" fontSize="sm" px="8" py="2">
          <VStack alignItems="start" justifyContent="space-between">
            <AlertTitle>Invalid transformation</AlertTitle>
            <AlertDescription lineHeight="normal">
              {errors[""]?.message as string}
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
                onBack()
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
    _setPendingOpenNestedLayer,
    _setActiveNestedLayerIndex,
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

  const [nestedLayerEdit, setNestedLayerEdit] = useState<{
    item: TransformationItem
    index: number
  } | null>(null)

  // Reset nested layer when root transformation changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset
  useEffect(() => {
    setNestedLayerEdit(null)
  }, [_internalState.selectedTransformationKey])

  // Honor pending request (from outside the sidebar) to open the nested layer
  // form at a specific index. `pendingOpenNestedLayerIndex === arr.length`
  // means "add a new nested layer at the end".
  useEffect(() => {
    const idx = _internalState.pendingOpenNestedLayerIndex
    const items = selectedTransformation?.nestedLayers?.items
    if (idx !== null && idx !== undefined && items && items[0]) {
      const editId = (
        _internalState.transformationToEdit as
          | { transformationId: string }
          | null
          | undefined
      )?.transformationId
      const editedTr = editId
        ? transformations.find((t) => t.id === editId)
        : undefined
      const editedVal = editedTr?.value as Record<string, unknown> | undefined
      const layers = Array.isArray(editedVal?.nestedLayers)
        ? (editedVal!.nestedLayers as Array<Record<string, unknown>>)
        : []
      const existing = layers[idx]
      const kind =
        existing && typeof existing.__kind === "string"
          ? (existing.__kind as string)
          : "image"
      const match =
        items.find(
          (it) =>
            (kind === "text" && it.key === "layers-text") ||
            (kind === "image" && it.key !== "layers-text"),
        ) ?? items[0]
      setNestedLayerEdit({ item: match, index: idx })
      _setPendingOpenNestedLayer(null)
    }
  }, [
    _internalState.pendingOpenNestedLayerIndex,
    _internalState.transformationToEdit,
    selectedTransformation,
    transformations,
    _setPendingOpenNestedLayer,
  ])

  // Mirror the currently-open nested layer index into the store so other UI
  // surfaces (e.g. the sortable transformation list) can highlight the active
  // nested row alongside its parent.
  useEffect(() => {
    _setActiveNestedLayerIndex(nestedLayerEdit?.index ?? null)
    return () => {
      _setActiveNestedLayerIndex(null)
    }
  }, [nestedLayerEdit, _setActiveNestedLayerIndex])

  // Inverse sync: keep the sidebar's nested-edit pointer in lockstep with
  // the store's active nested layer index.
  // - External index change (e.g. drag-reorder) → update the open form's slot.
  // - External clear to null (e.g. clicking the parent row) → close the
  //   nested form so the parent form is shown.
  useEffect(() => {
    const idx = _internalState.activeNestedLayerIndex
    if (idx === null || idx === undefined) {
      setNestedLayerEdit((prev) => (prev ? null : prev))
      return
    }
    setNestedLayerEdit((prev) =>
      prev && prev.index !== idx ? { ...prev, index: idx } : prev,
    )
  }, [_internalState.activeNestedLayerIndex])

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
          currentValues[field.name] = editedTransformationValue[field.name]
        } else {
          currentValues[field.name] = field.fieldProps?.defaultValue ?? ""
        }

        // Restore variable-field flags saved alongside the field value.
        // Covers both base-field flags (`<name>IsVariable` etc.) and
        // composite-subfield flags such as gradient picker's
        // `<name>FromIsVariable` / `<name>ToVariableName`.
        if (editedTransformationValue) {
          const VAR_SUFFIXES = ["IsVariable", "HasDefault", "VariableName"]
          for (const key of Object.keys(editedTransformationValue)) {
            if (!key.startsWith(field.name)) continue
            if (key === field.name) continue
            if (!VAR_SUFFIXES.some((s) => key.endsWith(s))) continue
            currentValues[key] = editedTransformationValue[key]
          }
        }
      })

      // Preserve nested layer data saved on the transformation so it
      // hydrates back into the form when re-opening a saved template.
      if (
        editedTransformationValue &&
        Array.isArray(editedTransformationValue.nestedLayers)
      ) {
        currentValues.nestedLayers = editedTransformationValue.nestedLayers
      }

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

        updateTransformation(transformationToEdit.transformationId, {
          type: "transformation",
          name: finalName,
          key: selectedTransformation.key,
          value: data,
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

        const transformationId = addTransformation(
          {
            type: "transformation",
            name: displayName,
            key: selectedTransformation.key,
            value: data,
          },
          index + (transformationToEdit.position === "above" ? 0 : 1),
        )

        _setTransformationToEdit(transformationId, "inplace")
      } else {
        const transformationId = addTransformation({
          type: "transformation",
          name: displayName,
          key: selectedTransformation.key,
          value: data,
        })

        _setTransformationToEdit(transformationId, "inplace")
      }

      setHasAppliedInSession(true)
    },
    [
      _internalState.transformationToEdit,
      addTransformation,
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

  const [variableFieldErrors, setVariableFieldErrors] = useState<Record<string, string>>({})

  const validateVariableFields = useCallback(() => {
    if (!selectedTransformation) return true
    const data = watch()
    const newErrors: Record<string, string> = {}
    for (const field of selectedTransformation.transformations) {
      if (
        field.fieldType === "gradient-picker" &&
        field.isVariable !== undefined
      ) {
        const gradientVal = data[field.name] as
          | { from?: unknown; to?: unknown }
          | undefined
        for (const sub of ["From", "To"] as const) {
          if (data[`${field.name}${sub}IsVariable`] !== true) continue
          const v = data[`${field.name}${sub}VariableName`]
          if (typeof v !== "string" || v.trim() === "") {
            newErrors[`${field.name}${sub}VariableName`] =
              "Variable name is required."
          }
          if (
            field.isDefaultValueRequired &&
            data[`${field.name}${sub}HasDefault`] === true
          ) {
            const colorKey = sub === "From" ? "from" : "to"
            const colorVal = gradientVal?.[colorKey]
            if (!colorVal || colorVal === "") {
              newErrors[`${field.name}${sub}`] =
                "Default value is required when variable is enabled."
            }
          }
        }
        continue
      }
      if (data[`${field.name}IsVariable`] !== true) continue
      const variableName = data[`${field.name}VariableName`]
      if (
        typeof variableName !== "string" ||
        variableName.trim() === ""
      ) {
        newErrors[variableNameErrorKey(field.name)] =
          "Variable name is required."
      }
      if (
        field.isDefaultValueRequired &&
        data[`${field.name}HasDefault`] === true &&
        (!data[field.name] || data[field.name] === "")
      ) {
        newErrors[field.name] = "Default value is required when variable is enabled."
      }
    }

    // Cross-field uniqueness check across this transformation AND every nested
    // layer's variable names AND every OTHER transformation already saved in
    // the template. Every occurrence of a duplicate is flagged so the user
    // sees the error on each colliding input.
    const seen = new Map<string, string>()
    const externalNames = new Set<string>()
    for (const t of transformations) {
      if (editedTransformation && t.id === editedTransformation.id) continue
      for (const n of collectVariableNamesFromValue(
        t.value as Record<string, unknown> | undefined,
      )) {
        externalNames.add(n)
      }
    }
    const markDup = (errorKey: string, name: string) => {
      if (!newErrors[errorKey]) {
        newErrors[errorKey] = `Variable name "${name}" must be unique.`
      }
    }
    const flagDup = (errorKey: string, name: string) => {
      const key = name.toLowerCase()
      if (externalNames.has(key)) {
        markDup(errorKey, name)
        return
      }
      const prevKey = seen.get(key)
      if (prevKey !== undefined) {
        markDup(prevKey, name)
        markDup(errorKey, name)
      } else {
        seen.set(key, errorKey)
      }
    }
    for (const { errorKey, name } of collectActiveVariableNames(
      selectedTransformation.transformations,
      data,
    )) {
      flagDup(errorKey, name)
    }
    const nestedItem = selectedTransformation.nestedLayers?.items?.[0]
    if (nestedItem) {
      const layers = (data.nestedLayers as
        | Array<Record<string, unknown>>
        | undefined) ?? []
      layers.forEach((layer, layerIdx) => {
        if (!layer || typeof layer !== "object") return
        for (const { errorKey, name } of collectActiveVariableNames(
          nestedItem.transformations,
          layer,
        )) {
          // Prefix nested error keys with the layer index so they don't collide
          // with parent error keys (and so the nested form can map them back).
          flagDup(`nested:${layerIdx}:${errorKey}`, name)
        }
      })
    }

    setVariableFieldErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [selectedTransformation, watch, transformations, editedTransformation])

  const hasVariableErrors = Object.keys(variableFieldErrors).length > 0

  const footerActions = useMemo(() => {
    const noop = () => {}
    const applySubmit = () => {
      if (!validateVariableFields()) return
      void handleSubmit(onSubmit())()
    }
    const applyCloseSubmit = () => {
      if (!validateVariableFields()) return
      void handleSubmit(onSubmit(true))()
    }
    const applySaveSubmit = () => {
      if (!validateVariableFields()) return
      void handleSubmit((data) => {
        onApply(data)
        void save()
      })()
    }

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
            disabled: footerActionsConfig.primary.disabled || hasVariableErrors,
            onClick: () => {
              void applySubmit()
            },
          },
          menuItems: [
            {
              ...footerActionsConfig.menu[0],
              disabled: footerActionsConfig.menu[0].disabled || hasVariableErrors,
              onClick: () => {
                void applyCloseSubmit()
              },
            },
            {
              ...footerActionsConfig.menu[1],
              disabled: footerActionsConfig.menu[1].disabled || hasVariableErrors,
              onClick: () => {
                void applySaveSubmit()
              },
            },
          ],
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled || hasVariableErrors,
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
  }, [footerActionsConfig, handleSubmit, onSubmit, onApply, save, onClose, validateVariableFields, hasVariableErrors])

  if (!selectedTransformation) {
    return null
  }

  // Index of the transformation currently being edited (0-based) in the
  // transformations list. Used to derive auto-fill variable names
  // (e.g. `backgroundColor_3` for the 3rd transformation). When adding a new
  // transformation, falls back to the next available slot.
  const editedTransformationIndex = editedTransformation
    ? transformations.findIndex((t) => t.id === editedTransformation.id)
    : transformations.length

  if (nestedLayerEdit) {
    const allLayers =
      (watch("nestedLayers") as Array<Record<string, unknown>> | undefined) ?? []
    const existing = allLayers[nestedLayerEdit.index] as
      | Record<string, unknown>
      | undefined
    // Strip internal meta from initialValues — meta is preserved on save below.
    const initialValues = existing
      ? Object.fromEntries(
          Object.entries(existing).filter(
            ([k]) => k !== "__name" && k !== "__hidden" && k !== "__kind",
          ),
        )
      : undefined

    // Collect every variable name currently in use elsewhere in the template
    // (parent fields + sibling nested layers + every OTHER saved transformation)
    // so the nested form can detect collisions before applying.
    const externalVariableNames = new Set<string>()
    const parentValues = watch()
    for (const { name } of collectActiveVariableNames(
      selectedTransformation.transformations,
      parentValues,
    )) {
      externalVariableNames.add(name.toLowerCase())
    }
    const nestedItem = selectedTransformation.nestedLayers?.items?.[0]
    if (nestedItem) {
      allLayers.forEach((layer, layerIdx) => {
        if (layerIdx === nestedLayerEdit.index) return
        if (!layer || typeof layer !== "object") return
        for (const { name } of collectActiveVariableNames(
          nestedItem.transformations,
          layer,
        )) {
          externalVariableNames.add(name.toLowerCase())
        }
      })
    }
    for (const t of transformations) {
      if (editedTransformation && t.id === editedTransformation.id) continue
      for (const n of collectVariableNamesFromValue(
        t.value as Record<string, unknown> | undefined,
      )) {
        externalVariableNames.add(n)
      }
    }

    return (
      <NestedLayerForm
        key={`nested-${selectedTransformation.key}-${nestedLayerEdit.item.key}-${nestedLayerEdit.index}`}
        item={nestedLayerEdit.item}
        onBack={() => setNestedLayerEdit(null)}
        initialValues={initialValues}
        variableAutoFillIndex={nestedLayerEdit.index}
        parentLayerAutoFillIndex={
          editedTransformationIndex >= 0
            ? editedTransformationIndex
            : undefined
        }
        externalVariableNames={externalVariableNames}
        onApply={(nestedValues) => {
          // Preserve previously stored meta (__name / __hidden) for this index.
          const prevMeta: Record<string, unknown> = {}
          if (existing) {
            if (existing.__name !== undefined) prevMeta.__name = existing.__name
            if (existing.__hidden !== undefined)
              prevMeta.__hidden = existing.__hidden
          }
          const kind =
            nestedLayerEdit.item.key === "layers-text" ? "text" : "image"
          const nextLayer = { ...nestedValues, ...prevMeta, __kind: kind }
          const nextLayers = [...allLayers]
          nextLayers[nestedLayerEdit.index] = nextLayer
          setDirtyValue("nestedLayers", nextLayers)
          // Commit merged parent form data to the store so recomputeImages runs.
          onApply({ ...watch(), nestedLayers: nextLayers })
        }}
      />
    )
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
        <TransformationFields
          fields={selectedTransformation.transformations}
          values={values}
          errors={errors}
          variableFieldErrors={variableFieldErrors}
          setVariableFieldErrors={setVariableFieldErrors}
          register={register}
          control={control}
          watch={watch}
          setValue={setValue}
          trigger={trigger}
          setDirtyValue={setDirtyValue}
          transformationKey={selectedTransformation.key}
          focusObjects={focusObjects}
          getVariableAutoFillName={(field, subfield) =>
            selectedTransformation.nestedLayers
              ? `${field.name}${subfield ?? ""}_${editedTransformationIndex + 1}`
              : `${field.name}${subfield ?? ""}`
          }
        />
        {selectedTransformation?.nestedLayers && (
          <Box mt={4}>
            <Text color="gray.500" fontSize="md" px="2" py="2">
              {selectedTransformation.nestedLayers.name}
            </Text>
            <VStack spacing={0} align="stretch" p="0">
              {selectedTransformation.nestedLayers.items.map((nestedItem) => (
                <Button
                  key={nestedItem.key}
                  onClick={async () => {
                    const valid = await trigger()
                    const variablesValid = validateVariableFields()
                    if (valid && variablesValid) {
                      // Append a new nested layer at the end of the array.
                      const existing =
                        (watch("nestedLayers") as
                          | Array<Record<string, unknown>>
                          | undefined) ?? []
                      setNestedLayerEdit({
                        item: nestedItem,
                        index: existing.length,
                      })
                      return
                    }
                    // Wait for React to render error state, then scroll
                    setTimeout(() => {
                      const firstInvalid = document.querySelector<HTMLElement>(
                        '[data-has-error="true"]',
                      )
                      if (firstInvalid) {
                        firstInvalid.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        })
                      }
                    }, 50)
                  }}
                  justifyContent="flex-start"
                  variant="outline"
                  borderRadius="0"
                  borderWidth="0px 0px 1px 0px"
                  borderColor="editorBattleshipGrey.100"
                  py="5"
                  sx={{
                    "&:last-of-type": {
                      borderBottomWidth: "0px",
                    },
                  }}
                  leftIcon={<Icon color="gray.500" as={RiImageEditLine} />}
                >
                  <Text fontSize="sm" fontWeight="normal">
                    {nestedItem.name}
                  </Text>
                </Button>
              ))}
            </VStack>
          </Box>
        )}
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
