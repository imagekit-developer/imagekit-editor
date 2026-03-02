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
import { RxCornerBottomLeft } from "@react-icons/all-files/rx/RxCornerBottomLeft"
import { RxCornerBottomRight } from "@react-icons/all-files/rx/RxCornerBottomRight"
import { RxCornerTopLeft } from "@react-icons/all-files/rx/RxCornerTopLeft"
import { RxCornerTopRight } from "@react-icons/all-files/rx/RxCornerTopRight"
import { TbBorderCorners } from "@react-icons/all-files/tb/TbBorderCorners"
import { set } from "lodash"
import type * as React from "react"
import { useEffect, useState } from "react"

type RadiusMode = "uniform" | "individual"

export type RadiusState = {
  mode: RadiusMode
  radius: RadiusObject | string
}

export type RadiusObject = {
  topLeft: string | "max"
  topRight: string | "max"
  bottomRight: string | "max"
  bottomLeft: string | "max"
}

type ErrorObject = {
  message: string
}

type CornerErrors = {
  [key in keyof RadiusObject]?: ErrorObject
} & ErrorObject

export type RadiusErrors = Record<
  string,
  {
    radius?: CornerErrors
  }
>

type RadiusInputFieldProps = {
  id?: string
  onChange: (value: RadiusState) => void
  errors?: RadiusErrors
  name: string
  value?: Partial<RadiusState>
}

type RadiusDirection = "topLeft" | "topRight" | "bottomRight" | "bottomLeft"

function getUpdatedRadiusValue(
  current: RadiusObject | string,
  corner: RadiusDirection | "all",
  value: string,
  mode: "uniform" | "individual",
): RadiusObject | string {
  let inputValue: RadiusObject | number | string
  try {
    inputValue = JSON.parse(value)
  } catch {
    inputValue = value
  }
  if (mode === "uniform") {
    if (inputValue === "") {
      return ""
    } else if (
      typeof inputValue === "string" ||
      typeof inputValue === "number"
    ) {
      return inputValue.toString()
    } else {
      const { topLeft, topRight, bottomRight, bottomLeft } = inputValue
      if (
        topLeft === topRight &&
        topLeft === bottomRight &&
        topLeft === bottomLeft
      ) {
        return topLeft
      } else {
        return ""
      }
    }
  } else {
    let commonValue: string = ""
    if (typeof inputValue === "string" || typeof inputValue === "number") {
      commonValue = inputValue.toString()
    }
    const updatedRadius =
      current && typeof current === "object"
        ? { ...current }
        : {
            topLeft: commonValue,
            topRight: commonValue,
            bottomRight: commonValue,
            bottomLeft: commonValue,
          }
    if (corner !== "all") {
      set(updatedRadius, corner, inputValue.toString())
    }
    return updatedRadius
  }
}

export const RadiusInputField: React.FC<RadiusInputFieldProps> = ({
  id,
  onChange,
  errors,
  name: propertyName,
  value,
}) => {
  const [radiusMode, setRadiusMode] = useState<RadiusMode>(
    value?.mode ?? "uniform",
  )
  const [radiusValue, setRadiusValue] = useState<RadiusObject | string>(
    value?.radius ?? "",
  )
  const errorRed = useColorModeValue("red.500", "red.300")
  const activeColor = useColorModeValue("blue.500", "blue.600")
  const inactiveColor = useColorModeValue("gray.600", "gray.400")

  useEffect(() => {
    if (!value) {
      setRadiusMode("uniform")
      setRadiusValue("")
      return
    }

    if (value.mode && value.mode !== radiusMode) {
      setRadiusMode(value.mode)
    }

    if (value.radius !== undefined) {
      setRadiusValue((prev) => {
        const prevString =
          typeof prev === "string" ? prev : JSON.stringify(prev ?? "")
        const nextString =
          typeof value.radius === "string"
            ? value.radius
            : JSON.stringify(value.radius ?? "")

        if (prevString === nextString) {
          return prev
        }

        return value.radius as RadiusObject | string
      })
    }
  }, [value?.mode, value?.radius])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <causes re-render loop if added>
  useEffect(() => {
    const formatRadiusValue = (
      value: RadiusObject | string,
    ): string | RadiusObject => {
      if (value === "") return ""
      if (typeof value === "string") {
        return value
      } else {
        return value
      }
    }
    const formattedValue = formatRadiusValue(radiusValue)
    onChange({ mode: radiusMode, radius: formattedValue })
  }, [radiusValue, radiusMode])

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
        {radiusMode === "uniform" ? (
          <Box flex="1">
            <Input
              onChange={(e) => {
                const val = e.target.value
                setRadiusValue(
                  getUpdatedRadiusValue(radiusValue, "all", val, radiusMode),
                )
              }}
              value={typeof radiusValue === "string" ? radiusValue : ""}
              placeholder="Uniform Radius"
              isInvalid={!!errors?.[propertyName]?.radius}
              fontSize="sm"
            />
            <Text fontSize="xs" color={errorRed}>
              {errors?.[propertyName]?.radius?.message}
            </Text>
          </Box>
        ) : (
          // biome-ignore lint/complexity/noUselessFragments: <fragment is required otherwise syntax breaks>
          <>
            {[
              { name: "topLeft", label: "Top Left", icon: RxCornerTopLeft },
              { name: "topRight", label: "Top Right", icon: RxCornerTopRight },
              {
                name: "bottomLeft",
                label: "Bottom Left",
                icon: RxCornerBottomLeft,
              },
              {
                name: "bottomRight",
                label: "Bottom Right",
                icon: RxCornerBottomRight,
              },
            ].map(({ name, label, icon }) => (
              <Box flex="1 1 calc(50% - 4px)" key={name}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" fontSize="0.7em">
                    <Icon as={icon} color="gray.500" />
                  </InputLeftElement>
                  <Input
                    onChange={(e) => {
                      const val = e.target.value
                      setRadiusValue(
                        getUpdatedRadiusValue(
                          radiusValue,
                          name as RadiusDirection,
                          val,
                          radiusMode,
                        ),
                      )
                    }}
                    value={
                      typeof radiusValue === "object"
                        ? (radiusValue?.[name as RadiusDirection] ?? "")
                        : ""
                    }
                    placeholder={label}
                    isInvalid={
                      !!errors?.[propertyName]?.radius?.[
                        name as RadiusDirection
                      ]
                    }
                    fontSize="sm"
                  />
                </InputGroup>
                <Text fontSize="xs" color={errorRed}>
                  {
                    errors?.[propertyName]?.radius?.[name as RadiusDirection]
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
          radiusMode === "uniform"
            ? "Enable individual radius"
            : "Disable individual radius"
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
            radiusMode === "uniform"
              ? "Switch to individual radius"
              : "Switch to uniform radius"
          }
          aria-pressed={radiusMode === "individual"}
          icon={<TbBorderCorners size={20} />}
          padding="0.05em"
          onClick={() => {
            const newRadiusMode =
              radiusMode === "uniform" ? "individual" : "uniform"
            setRadiusValue(
              getUpdatedRadiusValue(
                radiusValue,
                "all",
                JSON.stringify(radiusValue),
                newRadiusMode,
              ),
            )
            setRadiusMode(newRadiusMode)
          }}
          variant="outline"
          color={radiusMode === "individual" ? activeColor : inactiveColor}
        />
      </Tooltip>
    </HStack>
  )
}

export default RadiusInputField
