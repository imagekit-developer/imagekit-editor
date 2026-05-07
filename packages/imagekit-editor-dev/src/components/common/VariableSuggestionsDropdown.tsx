import {
  Box,
  type BoxProps,
  Divider,
  Flex,
  Text,
  VStack,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiRuler } from "@react-icons/all-files/pi/PiRuler"
import { PiSigma } from "@react-icons/all-files/pi/PiSigma"
import type React from "react"
import {
  DEFAULT_IMAGE_DIMENSION_VARIABLES,
  DEFAULT_OPERATORS,
  startsWithImageDimPrefix,
} from "./variableSuggestions"
import type {
  ImageDimensionVariableSuggestion,
  UserVariableSuggestion,
  VariableSuggestion,
  VariableSuggestionOperator,
} from "./variableSuggestionTypes"

const suggestionRowProps = {
  px: 3,
  py: 2,
  rounded: "md",
  cursor: "pointer",
  transition: "background-color 0.12s",
  _hover: { bg: "editorGray.200" },
} satisfies BoxProps

const CodePill: React.FC<{
  tone: "user" | "img"
  children: React.ReactNode
}> = ({ tone, children }) => (
  <Box
    fontSize="xs"
    fontFamily="mono"
    fontWeight="semibold"
    px="2"
    py="0.5"
    rounded="sm"
    flexShrink={0}
    bg={tone === "img" ? "editorBlue.50" : "editorPale"}
    color={tone === "img" ? "editorBlue.700" : "editorBattleshipGrey.800"}
    borderWidth="1px"
    borderColor={tone === "img" ? "editorBlue.100" : "editorYellowOrange"}
  >
    {children}
  </Box>
)

export interface VariableSuggestionsDropdownProps {
  /**
   * The free-form user input that triggered this dropdown (used for ordering).
   * - When it starts with i/c/b, image dimension vars show first.
   * - Otherwise, user vars show first.
   */
  query: string
  /**
   * When false, only user variables are shown (no image dims, no operators).
   * Intended for "opened via focus" behavior.
   */
  showAdvanced?: boolean
  showOperators?: boolean
  /**
   * Which set of items should participate in keyboard highlight navigation.
   * - "default": image vars + user vars only (operators are clickable but not highlighted)
   * - "operators": only operators are highlightable (for operator-triggered queries)
   */
  highlightMode?: "default" | "operators"
  userVariables: UserVariableSuggestion[]
  imageDimensionVariables?: ImageDimensionVariableSuggestion[]
  operators?: Array<{
    operator: VariableSuggestionOperator
    symbol: string
    label: string
  }>
  onSelect: (suggestion: VariableSuggestion) => void
  highlightedIndex?: number
  onHoverIndex?: (index: number) => void
}

/**
 * A lightweight dropdown list (render-only) used to insert:
 * - user-defined variables ({{uuid}} + resolved value)
 * - image dimension variables (iw/ih/cw/... + resolved value)
 * - a fixed operator strip
 *
 * The parent is expected to handle positioning (Popover/Menu/etc) and keyboard nav.
 */
