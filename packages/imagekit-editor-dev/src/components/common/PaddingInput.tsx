import {
  Box,
  Flex,
  HStack,
  Icon,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  useColorModeValue,
  Tooltip,
} from "@chakra-ui/react"
import { set } from "lodash"
import type * as React from "react"
import { useState, useEffect, forwardRef } from "react"
import { LuArrowLeftToLine } from "@react-icons/all-files/lu/LuArrowLeftToLine"
import { LuArrowRightToLine } from "@react-icons/all-files/lu/LuArrowRightToLine"
import { LuArrowUpToLine } from "@react-icons/all-files/lu/LuArrowUpToLine"
import { LuArrowDownToLine } from "@react-icons/all-files/lu/LuArrowDownToLine"
import { TbBoxPadding } from "@react-icons/all-files/tb/TbBoxPadding"
import { FieldErrors } from "react-hook-form"

type PaddingMode = "uniform" | "individual"

type PaddingState = {
  mode: PaddingMode
  padding: number | PaddingObject | null | string
}

type PaddingInputFieldProps = {
  id?: string
  onChange: (value: PaddingState) => void
  errors?: FieldErrors<Record<string, unknown>>
  name: string,
  value?: Partial<PaddingState>
}

export type PaddingObject = {
  top: number | null
  right: number | null
  bottom: number | null
  left: number | null
}

function getUpdatedPaddingValue(
  current: number | PaddingObject | null | string,
  side: "top" | "right" | "bottom" | "left" | "all",
  value: string,
  mode: "uniform" | "individual"
): number | PaddingObject | null | string {
  let inputValue: number | PaddingObject | null | string
  try {
    inputValue = JSON.parse(value)
  } catch {
    inputValue = value
  }
  if (mode === "uniform") {
    if (typeof inputValue === "number") {
      return inputValue
    } else if (inputValue === null) {
      return null
    } else if (typeof inputValue === "string") {
      return inputValue
    } else {
      const { top, right, bottom, left } = inputValue
      if (top === right && top === bottom && top === left) {
        return top
      } else {
        return null
      }
    }
  } else {
    let commonValue: number | null = null
    if (typeof inputValue === "number") {
      commonValue = inputValue
    }
    const updatedPadding = current && typeof current === "object"
      ? { ...current }
      : { top: commonValue, right: commonValue, bottom: commonValue, left: commonValue }
    if (side !== "all") {
      set(updatedPadding, side, inputValue)
    }
    return updatedPadding
  }
}

