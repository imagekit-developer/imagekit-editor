import {
  Box,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useColorModeValue,
} from "@chakra-ui/react"
import { BsArrowsMove } from "@react-icons/all-files/bs/BsArrowsMove"
import { TbAngle } from "@react-icons/all-files/tb/TbAngle"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import ColorPicker, { useColorPicker } from "react-best-gradient-color-picker"
import type { FieldErrors } from "react-hook-form"
import { useDebounce } from "../../hooks/useDebounce"
import { useEditorStore } from "../../store"
import { isVariableRef, type VariableRef } from "../../variables"
import { listVariables } from "../../variables/listVariables"
import {
  BoundVariableChip,
  MakeVariableButton,
} from "../sidebar/MakeVariableButton"
import AnchorField from "./AnchorField"
import ColorPickerField from "./ColorPickerField"
import RadioCardField from "./RadioCardField"

export type GradientPickerState = {
  from: string
  to: string
  direction: number | string
  stopPoint: number | string
}

type DirectionMode = "direction" | "degrees"

function isCompleteHexColor(value: string): boolean {
  // Accept #RRGGBB and #RRGGBBAA. (Inputs may be temporarily incomplete while typing.)
  return /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)
}

function rgbaToHex(rgba: string): string {
  const parts = rgba.match(/[\d.]+/g)?.map(Number) ?? []

  if (parts.length < 3) return "#000000"

  const [r, g, b, a] = parts

  const clamp8 = (v: number) => Math.max(0, Math.min(255, v))

  const rgbHex = [r, g, b]
    .map(clamp8)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")

  if (a === undefined) {
    return `#${rgbHex}`
  }
  const alphaDec = a > 1 ? a / 100 : a
  const alphaHex = Math.round(alphaDec * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()
  return `#${rgbHex}${alphaHex}`
}

const GradientPickerField = ({
  fieldName,
  setValue,
  value,
  errors,
  nestedVariables,
  onCreateNestedVariable,
  onUpdateNestedVariable,
  onUnbindNestedVariable,
  onChangeNestedVariableDefault,
}: {
  fieldName: string
  setValue: (name: string, value: GradientPickerState | string) => void
  value?: GradientPickerState | null
  errors?: FieldErrors<Record<string, unknown>>
  nestedVariables?: Record<string, unknown>
  onCreateNestedVariable?: (
    path: string[],
    variable: { name: string; label: string; description?: string },
  ) => void
  onUpdateNestedVariable?: (
    path: string[],
    updates: { label?: string; description?: string },
  ) => void
  onUnbindNestedVariable?: (path: string[]) => void
  onChangeNestedVariableDefault?: (path: string[], value: unknown) => void
}) => {
  const editorMode = useEditorStore((s) => s.mode)
  const isCanvasMode = editorMode === "canvas"
  const allTransformations = useEditorStore((s) => s.transformations)
  const allTakenVariableNames = useMemo(
    () => listVariables(allTransformations).map((v) => v.name),
    [allTransformations],
  )

  // Check if from/to are variablized
  const fromVariable = nestedVariables?.from as VariableRef | undefined
  const toVariable = nestedVariables?.to as VariableRef | undefined
  const isFromVariablized = fromVariable && isVariableRef(fromVariable)
  const isToVariablized = toVariable && isVariableRef(toVariable)

  // Validation for variable default values
  const isFromDefaultInvalid =
    isFromVariablized &&
    (!fromVariable?.defaultValue ||
      (typeof fromVariable.defaultValue === "string" &&
        fromVariable.defaultValue.trim() === ""))
  const isToDefaultInvalid =
    isToVariablized &&
    (!toVariable?.defaultValue ||
      (typeof toVariable.defaultValue === "string" &&
        toVariable.defaultValue.trim() === ""))

  // Stable callbacks for nested variable default value changes to prevent infinite loops
  const handleFromDefaultChange = useCallback(
    (_: string, newValue: string) => {
      onChangeNestedVariableDefault?.(["from"], newValue)
    },
    [onChangeNestedVariableDefault],
  )

  const handleToDefaultChange = useCallback(
    (_: string, newValue: string) => {
      onChangeNestedVariableDefault?.(["to"], newValue)
    },
    [onChangeNestedVariableDefault],
  )

  const getLinearGradientString = useCallback(
    (value: GradientPickerState): string => {
      // NOTE: The gradient parser used by the picker is strict and crashes on
      // invalid/incomplete color tokens (e.g. empty string when clearing inputs).
      // Keep the preview gradient always valid by falling back to defaults.
      const fromColor = isCompleteHexColor(value.from)
        ? value.from
        : "#FFFFFFFF"
      const toColor = isCompleteHexColor(value.to) ? value.to : "#00000000"

      let direction = ""
      const dirInt = Number(value.direction as string)
      if (!Number.isNaN(dirInt)) {
        direction = `${dirInt}deg`
      } else {
        const dirString = String(value.direction || "bottom")
        direction = `to ${dirString.split("_").join(" ")}`
      }
      const stopPoint =
        typeof value.stopPoint === "number"
          ? value.stopPoint
          : Number(value.stopPoint)
      const safeStopPoint = Number.isFinite(stopPoint) ? stopPoint : 100
      return `linear-gradient(${direction}, ${fromColor} 0%, ${toColor} ${safeStopPoint}%)`
    },
    [],
  )

  const [localValue, setLocalValue] = useState<GradientPickerState>(
    value ?? {
      from: "#FFFFFFFF",
      to: "#00000000",
      direction: "bottom",
      stopPoint: 100,
    },
  )
  const [directionMode, setDirectionMode] = useState<DirectionMode>("direction")

  const [gradient, setGradient] = useState<string>(
    getLinearGradientString(localValue),
  )

  const { getGradientObject } = useColorPicker(gradient, setGradient)

  function getAngleValue(): number | string {
    const dirInt = Number(localValue.direction as string)
    if (!Number.isNaN(dirInt)) {
      return dirInt || ""
    }
    const direction = localValue.direction as string
    const directionMap: Record<string, number> = {
      top: 0,
      top_right: 45,
      right: 90,
      bottom_right: 135,
      bottom: 180,
      bottom_left: 225,
      left: 270,
      top_left: 315,
    }
    return directionMap[direction] || ""
  }

  function getDirectionValue(): string {
    const dirInt = Number(localValue.direction as string)
    if (Number.isNaN(dirInt)) {
      return String(localValue.direction)
    }
    const nearestAngle = Math.round(dirInt / 45) * 45
    const angleMap: Record<number, string> = {
      0: "top",
      45: "top_right",
      90: "right",
      135: "bottom_right",
      180: "bottom",
      225: "bottom_left",
      270: "left",
      315: "top_left",
    }
    return angleMap[nearestAngle] || "bottom"
  }

  const debouncedValue = useDebounce<GradientPickerState>(localValue, 500)

  function handleGradientChange(gradientVal: string) {
    const cleanedGradient = gradientVal.replace(/NaNdeg\s*,/, "")
    let gradientObj: ReturnType<typeof getGradientObject>
    try {
      gradientObj = getGradientObject(cleanedGradient)
    } catch (e) {
      console.error("Failed to parse gradient:", e)
      return
    }

    if (!gradientObj || !gradientObj.isGradient) return

    const { colors } = gradientObj
    if (colors.length !== 2) return
    if (colors[0].left !== 0) return
    setGradient(cleanedGradient)

    const fromColor = rgbaToHex(colors[0].value).toUpperCase()
    const toColor = rgbaToHex(colors[1].value).toUpperCase()
    const stopPoint = colors[1].left

    if (
      fromColor !== localValue.from ||
      toColor !== localValue.to ||
      stopPoint !== localValue.stopPoint
    ) {
      setLocalValue({
        ...localValue,
        from: fromColor,
        to: toColor,
        stopPoint: stopPoint,
      })
    }
  }

  function applyGradientInputChanges(newValue: GradientPickerState) {
    const gradientString = getLinearGradientString(newValue)
    setGradient(gradientString)
    setLocalValue(newValue)
  }

  // Stable callbacks for color changes to prevent infinite loops
  const handleFromColorChange = useCallback(
    (_: string, newValue: string) => {
      setLocalValue((prev) => {
        const updated = { ...prev, from: newValue }
        const gradientString = getLinearGradientString(updated)
        setGradient(gradientString)
        return updated
      })
    },
    [getLinearGradientString],
  )

  const handleToColorChange = useCallback(
    (_: string, newValue: string) => {
      setLocalValue((prev) => {
        const updated = { ...prev, to: newValue }
        const gradientString = getLinearGradientString(updated)
        setGradient(gradientString)
        return updated
      })
    },
    [getLinearGradientString],
  )

  useEffect(() => {
    setValue(fieldName, debouncedValue)
  }, [debouncedValue, fieldName, setValue])

  // Sync internal state when value prop changes externally
  // (e.g. switching between transformations of the same type)
  // biome-ignore lint/correctness/useExhaustiveDependencies: <deep-compare via JSON.stringify>
  useEffect(() => {
    if (!value) return
    setLocalValue((prev) =>
      JSON.stringify(prev) === JSON.stringify(value) ? prev : value,
    )
    const nextGradient = getLinearGradientString(value)
    setGradient((prev) => (prev === nextGradient ? prev : nextGradient))
  }, [JSON.stringify(value), getLinearGradientString])

  const errorRed = useColorModeValue("red.500", "red.300")

  return (
    <Flex direction="column" gap="2">
      <Popover
        placement="auto"
        closeOnBlur={true}
        strategy="fixed"
        gutter={2}
        lazyBehavior="unmount"
      >
        <PopoverTrigger>
          <Flex
            width="20"
            height="20"
            align="center"
            justify="center"
            bg={gradient}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="4px"
            cursor="pointer"
          />
        </PopoverTrigger>
        <PopoverContent p="2" width="auto" zIndex={1400}>
          <PopoverBody p="0">
            <ColorPicker
              value={gradient}
              onChange={handleGradientChange}
              disableDarkMode
              hideGradientAngle
              hideGradientType
              hideColorTypeBtns
              hideInputType
              hideAdvancedSliders
              hideColorGuide
            />
          </PopoverBody>
        </PopoverContent>
      </Popover>

      <Box>
        <Flex align="center" justify="space-between" mb="1">
          <FormLabel htmlFor="from_color" fontSize="sm" mb="0">
            From Color
          </FormLabel>
          {isCanvasMode && !isFromVariablized && onCreateNestedVariable && (
            <MakeVariableButton
              fieldLabel="From Color"
              takenNames={allTakenVariableNames}
              onCreate={(variable) => {
                onCreateNestedVariable(["from"], variable)
              }}
            />
          )}
        </Flex>
        {isFromVariablized ? (
          <Box
            borderWidth="1px"
            borderColor={isFromDefaultInvalid ? "red.300" : "purple.200"}
            bg={isFromDefaultInvalid ? "red.50" : "purple.50"}
            borderRadius="md"
            p="3"
          >
            <BoundVariableChip
              variable={fromVariable}
              onRename={(updates) => {
                onUpdateNestedVariable?.(["from"], updates)
              }}
              onUnbind={() => {
                onUnbindNestedVariable?.(["from"])
              }}
            />
            <Box mt="3">
              <FormControl isInvalid={!!isFromDefaultInvalid}>
                <FormLabel fontSize="xs" mb="1">
                  Default value
                </FormLabel>
                <ColorPickerField
                  fieldName="from_default"
                  value={String(fromVariable.defaultValue || "")}
                  setValue={handleFromDefaultChange}
                  isClearable={true}
                />
                {isFromDefaultInvalid && (
                  <FormErrorMessage fontSize="xs" mt="1">
                    Default value is required
                  </FormErrorMessage>
                )}
              </FormControl>
            </Box>
          </Box>
        ) : (
          <ColorPickerField
            fieldName="from"
            value={localValue.from}
            setValue={handleFromColorChange}
            isClearable={true}
          />
        )}
        {!isFromVariablized && (
          <Text fontSize="xs" color={errorRed}>
            {errors?.[fieldName]?.from?.message}
          </Text>
        )}
      </Box>

      <Box>
        <Flex align="center" justify="space-between" mb="1">
          <FormLabel htmlFor="to_color" fontSize="sm" mb="0">
            To Color
          </FormLabel>
          {isCanvasMode && !isToVariablized && onCreateNestedVariable && (
            <MakeVariableButton
              fieldLabel="To Color"
              takenNames={allTakenVariableNames}
              onCreate={(variable) => {
                onCreateNestedVariable(["to"], variable)
              }}
            />
          )}
        </Flex>
        {isToVariablized ? (
          <Box
            borderWidth="1px"
            borderColor={isToDefaultInvalid ? "red.300" : "purple.200"}
            bg={isToDefaultInvalid ? "red.50" : "purple.50"}
            borderRadius="md"
            p="3"
          >
            <BoundVariableChip
              variable={toVariable}
              onRename={(updates) => {
                onUpdateNestedVariable?.(["to"], updates)
              }}
              onUnbind={() => {
                onUnbindNestedVariable?.(["to"])
              }}
            />
            <Box mt="3">
              <FormControl isInvalid={!!isToDefaultInvalid}>
                <FormLabel fontSize="xs" mb="1">
                  Default value
                </FormLabel>
                <ColorPickerField
                  fieldName="to_default"
                  value={String(toVariable.defaultValue || "")}
                  setValue={handleToDefaultChange}
                  isClearable={true}
                />
                {isToDefaultInvalid && (
                  <FormErrorMessage fontSize="xs" mt="1">
                    Default value is required
                  </FormErrorMessage>
                )}
              </FormControl>
            </Box>
          </Box>
        ) : (
          <ColorPickerField
            fieldName="to"
            value={localValue.to}
            setValue={handleToColorChange}
            isClearable={true}
          />
        )}
        {!isToVariablized && (
          <Text fontSize="xs" color={errorRed}>
            {errors?.[fieldName]?.to?.message}
          </Text>
        )}
      </Box>

      <Box>
        <FormLabel htmlFor="linear_direction" fontSize="sm">
          Linear Direction
        </FormLabel>
        <Box marginBottom="2" marginTop="2">
          <RadioCardField
            options={[
              { label: "Direction", value: "direction", icon: BsArrowsMove },
              { label: "Degrees", value: "degrees", icon: TbAngle },
            ]}
            value={directionMode}
            onChange={(val) => {
              setDirectionMode((val || "direction") as DirectionMode)
              const newDirection =
                val === "direction" ? getDirectionValue() : getAngleValue()
              applyGradientInputChanges({
                ...localValue,
                direction: newDirection,
              })
            }}
          />
        </Box>
        {directionMode === "direction" ? (
          <AnchorField
            value={getDirectionValue()}
            onChange={(val) => {
              applyGradientInputChanges({ ...localValue, direction: val })
            }}
            positions={[
              "top",
              "bottom",
              "left",
              "right",
              "top_left",
              "top_right",
              "bottom_left",
              "bottom_right",
            ]}
          />
        ) : (
          <Input
            size="md"
            value={getAngleValue()}
            type="number"
            min={0}
            max={359}
            onChange={(e) => {
              const newValue = e.target.value.trim()
              if (newValue === "") {
                applyGradientInputChanges({ ...localValue, direction: "" })
                return
              }
              const intVal = Number(newValue)
              if (intVal < 0 || intVal > 359) return
              applyGradientInputChanges({ ...localValue, direction: intVal })
            }}
            borderColor="gray.200"
            placeholder="0"
            borderRadius="4px"
          />
        )}
        <Text fontSize="xs" color={errorRed}>
          {errors?.[fieldName]?.direction?.message}
        </Text>
      </Box>

      <Box>
        <FormLabel htmlFor="stop_point" fontSize="sm">
          Stop Point (%)
        </FormLabel>
        <Input
          size="md"
          value={localValue.stopPoint}
          type="number"
          min={1}
          max={100}
          onChange={(e) => {
            const newValue = e.target.value.trim()
            if (newValue === "") {
              applyGradientInputChanges({ ...localValue, stopPoint: "" })
              return
            }
            const intVal = Number(newValue)
            if (intVal < 1 || intVal > 100) return
            applyGradientInputChanges({
              ...localValue,
              stopPoint: intVal,
            })
          }}
          borderColor="gray.200"
          placeholder="100"
          borderRadius="4px"
        />
        <Text fontSize="xs" color={errorRed}>
          {errors?.[fieldName]?.stopPoint?.message}
        </Text>
      </Box>
    </Flex>
  )
}

export default memo(GradientPickerField)
