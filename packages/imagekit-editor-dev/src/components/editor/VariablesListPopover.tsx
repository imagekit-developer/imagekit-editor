import {
  Badge,
  Box,
  Divider,
  Flex,
  HStack,
  Icon,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  VStack,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import type { FC } from "react"

/**
 * The popover's row shape is intentionally narrow (no schema field types)
 * so importing it into `ActionBar.tsx` doesn't drag the large
 * `TransformationField` union into that file's JSX inference and trip
 * "union type too complex to represent".
 */
export interface VariableListEntry {
  name: string
  label: string
  defaultValue?: unknown
  description?: string
  stepName: string
  fieldLabel: string
}

interface VariablesListPopoverProps {
  entries: VariableListEntry[]
}

/**
 * Read-only popover that lists every template variable defined in the
 * current canvas. Lives in its own file so the (already large) Chakra
 * style-prop unions in `ActionBar.tsx` don't blow past TypeScript's
 * inference budget when this UI is added.
 */
export const VariablesListPopover: FC<VariablesListPopoverProps> = ({
  entries,
}) => {
  const count = entries.length
  return (
    <Popover placement="bottom-start" isLazy>
      <PopoverTrigger>
        <HStack
          as="button"
          type="button"
          spacing="1"
          px="2"
          py="1"
          borderRadius="md"
          color="gray.700"
          cursor="pointer"
          _hover={{ bg: "gray.100" }}
          aria-label={
            count === 0
              ? "No template variables defined"
              : `View ${count} template variable${count === 1 ? "" : "s"}`
          }
        >
          <Icon as={PiBracketsCurly} boxSize={4} />
          <Text fontSize="sm" fontWeight="medium">
            Variables
          </Text>
          <Badge
            colorScheme={count > 0 ? "purple" : "gray"}
            borderRadius="full"
            px="2"
          >
            {count}
          </Badge>
        </HStack>
      </PopoverTrigger>
      <PopoverContent width="360px" maxH="400px" overflow="hidden">
        <PopoverArrow />
        <PopoverHeader fontSize="sm" fontWeight="semibold">
          Template variables{" "}
          <Text as="span" color="gray.500" fontWeight="normal">
            ({count})
          </Text>
        </PopoverHeader>
        <PopoverBody p="0" overflowY="auto" maxH="340px">
          {count === 0 ? (
            <Box p="4">
              <Text fontSize="sm" color="gray.600">
                No variables yet. Hover any field label in the sidebar and
                click{" "}
                <Text as="span" fontFamily="mono">
                  {"{}"}
                </Text>{" "}
                to make it a variable.
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" spacing="0" divider={<Divider />}>
              {entries.map((v) => {
                // Render the marker's default in a way that's safe for any
                // value the user may have stored — strings, numbers, and
                // JSON-serialisable composites all become readable text.
                const hasDefault =
                  v.defaultValue !== undefined &&
                  v.defaultValue !== null &&
                  v.defaultValue !== ""
                const defaultPreview = hasDefault
                  ? typeof v.defaultValue === "string"
                    ? v.defaultValue
                    : JSON.stringify(v.defaultValue)
                  : null
                return (
                  <Box key={v.name} px="3" py="2">
                    <Flex align="baseline" justify="space-between" gap="2">
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        noOfLines={1}
                      >
                        {v.label}
                      </Text>
                      <Text
                        fontSize="xs"
                        fontFamily="mono"
                        color="purple.600"
                        flexShrink={0}
                      >
                        ${v.name}
                      </Text>
                    </Flex>
                    <Text fontSize="xs" color="gray.600" mt="0.5">
                      {v.stepName} · {v.fieldLabel}
                    </Text>
                    {defaultPreview !== null && (
                      <Text
                        fontSize="xs"
                        color="gray.700"
                        mt="1"
                        noOfLines={1}
                      >
                        <Text as="span" color="gray.500">
                          Default:{" "}
                        </Text>
                        <Text as="span" fontFamily="mono">
                          {defaultPreview}
                        </Text>
                      </Text>
                    )}
                    {v.description && (
                      <Text
                        fontSize="xs"
                        color="gray.600"
                        mt="1"
                        noOfLines={2}
                      >
                        {v.description}
                      </Text>
                    )}
                  </Box>
                )
              })}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
