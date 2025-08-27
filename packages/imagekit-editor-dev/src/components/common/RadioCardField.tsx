import {
  Box,
  Flex,
  HStack,
  Icon,
  Text,
  useColorModeValue,
} from "@chakra-ui/react"
import type * as React from "react"

type RadioCardOption = {
  label: string
  value: string
  icon?: React.ReactNode
}

type RadioCardFieldProps = {
  id?: string
  value?: string | null
  options: RadioCardOption[]
  onChange: (value: string) => void
  columns?: number
}

export const RadioCardField: React.FC<RadioCardFieldProps> = ({
  id,
  value,
  options,
  onChange,
  columns = 3,
}) => {
  const selectedBg = useColorModeValue("blue.50", "blue.900")
  const selectedBorder = useColorModeValue("blue.400", "blue.300")
  const hoverBg = useColorModeValue("gray.50", "whiteAlpha.100")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, v: string) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      onChange(v)
    }
  }

  return (
    <HStack
      id={id}
      role="radiogroup"
      align="stretch"
      spacing="2"
      wrap="wrap"
      // simple responsive columns
      sx={{
        "& > [data-radio-card]": {
          flexBasis: `calc(${100 / columns}% - 8px)`,
          minWidth: 0,
        },
      }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value
        return (
          <Box
            key={opt.value}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : 0} // all focusable; change to -1 for roving focus if desired
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, opt.value)}
            cursor="pointer"
            borderWidth="1px"
            borderRadius="md"
            p="2"
            transition="all 0.12s ease-in-out"
            borderColor={isSelected ? selectedBorder : "gray.200"}
            bg={isSelected ? selectedBg : "transparent"}
            _hover={{ bg: isSelected ? selectedBg : hoverBg }}
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

export default RadioCardField