export function VariableSuggestionsDropdown({
  query,
  showAdvanced = true,
  showOperators = true,
  highlightMode = "default",
  userVariables,
  imageDimensionVariables = DEFAULT_IMAGE_DIMENSION_VARIABLES,
  operators = DEFAULT_OPERATORS,
  onSelect,
  highlightedIndex,
  onHoverIndex,
}: VariableSuggestionsDropdownProps) {
  const showImageFirst = startsWithImageDimPrefix(query)

  // Items that are eligible for keyboard highlight cycling.
  // Operators are intentionally excluded (they're a fixed footer; arrow keys should
  // navigate variables and scroll the list, not land on operators).
  const items: VariableSuggestion[] = []
  if (highlightMode === "operators") {
    operators.forEach((op) =>
      items.push({ kind: "operator", operator: op.operator }),
    )
  } else if (!showAdvanced) {
    userVariables.forEach((v) =>
      items.push({ kind: "userVariable", variableId: v.id }),
    )
  } else if (showImageFirst) {
    imageDimensionVariables.forEach((v) =>
      items.push({ kind: "imageDimension", code: v.code }),
    )
    userVariables.forEach((v) =>
      items.push({ kind: "userVariable", variableId: v.id }),
    )
  } else {
    userVariables.forEach((v) =>
      items.push({ kind: "userVariable", variableId: v.id }),
    )
    imageDimensionVariables.forEach((v) =>
      items.push({ kind: "imageDimension", code: v.code }),
    )
  }

  const indexOfSuggestion = (s: VariableSuggestion) =>
    items.findIndex((x) => JSON.stringify(x) === JSON.stringify(s))

  const isHighlighted = (s: VariableSuggestion) =>
    highlightedIndex !== undefined && highlightedIndex === indexOfSuggestion(s)

  const imgRows = (
    <VStack align="stretch" spacing="1">
      <Flex px="3" pt="2" pb="1" align="center" gap="2">
        <Box
          w="18px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="editorBattleshipGrey.700"
          flexShrink={0}
        >
          <PiRuler />
        </Box>
        <Text
          fontSize="xs"
          color="editorBattleshipGrey.700"
          fontWeight="semibold"
        >
          Image dimensions
        </Text>
      </Flex>
      {imageDimensionVariables.map((v) => (
        <Box
          key={v.code}
          {...suggestionRowProps}
          bg={
            isHighlighted({ kind: "imageDimension", code: v.code })
              ? "editorGray.200"
              : "transparent"
          }
          data-sidx={indexOfSuggestion({
            kind: "imageDimension",
            code: v.code,
          })}
          onMouseDown={(e) => {
            // Prevent input blur before selection.
            e.preventDefault()
          }}
          onMouseEnter={() => {
            const idx = indexOfSuggestion({
              kind: "imageDimension",
              code: v.code,
            })
            if (idx >= 0) onHoverIndex?.(idx)
          }}
          onClick={() => onSelect({ kind: "imageDimension", code: v.code })}
        >
          <Flex align="center" gap="2">
            <CodePill tone="img">{v.code}</CodePill>
            <Text
              fontSize="sm"
              color="editorBattleshipGrey.800"
              noOfLines={1}
              flex="1"
              minW={0}
            >
              {v.label}
            </Text>
            <Text
              fontSize="sm"
              fontFamily="mono"
              color="editorBattleshipGrey.800"
              flexShrink={0}
              textAlign="right"
              minW="92px"
            >
              {v.resolvedValue}
            </Text>
          </Flex>
        </Box>
      ))}
    </VStack>
  )

  const userRows = (
    <VStack align="stretch" spacing="1">
      <Flex px="3" pt="2" pb="1" align="center" gap="2">
        <Box
          w="18px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="editorBattleshipGrey.700"
          flexShrink={0}
        >
          <PiBracketsCurly />
        </Box>
        <Text
          fontSize="xs"
          color="editorBattleshipGrey.700"
          fontWeight="semibold"
        >
          Variables
        </Text>
      </Flex>
      {userVariables.length === 0 ? (
        <Box px="3" py="2">
          <Text fontSize="sm" color="editorBattleshipGrey.600">
            No variables yet
          </Text>
        </Box>
      ) : (
        userVariables.map((v) => (
          <Box
            key={v.id}
            {...suggestionRowProps}
            bg={
              isHighlighted({ kind: "userVariable", variableId: v.id })
                ? "editorGray.200"
                : "transparent"
            }
            data-sidx={indexOfSuggestion({
              kind: "userVariable",
              variableId: v.id,
            })}
            onMouseDown={(e) => {
              e.preventDefault()
            }}
            onMouseEnter={() => {
              const idx = indexOfSuggestion({
                kind: "userVariable",
                variableId: v.id,
              })
              if (idx >= 0) onHoverIndex?.(idx)
            }}
            onClick={() => onSelect({ kind: "userVariable", variableId: v.id })}
          >
            <Flex align="center" gap="2">
              <CodePill tone="user">{`{{${v.name}}}`}</CodePill>
              <Text
                fontSize="sm"
                fontFamily="mono"
                color="editorBattleshipGrey.800"
                flex="1"
                minW={0}
                noOfLines={1}
              >
                {v.resolvedValue}
              </Text>
            </Flex>
          </Box>
        ))
      )}
    </VStack>
  )

  return (
    <Box
      w="360px"
      maxW="min(92vw, 380px)"
      bg="white"
      borderWidth="1px"
      borderColor="editorGray.300"
      rounded="lg"
      shadow="lg"
      overflow="hidden"
    >
      {highlightMode !== "operators" ? (
        <Box maxH="220px" overflowY="auto" px="1" py="1">
          {!showAdvanced ? (
            userRows
          ) : showImageFirst ? (
            <>
              {imgRows}
              <Divider my="2" borderColor="editorGray.300" />
              {userRows}
            </>
          ) : (
            <>
              {userRows}
              <Divider my="2" borderColor="editorGray.300" />
              {imgRows}
            </>
          )}
        </Box>
      ) : null}

      {showAdvanced && showOperators ? (
        <Divider borderColor="editorGray.300" />
      ) : null}

      {/* Operators strip (fixed footer) */}
      {showAdvanced && showOperators ? (
        <Box bg="editorGray.50" px="3" py="2">
          <Flex align="center" gap="2" mb="2">
            <Box
              w="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="editorBattleshipGrey.700"
              flexShrink={0}
            >
              <PiSigma />
            </Box>
            <Text
              fontSize="xs"
              color="editorBattleshipGrey.700"
              fontWeight="semibold"
            >
              Operators
            </Text>
          </Flex>
          <Flex gap="2" flexWrap="wrap">
            {operators.map((op) => (
              <Box
                key={op.operator}
                as="button"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  onSelect({ kind: "operator", operator: op.operator })
                }
                data-sidx={
                  highlightMode === "operators"
                    ? indexOfSuggestion({
                        kind: "operator",
                        operator: op.operator,
                      })
                    : undefined
                }
                px="2.5"
                py="1"
                rounded="md"
                borderWidth="1px"
                borderColor="editorGray.300"
                bg={
                  highlightMode === "operators" &&
                  isHighlighted({ kind: "operator", operator: op.operator })
                    ? "editorGray.200"
                    : "white"
                }
                _hover={{ bg: "editorBlue.50", borderColor: "editorBlue.200" }}
                transition="background-color 0.12s, border-color 0.12s"
                onMouseEnter={() => {
                  if (highlightMode !== "operators") return
                  const idx = indexOfSuggestion({
                    kind: "operator",
                    operator: op.operator,
                  })
                  if (idx >= 0) onHoverIndex?.(idx)
                }}
              >
                <Text
                  fontSize="xs"
                  fontFamily="mono"
                  color="editorBattleshipGrey.800"
                >
                  {op.symbol} {op.operator}
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>
      ) : null}
    </Box>
  )
}