export const PaddingInputField: React.FC<PaddingInputFieldProps> = ({
  id,
  onChange,
  errors,
  name: propertyName,
  value
}) => {
  const [paddingMode, setPaddingMode] = useState<PaddingMode>(value?.mode ?? "uniform")
  const [paddingValue, setPaddingValue] = useState<number | PaddingObject | null | string>(value?.padding ?? "")
  const errorRed = useColorModeValue("red.500", "red.300")
  const activeColor = useColorModeValue("blue.500", "blue.600")
  const inactiveColor = useColorModeValue("gray.600", "gray.400")

  useEffect(() => {
    const formatPaddingValue = (value: number | PaddingObject | null | string): string | PaddingObject => {
      if (value === null) return ""
      if (typeof value === "number") {
        return value.toString()
      } else if (typeof value === "string") {
        return value
      } else {
        return value;
      }
    }
    const formattedValue = formatPaddingValue(paddingValue)
    onChange({ mode: paddingMode, padding: formattedValue })
  }, [paddingValue, paddingMode])
   

  return (
    <HStack
      as="fieldset"
      id={id}
      role="group"
      spacing={2}
      alignItems="stretch"
      justifyContent="space-between"
    >
      <Flex direction="row" flex="1" flexWrap="wrap" gap={2}>
        { paddingMode === "uniform" ? (
          <Box flex="1">
            <Input
              type="number"
              min={0}
              onChange={(e) => {
                const val = e.target.value
                setPaddingValue(getUpdatedPaddingValue(
                  paddingValue,
                  "all",
                  val,
                  paddingMode
                ))
              }}
              value={["number", "string"].includes(typeof paddingValue) ? paddingValue : ""}
              placeholder="Uniform Padding"
              isInvalid={!!errors?.[propertyName]}
            />
            <Text fontSize='xs' color={errorRed}>{errors?.[propertyName]?.message}</Text>
          </Box>
        ) : (
          <>
            <Box flex="1 1 calc(50% - 4px)">
              <InputGroup>
                <InputLeftElement pointerEvents="none" fontSize="0.7em">
                  <Icon as={LuArrowUpToLine} color="gray.500" />
                </InputLeftElement>
                <Input
                  type="number"
                  min={0}
                  onChange={(e) => {
                    const val = e.target.value
                    setPaddingValue(getUpdatedPaddingValue(
                      paddingValue,
                      "top",
                      val,
                      paddingMode
                    ))
                  }}
                  value={typeof paddingValue === "object" ? paddingValue?.top ?? "" : ""}
                  placeholder="Top"
                  isInvalid={!!errors?.[propertyName]?.top}
                />
              </InputGroup>
              <Text fontSize='xs' color={errorRed}>{errors?.[propertyName]?.top?.message}</Text>
            </Box>

            <Box flex="1 1 calc(50% - 4px)">
              <InputGroup>
                <InputLeftElement pointerEvents="none" fontSize="0.7em">
                  <Icon as={LuArrowRightToLine} color="gray.500" />
                </InputLeftElement>
                <Input
                  type="number"
                  min={0}
                  onChange={(e) => {
                    const val = e.target.value
                    setPaddingValue(getUpdatedPaddingValue(
                      paddingValue,
                      "right",
                      val,
                      paddingMode
                    ))
                  }}
                  value={typeof paddingValue === "object" ? paddingValue?.right ?? "" : ""}
                  placeholder="Right"
                  isInvalid={!!errors?.[propertyName]?.right}
                />
              </InputGroup>
              <Text fontSize='xs' color={errorRed}>{errors?.[propertyName]?.right?.message}</Text>
            </Box>

            <Box flex="1 1 calc(50% - 4px)">
              <InputGroup>
                <InputLeftElement pointerEvents="none" fontSize="0.7em">
                  <Icon as={LuArrowDownToLine} color="gray.500" />
                </InputLeftElement>
                <Input
                  type="number"
                  min={0}
                  flex="1 1 calc(50% - 4px)"
                  onChange={(e) => {
                    const val = e.target.value
                    setPaddingValue(getUpdatedPaddingValue(
                      paddingValue,
                      "bottom",
                      val,
                      paddingMode
                    ))
                  }}
                  value={typeof paddingValue === "object" ? paddingValue?.bottom ?? "" : ""}
                  placeholder="Bottom"
                  isInvalid={!!errors?.[propertyName]?.bottom}
                />
              </InputGroup>
              <Text fontSize='xs' color={errorRed}>{errors?.[propertyName]?.bottom?.message}</Text>
            </Box>

            <Box flex="1 1 calc(50% - 4px)">
              <InputGroup>
                <InputLeftElement pointerEvents="none" fontSize="0.7em">
                  <Icon as={LuArrowLeftToLine} color="gray.500" />
                </InputLeftElement>
                <Input
                  type="number"
                  min={0}
                  flex="1 1 calc(50% - 4px)"
                  onChange={(e) => {
                    const val = e.target.value
                    setPaddingValue(getUpdatedPaddingValue(
                      paddingValue,
                      "left",
                      val,
                      paddingMode
                    ))
                  }}
                  value={typeof paddingValue === "object" ? paddingValue?.left ?? "" : ""}
                  placeholder="Left"
                  isInvalid={!!errors?.[propertyName]?.left}
                />
              </InputGroup>
              <Text fontSize='xs' color={errorRed}>{errors?.[propertyName]?.left?.message}</Text>
            </Box>

          </>
        ) }
      </Flex>
      <Tooltip 
        hasArrow
        label={paddingMode === "uniform" ? "Enable individual padding" : "Disable individual padding"}
        openDelay={200}
        modifiers={[
          {
            name: 'zIndex',
            enabled: true,
            phase: 'write',
            fn({ state }) {
              state.elements.popper.style.zIndex = '2100';
            },
          },
        ]}
      >
        <IconButton
          aria-label={paddingMode === "uniform" ? "Switch to individual padding" : "Switch to uniform padding"}
          aria-pressed={paddingMode === "individual"}
          icon={<TbBoxPadding size={20} />}
          padding="0.05em"
          onClick={() => {
            const newPaddingMode = paddingMode === "uniform" ? "individual" : "uniform"
            setPaddingValue(getUpdatedPaddingValue(
              paddingValue,
              "all",
              JSON.stringify(paddingValue),
              newPaddingMode
            ))
            setPaddingMode(newPaddingMode)
          }}
          variant="outline"
          color={paddingMode === "individual" ? activeColor : inactiveColor}
        />
      </Tooltip>
    </HStack>
  )
}

export default PaddingInputField
