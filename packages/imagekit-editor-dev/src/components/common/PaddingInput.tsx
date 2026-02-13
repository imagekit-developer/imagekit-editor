import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react"
import { LuArrowDownToLine } from "@react-icons/all-files/lu/LuArrowDownToLine"
import { LuArrowLeftToLine } from "@react-icons/all-files/lu/LuArrowLeftToLine"
import { LuArrowRightToLine } from "@react-icons/all-files/lu/LuArrowRightToLine"
import { LuArrowUpToLine } from "@react-icons/all-files/lu/LuArrowUpToLine"
import { TbBoxPadding } from "@react-icons/all-files/tb/TbBoxPadding"
import { set } from "lodash"
import type * as React from "react"
import { useEffect, useState } from "react"

type PaddingMode = "uniform" | "individual"

type PaddingDirection = "top" | "right" | "bottom" | "left"

export type PaddingState = {
  mode: PaddingMode
  padding: number | PaddingObject | null | string
}

export type PaddingObject = {
  top: number | null
  right: number | null
  bottom: number | null
  left: number | null
}

type ErrorObject = {
  message: string
}

type SidesErrors = {
  [key in keyof PaddingObject]?: ErrorObject
} & ErrorObject

export type PaddingErrors = Record<
  string,
  {
    padding?: SidesErrors
  }
>

type PaddingInputFieldProps = {
  id?: string
  onChange: (value: PaddingState) => void
  errors?: PaddingErrors
  name: string
  value?: Partial<PaddingState>
}

function getUpdatedPaddingValue(
  current: number | PaddingObject | null | string,
  side: PaddingDirection | "all",
  value: string,
  mode: "uniform" | "individual",
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
    const updatedPadding =
      current && typeof current === "object"
        ? { ...current }
        : {
            top: commonValue,
            right: commonValue,
            bottom: commonValue,
            left: commonValue,
          }
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
  value,
}) => {
  const [paddingMode, setPaddingMode] = useState<PaddingMode>(
    value?.mode ?? "uniform",
  )
  const [paddingValue, setPaddingValue] = useState<
    number | PaddingObject | null | string
  >(value?.padding ?? "")
  const errorRed = useColorModeValue("red.500", "red.300")
  const activeColor = useColorModeValue("blue.500", "blue.600")
  const inactiveColor = useColorModeValue("gray.600", "gray.400")

  // biome-ignore lint/correctness/useExhaustiveDependencies: <causes re-render loop if added>
  useEffect(() => {
    const formatPaddingValue = (
      value: number | PaddingObject | null | string,
    ): string | PaddingObject => {
      if (value === null) return ""
      if (typeof value === "number") {
        return value.toString()
      } else if (typeof value === "string") {
        return value
      } else {
        return value
      }
    }
    const formattedValue = formatPaddingValue(paddingValue)
    onChange({ mode: paddingMode, padding: formattedValue })
  }, [paddingValue, paddingMode])

  return (
    // biome-ignore lint/a11y/useSemanticElements: <role used to concur to chakra standard>
    <HStack
      as="fieldset"
      id={id}
      role="group"
      spacing={2}
      alignItems="stretch"
      justifyContent="space-between"
    >
      <Flex direction="row" flex="1" flexWrap="wrap" gap={2}>
        {paddingMode === "uniform" ? (
          <Box flex="1">
            <Input
              type="number"
              min={0}
              onChange={(e) => {
                const val = e.target.value
                setPaddingValue(
                  getUpdatedPaddingValue(paddingValue, "all", val, paddingMode),
                )
              }}
              value={
                ["number", "string"].includes(typeof paddingValue)
                  ? (paddingValue as string | number)
                  : ""
              }
              placeholder="Uniform Padding"
              isInvalid={!!errors?.[propertyName]?.padding}
              fontSize="sm"
            />
            <Text fontSize="xs" color={errorRed}>
              {errors?.[propertyName]?.padding?.message}
            </Text>
          </Box>
        ) : (
          // biome-ignore lint/complexity/noUselessFragments: <fragment is required otherwise syntax breaks>
          <>
            {[
              { name: "top", label: "Top", icon: LuArrowUpToLine },
              { name: "right", label: "Right", icon: LuArrowRightToLine },
              { name: "bottom", label: "Bottom", icon: LuArrowDownToLine },
              { name: "left", label: "Left", icon: LuArrowLeftToLine },
            ].map(({ name, label, icon }) => (
              <Box key={name} flex="1 1 calc(50% - 4px)">
                <InputGroup>
                  <InputLeftElement pointerEvents="none" fontSize="0.7em">
                    <Icon as={icon} color="gray.500" />
                  </InputLeftElement>
                  <Input
                    type="number"
                    min={0}
                    onChange={(e) => {
                      const val = e.target.value
                      setPaddingValue(
                        getUpdatedPaddingValue(
                          paddingValue,
                          name as PaddingDirection,
                          val,
                          paddingMode,
                        ),
                      )
                    }}
                    value={
                      typeof paddingValue === "object"
                        ? (paddingValue?.[name as PaddingDirection] ?? "")
                        : ""
                    }
                    placeholder={label}
                    isInvalid={
                      !!errors?.[propertyName]?.padding?.[
                        name as PaddingDirection
                      ]
                    }
                    fontSize="sm"
                  />
                </InputGroup>
                <Text fontSize="xs" color={errorRed}>
                  {
                    errors?.[propertyName]?.padding?.[name as PaddingDirection]
                      ?.message
                  }
                </Text>
              </Box>
            ))}
          </>
        )}
      </Flex>
      <Tooltip
        hasArrow
        label={
          paddingMode === "uniform"
            ? "Enable individual padding"
            : "Disable individual padding"
        }
        openDelay={200}
        modifiers={[
          {
            name: "zIndex",
            enabled: true,
            phase: "write",
            fn({ state }) {
              state.elements.popper.style.zIndex = "2100"
            },
          },
        ]}
      >
        <IconButton
          aria-label={
            paddingMode === "uniform"
              ? "Switch to individual padding"
              : "Switch to uniform padding"
          }
          aria-pressed={paddingMode === "individual"}
          icon={<TbBoxPadding size={20} />}
          padding="0.05em"
          onClick={() => {
            const newPaddingMode =
              paddingMode === "uniform" ? "individual" : "uniform"
            setPaddingValue(
              getUpdatedPaddingValue(
                paddingValue,
                "all",
                JSON.stringify(paddingValue),
                newPaddingMode,
              ),
            )
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
