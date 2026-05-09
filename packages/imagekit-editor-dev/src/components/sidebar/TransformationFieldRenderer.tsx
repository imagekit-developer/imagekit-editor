import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Textarea,
} from "@chakra-ui/react"
import { PiFolderOpen } from "@react-icons/all-files/pi/PiFolderOpen"
import startCase from "lodash/startCase"
import { type FC, type ReactNode, useCallback } from "react"
import type { ColorPickerProps } from "react-best-gradient-color-picker"
import type { FieldErrors } from "react-hook-form"
import Select from "react-select"
import CreateableSelect from "react-select/creatable"
import type { TransformationField } from "../../schema"
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

/**
 * Option shape for `select` / `select-creatable` field types. Mirrors the
 * `fieldProps.options` entries declared in the transformation schema.
 */
export interface FieldOption {
  value: string
  label: string
  icon?: ReactNode
}

export interface TransformationFieldRendererProps {
  /** The schema field metadata (label, fieldType, fieldProps, …). */
  field: TransformationField
  /** Current value (typed by the field's Zod schema). */
  value: unknown
  /** Called whenever the user mutates the value. */
  onChange: (value: unknown) => void
  /** Optional blur callback (used by inputs that need RHF blur tracking). */
  onBlur?: () => void
  /**
   * The full RHF errors object, used only by composite fields
   * (`gradient-picker`, `padding-input`, `distort-perspective-input`,
   * `radius-input`) which look up sub-keys themselves. Plain inputs ignore it.
   */
  errors?: FieldErrors
  /** Force-disable the underlying control (e.g. aspectRatio when w+h set). */
  disabled?: boolean
  /**
   * Override the `select` options. The sidebar uses this to inject the live
   * `focusObjects` list from the store when rendering the `focusObject` field;
   * everywhere else this is undefined and the schema-declared options apply.
   */
  selectOptionsOverride?: FieldOption[]
  /**
   * Called after a composite-field commit to ask RHF to re-run validation.
   * Used by `padding-input`, `distort-perspective-input`, `radius-input`.
   * No-op when omitted.
   */
  onTrigger?: () => void
  /**
   * Override the `id` attribute placed on the underlying input element.
   * Defaults to `field.name`. Hosts rendering multiple rows of the same
   * template (e.g. a creative-automation override grid) must pass a unique
   * id per row — otherwise every row shares the same `id` and clicking any
   * label scrolls the browser to the first row's input.
   *
   * `VariableField` derives this automatically from its `idPrefix` prop;
   * the sidebar never needs to set it (each field renders exactly once).
   */
  inputId?: string
  /**
   * Async picker invoked when the user clicks the folder icon on an image
   * path field (currently `imageUrl` of the image layer). When omitted, no
   * icon is rendered and the field behaves as a plain text input — callers
   * can still type a path manually. See `OnPickImage` in the store for the
   * resolution contract.
   */
  onPickImage?: () => Promise<string | null | undefined>
}

/**
 * Render the input control for a single `TransformationField` as a controlled
 * component (`value` / `onChange`). Extracted from the transformation config
 * sidebar so the same per-field render logic can drive both the editor and the
 * host-side `VariableField` used in spreadsheet-style override grids.
 *
 * Behavior is intentionally identical to the sidebar's previous inline switch:
 * any visual or validation discrepancy here would surface as a diff between
 * authoring (editor) and runtime (host overrides), which is exactly the failure
 * mode the variables feature exists to prevent.
 *
 * Wraps no `FormControl`, label, error message, or help text — the caller
 * decides how to surround the input. Composite fields that already render
 * their own error UI (gradient/padding/perspective/radius) receive the full
 * `errors` object verbatim.
 */
export const TransformationFieldRenderer: FC<
  TransformationFieldRendererProps
