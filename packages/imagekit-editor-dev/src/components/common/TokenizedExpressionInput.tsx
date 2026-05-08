import { Box, type BoxProps, Flex, Input, Text } from "@chakra-ui/react"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { ExpressionToken } from "./expressionTokens"
import type { VariableSuggestionOperator } from "./variableSuggestionTypes"

const tokenBase: BoxProps = {
  display: "inline-flex",
  alignItems: "center",
  gap: 1.5,
  px: 2,
  py: 0.5,
  rounded: "md",
  fontSize: "xs",
  fontFamily: "mono",
  fontWeight: "semibold",
  lineHeight: "1.4",
  userSelect: "none",
  flexShrink: 0,
  // Allow chips to shrink inside the wrapping flex container.
  minW: 0,
  maxW: "100%",
  overflow: "hidden",
} satisfies BoxProps

const USER_VAR_CHIP_PROPS_BY_STATE: Record<
  "resolved" | "error",
  Pick<BoxProps, "bg" | "color" | "borderColor" | "borderStyle" | "_hover">
> = {
  resolved: {
    bg: "editorPale",
    color: "editorBattleshipGrey.800",
    borderColor: "editorYellowOrange",
    borderStyle: "solid",
    _hover: { borderColor: "editorYellowOrange" },
  },
  error: {
    bg: "red.100",
    color: "red.600",
    borderColor: "red.300",
    borderStyle: "dotted",
    _hover: { borderColor: "red.600", bg: "red.100", color: "red.800" },
  },
}

function opSymbol(op: VariableSuggestionOperator) {
  if (op === "mul") return "×"
  if (op === "div") return "÷"
  if (op === "add") return "+"
  if (op === "sub") return "−"
  if (op === "mod") return "%"
  if (op === "pow") return "^"
  return "-"
}

export type UserVarChipState = "unknown" | "resolved" | "unresolved" | "error"

export interface UserVarChipHoverPayload {
  variableId: string
  state: UserVarChipState
}

export interface TokenizedExpressionInputProps {
  tokens: ExpressionToken[]
  literalDraft: string
  onLiteralDraftChange: (v: string) => void
  onRemoveToken: (index: number) => void
  onCommitLiteral: () => void
  onBackspaceAtEmpty?: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
  disabled?: boolean
  getUserVarState?: (variableId: string) => UserVarChipState
  /** Chip label, e.g. a friendly name while the stored token is `{{uuid}}`. */
  resolveUserVarChipLabel?: (variableId: string) => string
  /** Hover on any user-variable chip (resolved or unresolved). */
  onUserVarChipMouseEnter?: (payload: UserVarChipHoverPayload) => void
  onUserVarChipMouseLeave?: () => void
}

/**
 * Visual token field (chips + a trailing literal input), similar to the prototype.
 * This component is purely presentational; it doesn't parse/serialize.
 */
