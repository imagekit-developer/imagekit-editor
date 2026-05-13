import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react"
import startCase from "lodash/startCase"
import { Fragment } from "react"
import type { ColorPickerProps } from "react-best-gradient-color-picker"
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormTrigger,
  type UseFormWatch,
} from "react-hook-form"
import Select from "react-select"
import CreateableSelect from "react-select/creatable"
import { DEFAULT_FOCUS_OBJECTS, type TransformationField } from "../../schema"
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

type FormValues = Record<string, unknown>

export interface TransformationFieldsProps {
  fields: TransformationField[]
  values: FormValues
  errors: FieldErrors<FormValues>
  register: UseFormRegister<FormValues>
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
  setValue: UseFormSetValue<FormValues>
  trigger: UseFormTrigger<FormValues>
  setDirtyValue: (name: string, value: unknown) => void
  /** Optional variable-field error state (only used by the top-level form). */
  variableFieldErrors?: Record<string, string>
  setVariableFieldErrors?: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >
  /** Focus object list (for `focusObject` select). */
  focusObjects?: ReadonlyArray<string>
  /** The transformation key — used to enable resize-and-crop specific UI. */
  transformationKey?: string
  /** Resize-and-crop only: full form values for the aspectRatio disable logic. */
  resizeCropWidth?: unknown
  resizeCropHeight?: unknown
  /** Data attribute names so parent/nested can co-exist when scrolling to errors. */
  dataFieldAttr?: string
  dataHasErrorAttr?: string
}

export const TransformationFields: React.FC<TransformationFieldsProps> = ({
  fields,
  values,
  errors,
  register,
  control,
  watch,
  setValue,
  trigger,
  setDirtyValue,
  variableFieldErrors,
  setVariableFieldErrors,
  focusObjects,
  transformationKey,
  resizeCropWidth,
  resizeCropHeight,
  dataFieldAttr = "data-field-name",
  dataHasErrorAttr = "data-has-error",
}) => {
  const variableErrors = variableFieldErrors ?? {}
  const noopSetVariableErrors: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  > =
    setVariableFieldErrors ??
    (() => {
      /* no-op when variable fields are disabled */
    })

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
            (!!errors[field.name] || !!variableErrors[field.name]) &&
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
                {field.isVariable !== undefined ? (
                  <Switch
                    size="sm"
                    isChecked={watch(`${field.name}IsVariable`) === true}
                    onChange={(e) => {
                      setValue(`${field.name}IsVariable`, e.target.checked, { shouldDirty: true })
                      noopSetVariableErrors((prev) => {
                        const next = { ...prev }
                        delete next[field.name]
                        return next
                      })
                      e.target.blur()
                    }}
                    _focus={{ boxShadow: "none" }}
                    _active={{ boxShadow: "none" }}
                  />
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
                          noopSetVariableErrors((prev) => ({
                            ...prev,
                            [field.name]:
                              "Default value is required when variable is enabled.",
                          }))
                        } else if (variableErrors[field.name]) {
                          noopSetVariableErrors((prev) => {
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
                      transformationKey === "resize_and_crop-resize_and_crop" &&
                      field.name === "aspectRatio" &&
                      !!resizeCropWidth &&
                      !!resizeCropHeight
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
                    variableErrors[field.name] ??
                    "",
                )}
              </FormErrorMessage>
              {field.helpText && (
                <FormHelperText fontSize="sm">
                  {field.helpText}
                  {transformationKey === "resize_and_crop-resize_and_crop" &&
                    field.name === "aspectRatio" &&
                    resizeCropWidth &&
                    resizeCropHeight && (
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
              {field.isDefaultValueRequired &&
              watch(`${field.name}IsVariable`) === true ? (
                <Flex justify="space-between" align="center" mt={2}>
                  <FormLabel fontSize="sm" mb={0}>
                    Set Default Value
                  </FormLabel>
                  <Switch
                    size="sm"
                    isChecked={watch(`${field.name}HasDefault`) === true}
                    onChange={(e) => {
                      setValue(`${field.name}HasDefault`, e.target.checked, { shouldDirty: true })
                      if (
                        !e.target.checked &&
                        variableErrors[field.name]
                      ) {
                        noopSetVariableErrors((prev) => {
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
