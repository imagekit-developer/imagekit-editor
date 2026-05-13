import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Input,
  List,
  ListItem,
  Text,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useEditorStore } from "../../store"

type VariableInputMode = "fixed" | "variable"

interface VariableInputProps {
  /** The label text for the field */
  label: ReactNode
  /** Current raw value (may be `{{token}}` or a plain value) */
  value: string
  /** Called with the new raw value */
  onChange: (value: string) => void
  /** Rendered when in "fixed" mode — the normal control (Select, Input, Slider, etc.) */
  children: ReactNode
  /** Placeholder shown in variable mode input */
  placeholder?: string
  /** Extra content placed next to the label (help icon, etc.) */
  labelRight?: ReactNode
  /** If true, the field is disabled */
  disabled?: boolean
  /** react-hook-form register name, used for id */
  name?: string
}

const VARIABLE_REF_RE = /^\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}$/

function detectMode(value: string): VariableInputMode {
  return VARIABLE_REF_RE.test(value) ? "variable" : "fixed"
}

export function VariableInput({
  label,
  value,
  onChange,
  children,
  placeholder,
  labelRight,
  disabled,
  name,
}: VariableInputProps) {
  const dynamicVariables = useEditorStore((s) => s.dynamicVariables)
  const setIsVariablesModalOpen = useEditorStore(
    (s) => s.setIsVariablesModalOpen,
  )
  const [mode, setMode] = useState<VariableInputMode>(() => detectMode(value))
  const [localValue, setLocalValue] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync localValue from external value changes only when not actively editing
  useEffect(() => {
    if (inputRef.current !== document.activeElement) {
      setLocalValue(value)
    }
  }, [value])

  // Variable tokens for autocomplete
  const variableTokens = useMemo(
    () =>
      dynamicVariables
        .filter((v) => v.name.trim())
        .map((v) => ({
          name: v.name,
          displayLabel: v.displayLabel || v.name,
          ref: `{{${v.name}}}`,
        })),
    [dynamicVariables],
  )

  // Filter based on what's typed
  const filtered = useMemo(() => {
    if (!showDropdown) return []
    // Extract partial token: everything after the last {{
    const lastOpen = localValue.lastIndexOf("{{")
    if (lastOpen === -1) return variableTokens
    const partial = localValue.slice(lastOpen + 2).replace(/\}\}.*$/, "")
    if (!partial) return variableTokens
    const lower = partial.toLowerCase().trim()
    return variableTokens.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.displayLabel.toLowerCase().includes(lower),
    )
  }, [showDropdown, localValue, variableTokens])

  // Reset selection when filtered list shrinks past the current index
  useEffect(() => {
    if (selectedIdx >= filtered.length) {
      setSelectedIdx(0)
    }
  }, [filtered.length, selectedIdx])

  const switchToVariable = useCallback(() => {
    setMode("variable")
    const initial = VARIABLE_REF_RE.test(value) ? value : ""
    setLocalValue(initial)
    setShowDropdown(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [value])

  const switchToFixed = useCallback(() => {
    setMode("fixed")
    // If value was a variable ref, clear it
    if (VARIABLE_REF_RE.test(value)) {
      onChange("")
    }
    setShowDropdown(false)
  }, [value, onChange])

  const insertVariable = useCallback(
    (token: string) => {
      const ref = `{{${token}}}`
      setLocalValue(ref)
      onChange(ref)
      setShowDropdown(false)
      inputRef.current?.focus()
    },
    [onChange],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setLocalValue(v)
      // Only propagate to parent when value is a complete variable ref or has no template markers
      if (VARIABLE_REF_RE.test(v) || !v.includes("{{")) {
        onChange(v)
      }
      // Show dropdown when {{ is typed
      if (v.includes("{{")) {
        setShowDropdown(true)
      } else {
        setShowDropdown(false)
      }
    },
    [onChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return
      if (e.key === "Escape") {
        setShowDropdown(false)
        return
      }
      if (filtered.length === 0) return
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIdx((prev) => Math.max(prev - 1, 0))
      } else if (e.key === "Enter" && filtered[selectedIdx]) {
        e.preventDefault()
        insertVariable(filtered[selectedIdx].name)
      }
    },
    [showDropdown, filtered, selectedIdx, insertVariable],
  )

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <Box>
      {/* Label row with Fixed / Variable toggle */}
      <Flex align="center" justify="space-between" mb="1.5">
        <Flex align="center" gap="1.5">
          <Text as="label" fontSize="sm" htmlFor={name}>
            {label}
          </Text>
          {labelRight}
        </Flex>
        <ButtonGroup size="xs" isAttached variant="outline" spacing={0}>
          <Button
            fontSize="11px"
            fontWeight={mode === "fixed" ? "semibold" : "normal"}
            bg={mode === "fixed" ? "white" : "transparent"}
            borderColor="editorGray.300"
            color={
              mode === "fixed" ? "editorGray.800" : "editorBattleshipGrey.400"
            }
            onClick={switchToFixed}
            _hover={{
              bg: mode === "fixed" ? "white" : "editorGray.50",
            }}
            borderRightRadius={0}
            px="2"
            h="22px"
            isDisabled={disabled}
          >
            Fixed
          </Button>
          <Button
            fontSize="11px"
            fontWeight={mode === "variable" ? "semibold" : "normal"}
            bg={mode === "variable" ? "white" : "transparent"}
            borderColor="editorGray.300"
            color={
              mode === "variable"
                ? "editorGray.800"
                : "editorBattleshipGrey.400"
            }
            onClick={switchToVariable}
            _hover={{
              bg: mode === "variable" ? "white" : "editorGray.50",
            }}
            borderLeftRadius={0}
            px="2"
            h="22px"
            isDisabled={disabled}
          >
            Variable
          </Button>
        </ButtonGroup>
      </Flex>

      {/* Control area */}
      {mode === "fixed" ? (
        children
      ) : (
        <Box position="relative">
          <Flex align="center">
            <Flex
              align="center"
              justify="center"
              bg="editorGray.100"
              borderWidth="1px"
              borderColor="editorGray.300"
              borderRightWidth={0}
              borderLeftRadius="md"
              px="2"
              h="32px"
              color="blue.500"
              flexShrink={0}
            >
              <PiBracketsCurly size={14} />
            </Flex>
            <Input
              ref={inputRef}
              id={name}
              value={localValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setShowDropdown(true)
              }}
              autoComplete="off"
              placeholder={placeholder || "{{variable_name}}"}
              fontSize="sm"
              fontFamily="mono"
              borderLeftRadius={0}
              h="32px"
              borderColor="editorGray.300"
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              isDisabled={disabled}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls={`${name}-listbox`}
              aria-activedescendant={
                showDropdown && filtered[selectedIdx]
                  ? `${name}-option-${selectedIdx}`
                  : undefined
              }
            />
          </Flex>

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <Box
              ref={dropdownRef}
              position="absolute"
              top="100%"
              left="0"
              right="0"
              mt="1"
              bg="white"
              borderWidth="1px"
              borderColor="editorGray.200"
              borderRadius="md"
              boxShadow="lg"
              zIndex={20}
              maxH="240px"
              overflowY="auto"
            >
              {filtered.length > 0 && (
                <>
                  <Text
                    fontSize="10px"
                    fontWeight="bold"
                    color="editorBattleshipGrey.400"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    px="3"
                    pt="2"
                    pb="1"
                  >
                    Variables
                  </Text>
                  <List spacing={0} role="listbox" id={`${name}-listbox`}>
                    {filtered.map((token, idx) => (
                      <ListItem
                        key={token.name}
                        id={`${name}-option-${idx}`}
                        role="option"
                        aria-selected={idx === selectedIdx}
                        px="3"
                        py="1.5"
                        cursor="pointer"
                        bg={idx === selectedIdx ? "blue.50" : "transparent"}
                        _hover={{ bg: "blue.50" }}
                        onClick={() => insertVariable(token.name)}
                        display="flex"
                        alignItems="center"
                        gap="2"
                      >
                        <Text
                          fontFamily="mono"
                          fontSize="xs"
                          color="blue.600"
                          bg="blue.50"
                          px="1.5"
                          py="0.5"
                          borderRadius="sm"
                          whiteSpace="nowrap"
                        >
                          {`{{${token.name}}}`}
                        </Text>
                        {token.displayLabel !== token.name && (
                          <Text
                            fontSize="xs"
                            color="editorBattleshipGrey.500"
                            noOfLines={1}
                          >
                            {token.displayLabel}
                          </Text>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
              <Box
                px="3"
                py="2"
                cursor="pointer"
                borderTopWidth={filtered.length > 0 ? "1px" : "0"}
                borderColor="editorGray.200"
                _hover={{ bg: "editorGray.50" }}
                onClick={() => {
                  setShowDropdown(false)
                  setIsVariablesModalOpen(true)
                }}
                display="flex"
                alignItems="center"
                gap="2"
              >
                <Flex
                  align="center"
                  justify="center"
                  w="18px"
                  h="18px"
                  borderRadius="sm"
                  bg="blue.50"
                  color="blue.500"
                  flexShrink={0}
                >
                  <PiPlus size={10} />
                </Flex>
                <Text fontSize="xs" fontWeight="medium" color="blue.600">
                  Create new variable
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