export function TokenizedExpressionInput({
  tokens,
  literalDraft,
  onLiteralDraftChange,
  onRemoveToken,
  onCommitLiteral,
  onBackspaceAtEmpty,
  inputRef: inputRefProp,
  onFocus,
  onKeyDown,
  disabled,
  getUserVarState,
  resolveUserVarChipLabel,
  onUserVarChipMouseEnter,
  onUserVarChipMouseLeave,
}: TokenizedExpressionInputProps) {
  const innerRef = useRef<HTMLInputElement | null>(null)
  const inputRef = inputRefProp ?? innerRef
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) return
    inputRef.current?.focus()
  }, [isFocused])

  const rendered = useMemo(
    () =>
      tokens.map((t, idx) => {
        if (t.kind === "imgVar") {
          return (
            <Box
              key={`${t.kind}-${idx}`}
              {...tokenBase}
              bg="editorBlue.50"
              color="editorBlue.700"
              borderWidth="1px"
              borderColor="editorBlue.100"
              cursor="pointer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onRemoveToken(idx)}
              title="Click to remove"
            >
              <Text as="span" noOfLines={1} minW={0}>
                {t.code}
              </Text>
              <Text as="span" opacity={0.6} fontFamily="body">
                ×
              </Text>
            </Box>
          )
        }
        if (t.kind === "userVar") {
          const state = getUserVarState?.(t.variableId) ?? "unknown"
          const chipState =
            state === "unresolved" || state === "error" ? "error" : "resolved"
          const chipProps = USER_VAR_CHIP_PROPS_BY_STATE[chipState]
          const chipLabel =
            resolveUserVarChipLabel?.(t.variableId) ?? `{{${t.variableId}}}`
          return (
            <Box
              key={`${t.kind}-${idx}`}
              {...tokenBase}
              {...chipProps}
              borderWidth="1px"
              cursor="pointer"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={
                onUserVarChipMouseEnter
                  ? () =>
                      onUserVarChipMouseEnter({
                        variableId: t.variableId,
                        state,
                      })
                  : undefined
              }
              onMouseLeave={
                onUserVarChipMouseLeave
                  ? () => onUserVarChipMouseLeave()
                  : undefined
              }
              onClick={() => onRemoveToken(idx)}
              title={
                chipState === "error"
                  ? "Undefined variable (click to remove)"
                  : "Click to remove"
              }
            >
              <Text as="span" noOfLines={1} minW={0}>
                {chipLabel}
              </Text>
              <Text as="span" opacity={0.6} fontFamily="body">
                ×
              </Text>
            </Box>
          )
        }
        if (t.kind === "op") {
          return (
            <Box
              key={`${t.kind}-${idx}`}
              {...tokenBase}
              bg="editorGray.200"
              color="editorBattleshipGrey.800"
              borderWidth="1px"
              borderColor="editorGray.300"
              cursor="pointer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onRemoveToken(idx)}
              title="Click to remove"
            >
              <Text as="span" flexShrink={0}>
                {opSymbol(t.op)}
              </Text>
              <Text as="span" opacity={0.7} noOfLines={1} minW={0}>
                {t.op}
              </Text>
              <Text as="span" opacity={0.6} fontFamily="body">
                ×
              </Text>
            </Box>
          )
        }
        return (
          <Box
            key={`${t.kind}-${idx}`}
            {...tokenBase}
            bg="editorGray.100"
            color="editorBattleshipGrey.800"
            borderWidth="1px"
            borderColor="editorGray.300"
            cursor="pointer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onRemoveToken(idx)}
            title="Click to remove"
          >
            <Text as="span" noOfLines={1} minW={0}>
              {t.value}
            </Text>
            <Text as="span" opacity={0.6} fontFamily="body">
              ×
            </Text>
          </Box>
        )
      }),
    [
      tokens,
      onRemoveToken,
      getUserVarState,
      resolveUserVarChipLabel,
      onUserVarChipMouseEnter,
      onUserVarChipMouseLeave,
    ],
  )

  return (
    <Box
      borderWidth="1px"
      borderColor={isFocused ? "editorBlue.300" : "editorGray.300"}
      rounded="md"
      bg={disabled ? "editorGray.100" : "white"}
      px="2"
      py="1.5"
      minH="32px"
      onMouseDown={(e) => {
        // Clicking empty space should focus the input but not blur existing focus.
        e.preventDefault()
        if (!disabled) {
          setIsFocused(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }
      }}
    >
      <Flex gap="1.5" flexWrap="wrap" align="center">
        {rendered}
        <Input
          ref={inputRef}
          value={literalDraft}
          onChange={(e) => onLiteralDraftChange(e.target.value)}
          onFocus={(e) => {
            setIsFocused(true)
            onFocus?.(e)
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            // Let the parent intercept first (e.g. accept highlighted dropdown item on Enter).
            onKeyDown?.(e)
            if (e.defaultPrevented) return
            if (e.key === "Backspace" && literalDraft.length === 0) {
              // Treat the previous token like a single character.
              e.preventDefault()
              onBackspaceAtEmpty?.()
              return
            }
            if (e.key === "Enter") {
              e.preventDefault()
              onCommitLiteral()
              return
            }
          }}
          variant="unstyled"
          fontSize="sm"
          minW="40px"
          flex="1"
          isDisabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder=""
        />
      </Flex>
    </Box>
  )
}
