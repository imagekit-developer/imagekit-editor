import {
  Badge,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiPencilSimple } from "@react-icons/all-files/pi/PiPencilSimple"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { type FC, useCallback, useState } from "react"
import { generateVariableName } from "../../variables"

/**
 * Soft cap on the user-facing label. The slug derived from this label is
 * already capped to 32 chars in `slugifyLabel`; capping the input itself
 * keeps the UX predictable and prevents pathological pastes from blowing
 * out the chip / popover layout.
 */
const MAX_LABEL_LENGTH = 64

/**
 * Field types whose value is a single scalar and therefore safe to expose as
 * a template variable. Composite fields (gradient picker, padding/perspective/
 * radius inputs) describe sub-trees rather than a single override value, so
 * v1 of the variables feature deliberately does not surface a make-variable
 * affordance for them. They can be added later, one at a time, with explicit
 * sub-key selection.
 */
const VARIABLIZABLE_FIELD_TYPES = new Set([
  "input",
  "textarea",
  "switch",
  "slider",
  "color-picker",
  "select",
  "select-creatable",
  "radio-card",
  "checkbox-card",
  "anchor",
  "zoom",
])

/** Whether a field can be made into a variable based on its `fieldType`. */
export function isVariablizableFieldType(fieldType: string | undefined) {
  return !!fieldType && VARIABLIZABLE_FIELD_TYPES.has(fieldType)
}

interface MakeVariableButtonProps {
  /** The field this button might variabilize (used for the suggested label). */
  fieldLabel: string
  /** Names already taken inside this template (for collision-proof generation). */
  takenNames: Iterable<string>
  /** Called with the freshly generated variable when the user confirms. */
  onCreate: (variable: { name: string; label: string }) => void
}

/**
 * Hover-revealed `{}` icon shown next to a field label inside the
 * transformation config sidebar. Clicking opens a small popover with a single
 * Label input and a Save CTA. On Save, a collision-proof variable name is
 * generated from the label and the field's current literal value is captured
 * as the new variable's default.
 *
 * The button itself does NOT mutate the editor store. The parent (sidebar)
 * receives the new variable record via `onCreate` and is responsible for
 * threading it through the form's bind state and the eventual Apply commit,
 * so the variable is persisted exactly when (and only when) the user clicks
 * Apply — the same commit point as every other field change.
 */
export const MakeVariableButton: FC<MakeVariableButtonProps> = ({
  fieldLabel,
  takenNames,
  onCreate,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [label, setLabel] = useState(fieldLabel)

  const handleOpen = useCallback(() => {
    setLabel(fieldLabel)
    onOpen()
  }, [fieldLabel, onOpen])

  const handleSave = () => {
    const trimmed = label.trim() || fieldLabel
    const name = generateVariableName(trimmed, takenNames)
    onCreate({ name, label: trimmed })
    onClose()
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpen={handleOpen}
      onClose={onClose}
      placement="bottom-end"
    >
      <PopoverTrigger>
        <IconButton
          icon={<PiBracketsCurly />}
          aria-label="Make this field a variable"
          size="xs"
          variant="ghost"
          color="purple.600"
          // Show only on the parent FormLabel hover; the parent gives this
          // group an opacity controlled by `_groupHover`.
          opacity={isOpen ? 1 : 0}
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.1s"
        />
      </PopoverTrigger>
      <PopoverContent width="280px" zIndex={1500}>
        <PopoverBody p="3">
          <VStack align="stretch" spacing="3">
            <Text fontSize="xs" color="gray.600">
              Make this field a template variable. Hosts override its value
              at URL build time. In the editor preview the URL will contain
              the literal token{" "}
              <Text as="span" fontFamily="mono">
                $name
              </Text>
              .
            </Text>
            <FormControl>
              <FormLabel fontSize="xs" mb="1">
                Variable label
              </FormLabel>
              <Input
                size="sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                maxLength={MAX_LABEL_LENGTH}
                autoFocus
              />
              <FormHelperText fontSize="xs" color="gray.500">
                A unique name will be auto-generated from this label.
              </FormHelperText>
            </FormControl>
            <HStack justify="flex-end" spacing="2">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" colorScheme="purple" onClick={handleSave}>
                Save variable
              </Button>
            </HStack>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}

interface BoundVariableChipProps {
  /** The marker stored in the field — drives chip text + edit popover state. */
  variable: { $var: string; label: string }
  /** Called when the user edits the label via the chip's edit popover. */
  onRename: (newLabel: string) => void
  /** Called when the user clicks the unbind X. */
  onUnbind: () => void
}

/**
 * Read-only stand-in for a field's normal input when the field is bound to a
 * template variable. Shows `${label}` plus the resolved default that the
 * editor preview is using, and exposes inline edit/unbind actions.
 *
 * The actual input control is hidden while a field is bound: editing the
 * literal value would silently overwrite the marker, which is exactly the
 * footgun the variables feature exists to prevent. Hosts override the value
 * at runtime via the `overrides` map, not by typing into the editor.
 */
export const BoundVariableChip: FC<BoundVariableChipProps> = ({
  variable,
  onRename,
  onUnbind,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [label, setLabel] = useState(variable.label)

  const handleSave = () => {
    const trimmed = label.trim()
    if (trimmed && trimmed !== variable.label) onRename(trimmed)
    onClose()
  }

  return (
    <Flex
      align="center"
      gap="2"
      borderWidth="1px"
      borderColor="purple.200"
      bg="purple.50"
      borderRadius="md"
      px="3"
      py="2"
      minW="0"
      overflow="hidden"
    >
      <Badge
        colorScheme="purple"
        fontSize="11px"
        maxW="50%"
        isTruncated
        title={`$${variable.$var}`}
      >
        ${variable.$var}
      </Badge>
      <Text fontSize="xs" color="gray.700" isTruncated flex="1">
        {variable.label}
      </Text>
      <Popover
        isOpen={isOpen}
        onOpen={() => {
          setLabel(variable.label)
          onOpen()
        }}
        onClose={onClose}
        placement="bottom-end"
      >
        <PopoverTrigger>
          <IconButton
            icon={<PiPencilSimple />}
            aria-label="Edit variable"
            size="xs"
            variant="ghost"
          />
        </PopoverTrigger>
        <PopoverContent width="240px" zIndex={1500}>
          <PopoverBody p="3">
            <VStack align="stretch" spacing="2">
              <FormControl>
                <FormLabel fontSize="xs" mb="1">
                  Label
                </FormLabel>
                <Input
                  size="sm"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSave()
                    }
                  }}
                  maxLength={MAX_LABEL_LENGTH}
                  autoFocus
                />
                <FormHelperText fontSize="xs" color="gray.500">
                  Variable name <code>${variable.$var}</code> stays the same.
                </FormHelperText>
              </FormControl>
              <HStack justify="flex-end">
                <Button size="sm" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" colorScheme="purple" onClick={handleSave}>
                  Save
                </Button>
              </HStack>
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
      <IconButton
        icon={<PiX />}
        aria-label="Unbind variable"
        size="xs"
        variant="ghost"
        onClick={onUnbind}
      />
    </Flex>
  )
}


