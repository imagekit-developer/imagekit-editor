import { ExternalLinkIcon } from "@chakra-ui/icons"
import {
  Box,
  type BoxProps,
  Divider,
  Flex,
  Icon,
  Input,
  Text,
} from "@chakra-ui/react"
import { PiArrowSquareOut } from "@react-icons/all-files/pi/PiArrowSquareOut"
import type React from "react"
import { useCallback, useRef } from "react"

/** Keep in sync with `VariableAwareInput` portal positioning. */
export const VARIABLE_VALUE_EDIT_POPOVER_WIDTH_PX = 420

/** Matches VariableSuggestionsDropdown shell for visual consistency. */
export const VARIABLE_VALUE_EDIT_POPOVER_SHELL_PROPS = {
  w: `${VARIABLE_VALUE_EDIT_POPOVER_WIDTH_PX}px`,
  maxW: "min(94vw, 440px)",
  bg: "white",
  borderWidth: "1px",
  borderColor: "editorGray.300",
  rounded: "lg",
  shadow: "lg",
  overflow: "hidden",
} satisfies BoxProps

export type VariableValueEditPopoverMode = "unresolved" | "resolved"

export interface UserVariableDefinitionSavePayload {
  /** Stable id when editing an existing template variable (matches `{{id}}` in URLs). */
  variableId?: string
  variableName: string
  /** Primary “Enter value” field. */
  value: string
  definitionDefaultValue: string
  description: string
}

export interface VariableValueEditPopoverProps {
  /** Used for future styling / copy; default field type is text. */
  mode: VariableValueEditPopoverMode
  /** Variable name without braces, e.g. `margin_x` (for labels / new definitions). */
  variableName: string
  /** When set, saves update the definition with this id. */
  variableId?: string
  /** The variable default value (not a preset runtime value). */
  value: string
  onValueChange: (next: string) => void
  /** Ref to the primary text input (parent may focus on open). */
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Optional: navigate to template variables UI. */
  onTemplateVariablesClick?: () => void
  /** Optional: switch preset flow. */
  onSwitchPresetClick?: () => void
  /** Extra content below built-in advanced fields (optional). */
  advancedFieldsContent?: React.ReactNode
  /** Initial expanded state for advanced section. */
  defaultAdvancedOpen?: boolean
  /** e.g. Escape from the value field. */
  onRequestClose?: () => void
  /** Persist variable definition + value (wired by parent when ready). */
  onSave?: (payload: UserVariableDefinitionSavePayload) => void | Promise<void>
  initialDefinitionDefaultValue?: string
  initialDefinitionDescription?: string
}

/**
 * Content panel for inline variable value editing (portal positioning is owned by parent).
 * Styled to align with `VariableSuggestionsDropdown`.
 */
export function VariableValueEditPopover({
  mode,
  variableName,
  variableId,
  value,
  onValueChange,
  inputRef,
  onTemplateVariablesClick,
  onSwitchPresetClick,
  advancedFieldsContent,
  onRequestClose,
  onSave,
  initialDefinitionDefaultValue = "",
  initialDefinitionDescription = "",
}: VariableValueEditPopoverProps) {
  // React 17: no `useId`; generate a stable id per mount for a11y wiring.
  const instanceIdRef = useRef<string | null>(null)
  if (instanceIdRef.current === null) {
    instanceIdRef.current = `vve-${Math.random().toString(36).slice(2, 11)}`
  }
  const safeName = variableName.replace(/[^a-zA-Z0-9_-]/g, "_")
  const advancedId = `${instanceIdRef.current}-${safeName}-advanced`

  const onAdvancedFieldsClick = useCallback(() => {
    // Later: open Variables modal and focus this variable row.
    // For now, keep this intentionally as a no-op to avoid layout shifts.
  }, [])

  const linkStyle: BoxProps = {
    as: "button" as const,
    type: "button",
    fontSize: "sm",
    color: "editorBlue.600",
    fontWeight: "medium",
    textDecoration: "underline",
    cursor: "pointer",
    bg: "transparent",
    border: "none",
    p: 0,
    _hover: { color: "editorBlue.700" },
  }

  return (
    <Box
      {...VARIABLE_VALUE_EDIT_POPOVER_SHELL_PROPS}
      data-variable-edit-mode={mode}
      maxH="140px"
    >
      <Box px="4" py="4">
        <Input
          ref={inputRef}
          size="md"
          fontSize="md"
          rounded="md"
          borderColor="editorGray.300"
          _focusVisible={{
            borderColor: "editorBlue.400",
            boxShadow: "0 0 0 1px var(--chakra-colors-editorBlue-400)",
          }}
          placeholder="Enter a default value and press enter to save"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void onSave?.({
                variableId,
                variableName,
                value: "",
                definitionDefaultValue: value,
                description: initialDefinitionDescription,
              })
              return
            }
            if (e.key === "Escape") {
              e.preventDefault()
              onRequestClose?.()
            }
          }}
          autoComplete="off"
          spellCheck={false}
        />

        <Flex align="center" justify="space-between" mt="4" gap="3">
          <Flex align="center" gap="1">
            <Box
              as="button"
              type="button"
              display="flex"
              alignItems="center"
              gap="1.5"
              fontSize="sm"
              color="editorBattleshipGrey.800"
              fontWeight="semibold"
              bg="transparent"
              border="none"
              cursor="pointer"
              p={0}
              onClick={onAdvancedFieldsClick}
              aria-controls={advancedId}
              id={`${advancedId}-trigger`}
            >
              Advanced fields
              <Icon
                as={PiArrowSquareOut}
                boxSize="16px"
                color="editorBattleshipGrey.600"
              />
            </Box>
          </Flex>
          <Box
            {...linkStyle}
            display="inline-flex"
            alignItems="center"
            gap="1"
            onClick={onTemplateVariablesClick}
          >
            Variables in this template <ExternalLinkIcon />
          </Box>
        </Flex>

        {/* Save is triggered by pressing Enter in the input. */}
      </Box>

      <Divider borderColor="editorGray.300" />

      <Box px="4" py="3" bg="editorBlue.50">
        <Text fontSize="sm" color="editorBattleshipGrey.700">
          Variable defined already?{" "}
          {onSwitchPresetClick ? (
            <Box as="span" {...linkStyle} onClick={onSwitchPresetClick}>
              Switch Preset
            </Box>
          ) : (
            <Text as="span" textDecoration="underline" color="editorBlue.600">
              Switch Preset
            </Text>
          )}
        </Text>
      </Box>
    </Box>
  )
}
