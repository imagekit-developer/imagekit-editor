import {
  Badge,
  Box,
  Flex,
  IconButton,
  Input,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { type FC } from "react"

interface Props {
  /** The variable label (human-readable). */
  label: string
  /** The variable's stable name (`$var`). Shown for reference. */
  name: string
  /** Optional default value the variable resolves to when no override exists. */
  defaultValue: unknown
  /** Called with the new default value when the user edits it inline. */
  onDefaultValueChange: (next: string) => void
  /** Remove the variable marker and restore the field to a plain input. */
  onRemove: () => void
}

/**
 * Renders in place of a regular field input when the field has been bound to
 * a template variable. Shows the variable label/name, lets the user edit the
 * default value inline, and offers a "remove variable" affordance.
 */
export const VariableChip: FC<Props> = ({
  label,
  name,
  defaultValue,
  onDefaultValueChange,
  onRemove,
}) => {
  const defaultStr =
    defaultValue == null || typeof defaultValue === "object"
      ? ""
      : String(defaultValue)

  return (
    <Box
      borderWidth="1px"
      borderColor="editorBlue.300"
      bg="editorBlue.50"
      borderRadius="md"
      px={2}
      py={2}
    >
      <Flex align="center" justify="space-between" mb={1}>
        <Flex align="center" gap={1.5} minW={0}>
          <PiBracketsCurly />
          <Tooltip label={`{{${name}}}`} hasArrow placement="top">
            <Badge
              colorScheme="blue"
              fontSize="xs"
              textTransform="none"
              maxW="180px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {label}
            </Badge>
          </Tooltip>
        </Flex>
        <Tooltip label="Remove variable" hasArrow placement="top">
          <IconButton
            aria-label="Remove variable"
            icon={<PiX />}
            size="xs"
            variant="ghost"
            onClick={onRemove}
          />
        </Tooltip>
      </Flex>
      <Text fontSize="xs" color="gray.600" mb={1}>
        Default value
      </Text>
      <Input
        size="sm"
        value={defaultStr}
        onChange={(e) => onDefaultValueChange(e.target.value)}
        placeholder="No default — leave empty"
        bg="white"
      />
    </Box>
  )
}