> = ({
  field,
  value,
  onChange,
  onBlur,
  errors,
  disabled,
  selectOptionsOverride,
  onTrigger,
  inputId,
  onPickImage,
}) => {
  const resolvedId = inputId ?? field.name
  // ColorPickerField / GradientPicker call `setValue(name, value)` inside
  // useEffect with `setValue` in their dep array. If we hand them a fresh
  // closure on every render, that effect fires every render and the field
  // loops forever (Maximum update depth exceeded). Memoize the adapter so
  // identity is stable across renders for the same `onChange`.
  const setValueAdapter = useCallback(
    (_name: string, v: unknown) => onChange(v),
    [onChange],
  )
  switch (field.fieldType) {
    case "select": {
      const options =
        selectOptionsOverride ??
        field.fieldProps?.options?.map((option) => ({
          value: option.value,
          label: option.label,
        }))
      const isCreatable = field.fieldProps?.isCreatable === true
      const isClearable: boolean = field.fieldProps?.isClearable ?? false

      const selectedValue = isCreatable
        ? options?.find((o) => o.value === value) ||
          (value
            ? { value: value as string, label: startCase(value as string) }
            : null)
        : options?.find((o) => o.value === value)

      const selectStyles = {
        control: (base: Record<string, unknown>) => ({
          ...base,
          fontSize: "12px",
          minHeight: "32px",
          borderColor: "#E2E8F0",
        }),
        menu: (base: Record<string, unknown>) => ({
          ...base,
          zIndex: 10,
        }),
        option: (base: Record<string, unknown>) => ({
          ...base,
          fontSize: "12px",
        }),
      }

      return isCreatable ? (
        <CreateableSelect
          id={resolvedId}
          formatCreateLabel={(inputValue: string) => `Use "${inputValue}"`}
          isClearable={isClearable}
          placeholder="Select"
          menuPlacement="auto"
          options={options}
          value={selectedValue}
          onChange={(o) => onChange(o?.value)}
          onBlur={onBlur}
          styles={selectStyles}
        />
      ) : (
        <Select
          id={resolvedId}
          isClearable={isClearable}
          placeholder="Select"
          menuPlacement="auto"
          options={options}
          value={selectedValue}
          onChange={(o) => onChange(o?.value)}
          onBlur={onBlur}
          styles={selectStyles}
        />
      )
    }

    case "select-creatable":
      return (
        <CreateableSelect
          id={resolvedId}
          placeholder="Select"
          menuPlacement="auto"
          options={field.fieldProps?.options?.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={field.fieldProps?.options?.find((o) => o.value === value)}
          onChange={(o) => onChange(o?.value)}
          onBlur={onBlur}
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

    case "input": {
      // chakra Input + react-hook-form's spread props create a too-complex
      // union for TS to fully unify; this is a tsserver-only warning and
      // does not affect the build. Behavior is identical to the sidebar's
      // previous inline implementation.
      const showImagePicker =
        field.name === "imageUrl" && typeof onPickImage === "function"
      const inputEl = (
        <Input
          id={resolvedId}
          fontSize="sm"
          {...(field.fieldProps ?? {})}
          value={(value as string | number | readonly string[]) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          pr={showImagePicker ? "2.5rem" : undefined}
        />
      )
      if (!showImagePicker) return inputEl
      return (
        <InputGroup>
          {inputEl}
          <InputRightElement>
            <IconButton
              aria-label="Pick image"
              icon={<PiFolderOpen />}
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  const picked = await onPickImage?.()
                  if (picked) onChange(picked)
                } catch {
                  // Host picker errors are theirs to surface; the editor
                  // intentionally swallows them so a rejected promise can
                  // never break the sidebar form.
                }
              }}
              tabIndex={-1}
            />
          </InputRightElement>
        </InputGroup>
      )
    }

    case "textarea":
      return (
        <Textarea
          id={resolvedId}
          fontSize="sm"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )

    case "switch":
      return (
        <Switch
          id={resolvedId}
          fontSize="sm"
          isChecked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
        />
      )

    case "slider":
      return (
        <SliderControl
          field={field}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      )

    case "color-picker":
      return (
        <ColorPickerField
          fieldName={field.name}
          value={(value as string) ?? ""}
          setValue={setValueAdapter}
          fieldProps={field.fieldProps as ColorPickerProps}
          isClearable={field.fieldProps?.isClearable ?? false}
        />
      )

    case "gradient-picker":
      return (
        <GradientPicker
          fieldName={field.name}
          value={value as GradientPickerState}
          setValue={setValueAdapter}
          errors={errors ?? {}}
        />
      )

    case "anchor":
      return (
        <AnchorField
          value={value as string}
          positions={field.fieldProps?.positions as string[]}
          onChange={onChange}
        />
      )

    case "radio-card":
      return (
        <RadioCardField
          value={value as string}
          options={field.fieldProps?.options ?? []}
          onChange={onChange}
          {...field.fieldProps}
        />
      )

    case "checkbox-card":
      return (
        <CheckboxCardField
          value={value as string[]}
          options={field.fieldProps?.options ?? []}
          onChange={onChange}
          {...field.fieldProps}
        />
      )

    case "padding-input":
      return (
        <PaddingInputField
          name={field.name}
          value={value as Partial<PaddingState>}
          onChange={(v) => {
            onChange(v)
            onTrigger?.()
          }}
          errors={(errors as PaddingErrors) ?? ({} as PaddingErrors)}
          {...field.fieldProps}
        />
      )

    case "zoom":
      return (
        <ZoomInput
          value={value as number}
          onChange={onChange}
          defaultValue={
            typeof field.fieldProps?.defaultValue === "number"
              ? (field.fieldProps.defaultValue as number)
              : undefined
          }
        />
      )

    case "distort-perspective-input":
      return (
        <DistortPerspectiveInput
          name={field.name}
          value={value as PerspectiveObject}
          onChange={(v) => {
            onChange(v)
            onTrigger?.()
          }}
          errors={(errors as PerspectiveErrors) ?? ({} as PerspectiveErrors)}
          {...field.fieldProps}
        />
      )

    case "radius-input":
      return (
        <RadiusInputField
          name={field.name}
          value={value as Partial<RadiusState>}
          onChange={(v) => {
            onChange(v)
            onTrigger?.()
          }}
          errors={(errors as RadiusErrors) ?? ({} as RadiusErrors)}
          {...field.fieldProps}
        />
      )

    default:
      return null
  }
}

