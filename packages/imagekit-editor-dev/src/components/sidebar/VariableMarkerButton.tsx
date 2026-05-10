import {
  Button,
  Flex,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { type FC, useCallback, useState } from "react"
import { generateVariableName } from "../../variables"

const MAX_LABEL_LENGTH = 64

/**
 * Field types that can be variabilized (single scalar value).
 */
const SUPPORTED_FIELD_TYPES = new Set([
  "input",
  "textarea",
  "switch",
  "slider",
  "color-picker",
  "select",
  "select-creatable",
  "radio-card",
  "checkbox-card",
])

export function canBeVariable(fieldType: string | undefined): boolean {
  return !!fieldType && SUPPORTED_FIELD_TYPES.has(fieldType)
}

interface Props {
  fieldLabel: string
  takenNames: Iterable<string>
  onCreate: (variable: { name: string; label: string }) => void
}

/**
 * A small button shown next to field labels in the sidebar. Clicking opens
 * a popover to name the variable. On save, it generates a collision-free
 * name and calls onCreate.
 */
export const VariableMarkerButton: FC<Props> = ({
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
    <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start" isLazy>
      <PopoverTrigger>
        <IconButton
          aria-label="Make variable"
          icon={<PiBracketsCurly />}
          size="xs"
          variant="ghost"
          opacity={0}
          _groupHover={{ opacity: 1 }}
          onClick={handleOpen}
        />
      </PopoverTrigger>
      <PopoverContent w="260px">
        <PopoverBody p={3}>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="600">
              Create variable
            </Text>
            <IconButton
              aria-label="Close"
              icon={<PiX />}
              size="xs"
              variant="ghost"
              onClick={onClose}
            />
          </Flex>
          <FormControl>
            <FormLabel fontSize="xs">Label</FormLabel>
            <Input
              size="sm"
              value={label}
              onChange={(e) => setLabel(e.target.value.slice(0, MAX_LABEL_LENGTH))}
              placeholder="e.g. Headline text"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
            />
          </FormControl>
          <Button
            size="sm"
            colorScheme="blue"
            mt={3}
            w="full"
            onClick={handleSave}
            isDisabled={!label.trim()}
          >
            Create
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
