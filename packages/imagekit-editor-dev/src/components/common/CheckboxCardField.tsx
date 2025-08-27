import {
  Box,
  Flex,
  HStack,
  Icon,
  Text,
  useColorModeValue,
} from "@chakra-ui/react"
import type * as React from "react"

type CheckboxCardOption = {
  label: string
  value: string
  icon?: React.ReactNode
  isDisabled?: boolean
}

type CheckboxCardFieldProps = {
  id?: string
  value?: string[]
  options: CheckboxCardOption[]
  onChange: (values: string[]) => void
  columns?: number
  maxSelections?: number
}

const toggleValue = (
  current: string[] = [],
  v: string,
  max?: number,
): string[] => {
  const set = new Set(current)
  if (set.has(v)) {
    set.delete(v)
    return Array.from(set)
  }
  // add
  if (typeof max === "number" && current.length >= max) return current
  set.add(v)
  return Array.from(set)
}

export const CheckboxCardField: React.FC<CheckboxCardFieldProps> = ({
  id,
  value = [],
  options,
  onChange,
  columns = 3,
  maxSelections,
}) => {
  const selectedBg = useColorModeValue("blue.50", "blue.900")
  const selectedBorder = useColorModeValue("blue.400", "blue.300")
  const hoverBg = useColorModeValue("gray.50", "whiteAlpha.100")
  const isMaxed =
    typeof maxSelections === "number" && value.length >= maxSelections

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    v: string,
    disabled?: boolean,
  ) => {
    if (disabled) return
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      onChange(toggleValue(value, v, maxSelections))
    }
  }

  return (
    <HStack
      as="fieldset"
      id={id}
      role="group"
      align="stretch"
      spacing="2"
      wrap="wrap"
      sx={{
        "& > [data-checkbox-card]": {
          flexBasis: `calc(${100 / columns}% - 8px)`,
          minWidth: 0,
        },
      }}
    >
      {options.map((opt) => {
        const isChecked = value.includes(opt.value)
        const disabled = opt.isDisabled || (!isChecked && isMaxed)
        return (
          <Box
            key={opt.value}
            data-checkbox-card
            role="checkbox"
            aria-checked={isChecked}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            onClick={() => {
              if (disabled) return
              onChange(toggleValue(value, opt.value, maxSelections))
            }}
            onKeyDown={(e) => handleKeyDown(e, opt.value, disabled)}
            cursor={disabled ? "not-allowed" : "pointer"}
            opacity={disabled ? 0.5 : 1}
            borderWidth="1px"
            borderRadius="md"
            p="2"
            transition="all 0.12s ease-in-out"
            borderColor={isChecked ? selectedBorder : "gray.200"}
            bg={isChecked ? selectedBg : "transparent"}
            _hover={{
              bg: disabled ? undefined : isChecked ? selectedBg : hoverBg,
            }}
            _focusVisible={{
              boxShadow: "0 0 0 2px var(--chakra-colors-blue-400)",
              outline: "none",
            }}
          >
            <Flex align="center" gap="2">
              {opt.icon ? <Icon as={opt.icon as any} boxSize="16px" /> : null}
              <Text fontSize="sm" noOfLines={1}>
                {opt.label}
              </Text>
            </Flex>
          </Box>
        )
      })}
    </HStack>
  )
}

export default CheckboxCardField
