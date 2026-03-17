import {
  Avatar,
  Box,
  Checkbox,
  Divider,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
} from "@chakra-ui/react"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import type * as React from "react"
import { useMemo, useState } from "react"

export type MultiSelectListOption = {
  label: string
  value: string
  avatar?: string
  email?: string
  isDisabled?: boolean
}

type MultiSelectListFieldProps = {
  id?: string
  value?: string[]
  options: MultiSelectListOption[]
  onChange: (values: string[]) => void
  maxHeight?: string
  isSearchable?: boolean
  searchPlaceholder?: string
  selectedFirst?: boolean
  showSelectedSeparator?: boolean
}

export const MultiSelectListField: React.FC<MultiSelectListFieldProps> = ({
  id,
  value = [],
  options,
  onChange,
  maxHeight = "300px",
  isSearchable = false,
  searchPlaceholder = "Search...",
  selectedFirst = false,
  showSelectedSeparator = false,
}) => {
  const safeValue = Array.isArray(value) ? value : []
  const [query, setQuery] = useState("")

  const toggleValue = (v: string) => {
    const set = new Set(safeValue)
    if (set.has(v)) {
      set.delete(v)
    } else {
      set.add(v)
    }
    onChange(Array.from(set))
  }

  const { selected, other } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered =
      q.length === 0
        ? options
        : options.filter((o) => {
            const haystack = `${o.label} ${o.email ?? ""}`.toLowerCase()
            return haystack.includes(q)
          })

    if (!selectedFirst) return { selected: filtered, other: [] }

    const selectedOptions: MultiSelectListOption[] = []
    const otherOptions: MultiSelectListOption[] = []
    const selectedSet = new Set(safeValue)
    for (const opt of filtered) {
      ;(selectedSet.has(opt.value) ? selectedOptions : otherOptions).push(opt)
    }
    return { selected: selectedOptions, other: otherOptions }
  }, [options, query, safeValue, selectedFirst])

  const shouldRenderSeparator =
    selectedFirst && showSelectedSeparator && selected.length > 0 && other.length > 0

  const renderOption = (opt: MultiSelectListOption, idx: number, arrLen: number) => {
    const isChecked = safeValue.includes(opt.value)
    const disabled = opt.isDisabled

    return (
      <HStack
        key={opt.value}
        px="3"
        py="2.5"
        spacing="3"
        cursor={disabled ? "not-allowed" : "pointer"}
        opacity={disabled ? 0.5 : 1}
        onClick={() => {
          if (!disabled) toggleValue(opt.value)
        }}
        _hover={{
          bg: disabled ? undefined : "gray.50",
        }}
        borderBottomWidth={idx < arrLen - 1 ? "1px" : "0"}
        borderBottomColor="gray.100"
        transition="background-color 0.12s ease-in-out"
      >
        <Checkbox
          isChecked={isChecked}
          isDisabled={disabled}
          onChange={() => {
            if (!disabled) toggleValue(opt.value)
          }}
          pointerEvents="none"
          flexShrink={0}
        />

        <Avatar
          size="xs"
          name={opt.label}
          src={opt.avatar}
          flexShrink={0}
        />

        <Flex direction="column" minW={0} flex="1">
          <Text fontSize="sm" fontWeight="500" noOfLines={1}>
            {opt.label}
          </Text>
          {opt.email && (
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {opt.email}
            </Text>
          )}
        </Flex>
      </HStack>
    )
  }

  const renderedCount = selectedFirst ? selected.length + other.length : selected.length

  return (
    <Box
      id={id}
      role="group"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
      bg="white"
    >
      {isSearchable ? (
        <Box px="3" py="2.5" borderBottomWidth="1px" borderBottomColor="gray.100">
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={PiMagnifyingGlass} color="gray.400" boxSize={4} />
            </InputLeftElement>
            <Input
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              bg="gray.50"
              borderColor="gray.200"
              _hover={{ borderColor: "gray.300" }}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px #3182ce",
              }}
            />
          </InputGroup>
        </Box>
      ) : null}

      <Box overflowY="auto" maxH={maxHeight}>
        {selectedFirst ? (
          <>
            {selected.map((opt, idx) => renderOption(opt, idx, selected.length))}
            {shouldRenderSeparator ? <Divider borderColor="gray.200" /> : null}
            {other.map((opt, idx) => renderOption(opt, idx, other.length))}
          </>
        ) : (
          selected.map((opt, idx) => renderOption(opt, idx, selected.length))
        )}

        {renderedCount === 0 && (
          <Flex align="center" justify="center" px="3" py="8" color="gray.500">
            <Text fontSize="sm">{query.trim() ? "No matches found" : "No items available"}</Text>
          </Flex>
        )}
      </Box>
    </Box>
  )
}

export default MultiSelectListField
