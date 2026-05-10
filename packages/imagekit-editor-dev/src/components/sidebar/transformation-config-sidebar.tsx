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
import { PiInfo } from "@react-icons/all-files/pi/PiInfo"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
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
import {
  type SyncStatus,
  type TemplateAutomationVariable,
  useEditorStore,
} from "../../store"
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

type NestedLayerKey = "layers-text" | "layers-image"

type NestedLayerValue = {
  key: NestedLayerKey
  name?: string
  type?: "transformation"
  value?: Record<string, unknown>
  version?: string
  enabled?: boolean
}

const NESTED_LAYER_KEYS: NestedLayerKey[] = ["layers-text", "layers-image"]
const MAX_NESTED_UI_DEPTH = 5
const SIMPLE_VARIABLE_FIELD_TYPES = new Set([
  "input",
  "textarea",
  "switch",
  "select",
  "select-creatable",
  "slider",
  "color-picker",
  "anchor",
  "radio-card",
  "checkbox-card",
  "zoom",
])

type VariableCandidate = {
  fieldName: string
  valuePath: string
  label: string
  fieldType?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function startCasePath(path: string): string {
  return path
    .split(".")
    .map((segment) => startCase(segment))
    .join(" / ")
}

function getFieldVariableCandidates(
  field: TransformationField,
  value: unknown,
): VariableCandidate[] {
  const fieldType = field.fieldType
  const makeCandidate = (valuePath: string, label = field.label) => ({
    fieldName: field.name,
    valuePath,
    label,
    fieldType,
  })

  if (fieldType === "radius-input") {
    const mode = isRecord(value) ? value.mode : undefined
    if (mode === "individual") {
      return ["topLeft", "topRight", "bottomRight", "bottomLeft"].map((key) =>
        makeCandidate(
          `${field.name}.radius.${key}`,
          `${field.label} ${startCase(key)}`,
        ),
      )
    }
    return [makeCandidate(`${field.name}.radius`)]
  }

  if (fieldType === "padding-input") {
    const mode = isRecord(value) ? value.mode : undefined
    if (mode === "individual") {
      return ["top", "right", "bottom", "left"].map((key) =>
        makeCandidate(
          `${field.name}.padding.${key}`,
          `${field.label} ${startCase(key)}`,
        ),
      )
    }
    return [makeCandidate(`${field.name}.padding`)]
  }

  if (fieldType === "gradient-picker") {
    return ["from", "to", "direction", "stopPoint"].map((key) =>
      makeCandidate(`${field.name}.${key}`, `${field.label} ${startCase(key)}`),
    )
  }

  if (fieldType === "distort-perspective-input") {
    return ["x1", "y1", "x2", "y2", "x3", "y3", "x4", "y4"].map((key) =>
      makeCandidate(
        `${field.name}.${key}`,
        `${field.label} ${key.toUpperCase()}`,
      ),
    )
  }

  if (fieldType && SIMPLE_VARIABLE_FIELD_TYPES.has(fieldType)) {
    return [makeCandidate(field.name)]
  }

  return []
}

function makeVariableId(valuePath: string): string {
  const sanitizedPath = valuePath.replace(/[^a-zA-Z0-9]+/g, "-")
  return `var-${sanitizedPath}-${Date.now()}`
}

type AutomationVariableButtonProps = {
  candidates: VariableCandidate[]
  variables: TemplateAutomationVariable[]
  isDisabled: boolean
  onSave(candidate: VariableCandidate, label: string): void
  onRemove(valuePath: string): void
}

function AutomationVariableButton({
  candidates,
  variables,
  isDisabled,
  onSave,
  onRemove,
}: AutomationVariableButtonProps) {
  const variableByPath = useMemo(
    () => new Map(variables.map((variable) => [variable.valuePath, variable])),
    [variables],
  )
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    setDraftLabels(
      candidates.reduce<Record<string, string>>((acc, candidate) => {
        acc[candidate.valuePath] =
          variableByPath.get(candidate.valuePath)?.label ?? candidate.label
        return acc
      }, {}),
    )
  }, [candidates, variableByPath])

  if (!candidates.length) {
    return null
  }

  const assignedCount = candidates.filter((candidate) =>
    variableByPath.has(candidate.valuePath),
  ).length

  return (
    <Popover placement="bottom-end" isLazy lazyBehavior="unmount">
      <PopoverTrigger>
        <Button
          size="xs"
          variant={assignedCount ? "solid" : "outline"}
          colorScheme={assignedCount ? "blue" : "gray"}
          isDisabled={isDisabled}
        >
          {assignedCount ? `Variable ${assignedCount}` : "Variable"}
        </Button>
      </PopoverTrigger>
      <PopoverContent w="280px">
        <PopoverBody>
          <VStack align="stretch" spacing={3}>
            {isDisabled ? (
              <Text fontSize="xs" color="gray.600">
                Apply this transformation before assigning variables.
              </Text>
            ) : null}
            {candidates.map((candidate) => {
              const existing = variableByPath.get(candidate.valuePath)
              const draftLabel =
                draftLabels[candidate.valuePath] ?? candidate.label
              return (
                <Box key={candidate.valuePath}>
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    {startCasePath(candidate.valuePath)}
                  </Text>
                  <HStack spacing={2}>
                    <Input
                      size="sm"
                      value={draftLabel}
                      placeholder="Variable label"
                      onChange={(event) =>
                        setDraftLabels((previous) => ({
                          ...previous,
                          [candidate.valuePath]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      colorScheme="blue"
                      isDisabled={!draftLabel.trim()}
                      onClick={() => onSave(candidate, draftLabel.trim())}
                    >
                      {existing ? "Save" : "Add"}
                    </Button>
                  </HStack>
                  {existing ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      mt={1}
                      onClick={() => onRemove(candidate.valuePath)}
                    >
                      Remove variable
                    </Button>
                  ) : null}
                </Box>
              )
            })}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

function getLayerTransformationItem(key: string) {
  return transformationSchema
    .find((category) => category.key === "layers")
    ?.items.find((item) => item.key === key)
}

function getNestedFieldDefault(field: TransformationField): unknown {
  return field.fieldProps?.defaultValue ?? ""
}

function makeNestedLayer(key: NestedLayerKey): NestedLayerValue {
  const item = getLayerTransformationItem(key)
  const value =
    item?.transformations.reduce<Record<string, unknown>>((acc, field) => {
      if (field.name !== "nestedLayers") {
        acc[field.name] = getNestedFieldDefault(field)
      }
      return acc
    }, {}) ?? {}

  return {
    key,
    name: item?.name ?? key,
    type: "transformation",
    value,
  }
}

function normalizeNestedLayers(value: unknown): NestedLayerValue[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (layer): layer is NestedLayerValue =>
      isRecord(layer) &&
      NESTED_LAYER_KEYS.includes(layer.key as NestedLayerKey),
  )
}

type NestedLayerFieldProps = {
  field: TransformationField
  value: unknown
  values: Record<string, unknown>
  onChange: (value: unknown) => void
  focusObjects?: ReadonlyArray<string>
  depth: number
  valuePathPrefix: string
  automationVariables: TemplateAutomationVariable[]
  isVariableDisabled: boolean
  onSaveAutomationVariable: (
    candidate: VariableCandidate,
    label: string,
  ) => void
  onRemoveAutomationVariable: (valuePath: string) => void
}

function NestedLayerField({
  field,
  value,
  values,
  onChange,
  focusObjects,
  depth,
  valuePathPrefix,
  automationVariables,
  isVariableDisabled,
  onSaveAutomationVariable,
  onRemoveAutomationVariable,
}: NestedLayerFieldProps) {
  const normalizedValue =
    field.fieldType === "color-picker" && typeof value !== "string" ? "" : value
  const latestOnChangeRef = useRef(onChange)
  const latestValueRef = useRef(normalizedValue)

  useEffect(() => {
    latestOnChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    latestValueRef.current = normalizedValue
  }, [normalizedValue])

  const setNestedColorValue = useCallback(
    (_name: string, nextValue: string) => {
      if (latestValueRef.current === nextValue) return
      latestOnChangeRef.current(nextValue)
    },
    [],
  )

  const commonInputProps = {
    id: `nested-${depth}-${field.name}`,
    fontSize: "sm",
  }

  if (field.fieldType === "input") {
    return (
      <Input
        {...commonInputProps}
        value={(value as string | number | undefined) ?? ""}
        onChange={(event) => onChange(event.target.value)}
        {...(field.fieldProps ?? {})}
      />
    )
  }

  if (field.fieldType === "textarea") {
    return (
      <Textarea
        {...commonInputProps}
        value={(value as string | undefined) ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.fieldType === "switch") {
    return (
      <Switch
        id={`nested-${depth}-${field.name}`}
        isChecked={value === true}
        onChange={(event) => onChange(event.target.checked)}
      />
    )
  }

  if (field.fieldType === "select" || field.fieldType === "select-creatable") {
    const selectOptions =
      field.name === "focusObject"
        ? (focusObjects || DEFAULT_FOCUS_OBJECTS).map((obj) => ({
            value: obj,
            label: startCase(obj),
          }))
        : field.fieldProps?.options?.map((option) => ({
            value: option.value,
            label: option.label,
          }))
    const selectedValue =
      selectOptions?.find((option) => option.value === value) ||
      (value
        ? {
            value: value as string,
            label: startCase(value as string),
          }
        : null)
    const selectProps = {
      id: `nested-${depth}-${field.name}`,
      placeholder: "Select",
      menuPlacement: "auto" as const,
      options: selectOptions,
      value: selectedValue,
      onChange: (selectedOption: { value: string } | null) =>
        onChange(selectedOption?.value ?? ""),
      styles: {
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
      },
    }

    return field.fieldType === "select-creatable" ||
      field.fieldProps?.isCreatable === true ? (
      <CreateableSelect
        {...selectProps}
        formatCreateLabel={(inputValue: string) => `Use "${inputValue}"`}
        isClearable={field.fieldProps?.isClearable ?? false}
      />
    ) : (
      <Select
        {...selectProps}
        isClearable={field.fieldProps?.isClearable ?? false}
      />
    )
  }

  if (field.fieldType === "slider") {
    const raw = value ?? ""
    const numericValue = Number(String(raw).toUpperCase().replace(/^N/, "-"))
    const sliderValue = Number.isNaN(numericValue) ? 0 : numericValue
    return (
      <Box pt={2} pb={2}>
        <Flex justify="space-between" mb={1}>
          <Input
            id={`nested-${depth}-${field.name}-input`}
            type={
              field.fieldProps?.inputType || field.fieldProps?.autoOption
                ? "text"
                : "number"
            }
            fontSize="sm"
            width="80px"
            value={raw as string | number}
            onChange={(event) => onChange(event.target.value)}
          />
          {field.fieldProps?.autoOption && (
            <Button
              size="sm"
              colorScheme={value === "auto" ? "blue" : "gray"}
              onClick={() => onChange("auto")}
            >
              Auto
            </Button>
          )}
        </Flex>
        <Slider
          id={`nested-${depth}-${field.name}`}
          min={field.fieldProps?.min || 0}
          max={field.fieldProps?.max || 100}
          step={field.fieldProps?.step || 1}
          value={sliderValue}
          onChange={(nextValue) => onChange(nextValue.toString())}
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

  if (field.fieldType === "color-picker") {
    return (
      <ColorPickerField
        fieldName={field.name}
        value={normalizedValue as string}
        setValue={setNestedColorValue}
        fieldProps={field.fieldProps as ColorPickerProps}
        isClearable={field.fieldProps?.isClearable ?? false}
      />
    )
  }

  if (field.fieldType === "gradient-picker") {
    return (
      <GradientPicker
        fieldName={field.name}
        value={value as GradientPickerState}
        setValue={(_name, nextValue) => onChange(nextValue)}
        errors={{}}
      />
    )
  }

  if (field.fieldType === "anchor") {
    return (
      <AnchorField
        value={value as string}
        positions={field.fieldProps?.positions as string[]}
        onChange={onChange}
      />
    )
  }

  if (field.fieldType === "radio-card") {
    return (
      <RadioCardField
        value={value as string}
        options={field.fieldProps?.options ?? []}
        onChange={onChange}
        {...field.fieldProps}
      />
    )
  }

  if (field.fieldType === "checkbox-card") {
    return (
      <CheckboxCardField
        value={(value as string[]) ?? []}
        options={field.fieldProps?.options ?? []}
        onChange={onChange}
        {...field.fieldProps}
      />
    )
  }

  if (field.fieldType === "padding-input") {
    return (
      <PaddingInputField
        onChange={onChange}
        errors={{} as PaddingErrors}
        name={field.name}
        value={value as Partial<PaddingState>}
        {...field.fieldProps}
      />
    )
  }

  if (field.fieldType === "zoom") {
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
  }

  if (field.fieldType === "distort-perspective-input") {
    return (
      <DistortPerspectiveInput
        onChange={onChange}
        errors={{} as PerspectiveErrors}
        name={field.name}
        value={value as PerspectiveObject}
        {...field.fieldProps}
      />
    )
  }

  if (field.fieldType === "radius-input") {
    return (
      <RadiusInputField
        onChange={onChange}
        errors={{} as RadiusErrors}
        name={field.name}
        value={value as Partial<RadiusState>}
        {...field.fieldProps}
      />
    )
  }

  if (field.fieldType === "nested-layers" && depth < MAX_NESTED_UI_DEPTH) {
    return (
      <NestedLayersInput
        value={value}
        onChange={onChange}
        focusObjects={focusObjects}
        depth={depth + 1}
        valuePathPrefix={`${valuePathPrefix}.${field.name}`}
        automationVariables={automationVariables}
        isVariableDisabled={isVariableDisabled}
        onSaveAutomationVariable={onSaveAutomationVariable}
        onRemoveAutomationVariable={onRemoveAutomationVariable}
      />
    )
  }

  return (
    <Input
      {...commonInputProps}
      value={(values[field.name] as string | number | undefined) ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

type NestedLayersInputProps = {
  value: unknown
  onChange: (value: unknown) => void
  focusObjects?: ReadonlyArray<string>
  depth?: number
  valuePathPrefix?: string
  automationVariables?: TemplateAutomationVariable[]
  isVariableDisabled?: boolean
  onSaveAutomationVariable?: (
    candidate: VariableCandidate,
    label: string,
  ) => void
  onRemoveAutomationVariable?: (valuePath: string) => void
}

function NestedLayersInput({
  value,
  onChange,
  focusObjects,
  depth = 0,
  valuePathPrefix = "nestedLayers",
  automationVariables = [],
  isVariableDisabled = true,
  onSaveAutomationVariable = () => {},
  onRemoveAutomationVariable = () => {},
}: NestedLayersInputProps) {
  const layers = normalizeNestedLayers(value)

  const updateLayer = (index: number, nextLayer: NestedLayerValue) => {
    onChange(
      layers.map((layer, layerIndex) =>
        layerIndex === index ? nextLayer : layer,
      ),
    )
  }

  const removeLayer = (index: number) => {
    onChange(layers.filter((_layer, layerIndex) => layerIndex !== index))
  }

  const addLayer = (key: NestedLayerKey) => {
    onChange([...layers, makeNestedLayer(key)])
  }

  return (
    <VStack align="stretch" spacing={3}>
      <ButtonGroup size="sm" isAttached variant="outline">
        <Button
          leftIcon={<Icon as={PiPlus} />}
          onClick={() => addLayer("layers-text")}
        >
          Text
        </Button>
        <Button
          leftIcon={<Icon as={PiPlus} />}
          onClick={() => addLayer("layers-image")}
        >
          Image
        </Button>
      </ButtonGroup>

      {layers.map((layer, index) => {
        const layerItem = getLayerTransformationItem(layer.key)
        const layerValues = isRecord(layer.value) ? layer.value : {}
        const setFieldValue = (fieldName: string, nextValue: unknown) => {
          updateLayer(index, {
            ...layer,
            name: layer.name ?? layerItem?.name,
            type: "transformation",
            value: {
              ...layerValues,
              [fieldName]: nextValue,
            },
          })
        }

        return (
          <Box
            key={`${layer.key}-${index}`}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={3}
          >
            <Flex align="center" justify="space-between" gap={2} mb={3}>
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium">
                  {layerItem?.name ?? layer.key}
                </Text>
                <Switch
                  size="sm"
                  isChecked={layer.enabled !== false}
                  onChange={(event) =>
                    updateLayer(index, {
                      ...layer,
                      enabled: event.target.checked,
                    })
                  }
                />
              </HStack>
              <HStack spacing={1}>
                <Button
                  size="xs"
                  variant={layer.key === "layers-text" ? "solid" : "outline"}
                  onClick={() =>
                    updateLayer(index, makeNestedLayer("layers-text"))
                  }
                >
                  Text
                </Button>
                <Button
                  size="xs"
                  variant={layer.key === "layers-image" ? "solid" : "outline"}
                  onClick={() =>
                    updateLayer(index, makeNestedLayer("layers-image"))
                  }
                >
                  Image
                </Button>
                <IconButton
                  aria-label="Remove nested layer"
                  size="xs"
                  variant="ghost"
                  icon={<Icon as={PiTrash} color="red.500" />}
                  onClick={() => removeLayer(index)}
                />
              </HStack>
            </Flex>

            <VStack align="stretch" spacing={3}>
              {(layerItem?.transformations ?? [])
                .filter((field) => {
                  if (
                    field.fieldType === "nested-layers" &&
                    depth >= MAX_NESTED_UI_DEPTH
                  ) {
                    return false
                  }
                  return field.isVisible?.(layerValues) ?? true
                })
                .map((field) => {
                  const layerLabel = layer.name ?? layerItem?.name ?? layer.key
                  const candidates = getFieldVariableCandidates(
                    field,
                    layerValues[field.name],
                  ).map((candidate) => ({
                    ...candidate,
                    valuePath: `${valuePathPrefix}.${index}.value.${candidate.valuePath}`,
                    label: `${layerLabel} ${candidate.label}`,
                  }))

                  return (
                    <FormControl key={field.name}>
                      <Flex
                        align="center"
                        justify="space-between"
                        gap={2}
                        mb={1}
                      >
                        <FormLabel fontSize="xs" mb={0}>
                          {field.label}
                        </FormLabel>
                        <AutomationVariableButton
                          candidates={candidates}
                          variables={automationVariables}
                          isDisabled={isVariableDisabled}
                          onSave={onSaveAutomationVariable}
                          onRemove={onRemoveAutomationVariable}
                        />
                      </Flex>
                      <NestedLayerField
                        field={field}
                        value={layerValues[field.name]}
                        values={layerValues}
                        onChange={(nextValue) =>
                          setFieldValue(field.name, nextValue)
                        }
                        focusObjects={focusObjects}
                        depth={depth}
                        valuePathPrefix={`${valuePathPrefix}.${index}.value`}
                        automationVariables={automationVariables}
                        isVariableDisabled={isVariableDisabled}
                        onSaveAutomationVariable={onSaveAutomationVariable}
                        onRemoveAutomationVariable={onRemoveAutomationVariable}
                      />
                    </FormControl>
                  )
                })}
            </VStack>
          </Box>
        )
      })}
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
    setTransformationAutomationVariables,
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
  const automationVariables = editedTransformation?.automationVariables ?? []

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

        updateTransformation(transformationToEdit.transformationId, {
          type: "transformation",
          name: finalName,
          key: selectedTransformation.key,
          value: data,
          automationVariables: editedTransformation?.automationVariables,
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

  const saveAutomationVariable = useCallback(
    (candidate: VariableCandidate, label: string) => {
      if (!editedTransformation) return
      const existingVariable = automationVariables.find(
        (variable) => variable.valuePath === candidate.valuePath,
      )
      const nextVariable: TemplateAutomationVariable = {
        id: existingVariable?.id ?? makeVariableId(candidate.valuePath),
        label,
        fieldName: candidate.fieldName,
        valuePath: candidate.valuePath,
        fieldType: candidate.fieldType,
      }
      const nextVariables = existingVariable
        ? automationVariables.map((variable) =>
            variable.valuePath === candidate.valuePath
              ? nextVariable
              : variable,
          )
        : [...automationVariables, nextVariable]
      setTransformationAutomationVariables(
        editedTransformation.id,
        nextVariables,
      )
    },
    [
      automationVariables,
      editedTransformation,
      setTransformationAutomationVariables,
    ],
  )

  const removeAutomationVariable = useCallback(
    (valuePath: string) => {
      if (!editedTransformation) return
      setTransformationAutomationVariables(
        editedTransformation.id,
        automationVariables.filter(
          (variable) => variable.valuePath !== valuePath,
        ),
      )
    },
    [
      automationVariables,
      editedTransformation,
      setTransformationAutomationVariables,
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
              <Flex align="center" justify="space-between" gap={2} mb={2}>
                <FormLabel htmlFor={field.name} fontSize="sm" mb={0}>
                  {field.label}
                </FormLabel>
                <AutomationVariableButton
                  candidates={getFieldVariableCandidates(
                    field,
                    watch(field.name),
                  )}
                  variables={automationVariables}
                  isDisabled={!editedTransformation}
                  onSave={saveAutomationVariable}
                  onRemove={removeAutomationVariable}
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
              {field.fieldType === "nested-layers" ? (
                <NestedLayersInput
                  value={watch(field.name)}
                  onChange={(value) =>
                    setValue(field.name, value, {
                      shouldDirty: true,
                      shouldTouch: true,
                    })
                  }
                  focusObjects={focusObjects}
                  valuePathPrefix={field.name}
                  automationVariables={automationVariables}
                  isVariableDisabled={!editedTransformation}
                  onSaveAutomationVariable={saveAutomationVariable}
                  onRemoveAutomationVariable={removeAutomationVariable}
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