/**
 * Slider control extracted into its own component so the controlled
 * value <-> string normalization (auto, negative-N notation, step alignment,
 * min/max clamp) stays self-contained. Behavior must remain bit-identical to
 * the previous inline implementation in the sidebar — see the matching
 * onBlur / onChange branches preserved verbatim below.
 */
const SliderControl: FC<{
  field: TransformationField
  value: unknown
  onChange: (v: unknown) => void
  onBlur?: () => void
}> = ({ field, value, onChange, onBlur }) => {
  const setVal = (v: unknown) => onChange(v)
  const valueString = (value as string) ?? ""

  return (
    <Box pt={2} pb={2}>
      <Flex justify="space-between" mb={1}>
        <Input
          id={`${field.name}-input`}
          type={
            field.fieldProps?.inputType || field.fieldProps?.autoOption
              ? "text"
              : "number"
          }
          fontSize="sm"
          width="80px"
          value={valueString}
          onBlur={() => {
            onBlur?.()
            const raw = value
            const n = Number(String(raw).toUpperCase().replace(/^N/, "-"))
            const isNumberWithN =
              typeof raw === "string" &&
              !Number.isNaN(n) &&
              raw.toUpperCase().startsWith("N")
            if (!Number.isFinite(n)) return

            const { step, min, max, skipStepCheck } = field.fieldProps ?? {}
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
            setVal(finalValue)
          }}
          onChange={(e) => {
            const val = e.target.value
            const numSafeVal = String(val).toUpperCase().replace(/^N/, "-")
            const isNumberWithN =
              typeof val === "string" &&
              !Number.isNaN(Number(numSafeVal)) &&
              val.toUpperCase().startsWith("N")

            if (val === "") {
              setVal("")
              return
            }

            if (val === "-") {
              setVal("-")
              return
            }

            if (field.fieldProps?.autoOption && val.match(/au?t?o?/i)) {
              setVal("auto")
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
              setVal(finalVal)
            } else if (
              field.fieldProps?.max !== undefined &&
              Number(numSafeVal) > field.fieldProps.max
            ) {
              setVal(field.fieldProps.max)
            } else {
              setVal(val)
            }
          }}
        />
        {field.fieldProps?.autoOption && (
          <Button
            size="sm"
            colorScheme={value === "auto" ? "blue" : "gray"}
            onClick={() => setVal("auto")}
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
            Number(String(valueString).toUpperCase().replace(/^N/, "-")),
          )
            ? 0
            : Number(String(valueString).toUpperCase().replace(/^N/, "-"))
        }
        defaultValue={field.fieldProps?.defaultValue as number}
        onChange={(val) => setVal(val.toString())}
        focusThumbOnChange={false}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb borderColor="blue.500" border="1px" />
      </Slider>
    </Box>
  )
}
