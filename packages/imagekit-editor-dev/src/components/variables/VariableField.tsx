import {
  FormControl,
  FormErrorMessage,
  FormLabel,
} from "@chakra-ui/react"
import { type FC, useMemo } from "react"
import { TransformationFieldRenderer } from "../sidebar/TransformationFieldRenderer"
import type { Transformation } from "../../store"
import { listVariables } from "../../variables/listVariables"

export interface VariableFieldProps {
  /**
   * The template's transformation steps. Used to look up the variable's
   * descriptor (the underlying {@link TransformationField}) so the right
   * input control is rendered with the same validation as the editor.
   */
  transformations: Transformation[]
  /** Variable name (the stable `$var` id, NOT the user-facing label). */
  name: string
  /** Current override value supplied by the host's form/grid state. */
  value: unknown
  /** Called whenever the user mutates the override value. */
  onChange: (value: unknown) => void
  /** Optional validation error message shown beneath the input. */
  error?: string
  /** Hide the auto-generated label (host wants to render its own header). */
  hideLabel?: boolean
}

/**
 * Render the editor's own input control for a template variable, so the host
 * (creative-automation override grid, batch render UI, etc.) gets identical
 * UX and identical validation rules as the user authoring the template.
 *
 * The variable is resolved from the transformation tree via
 * {@link listVariables} on every render, which keeps the host code free of
 * any variable-state plumbing — pass the template's transformations array
 * straight from your data layer.
 *
 * If the variable name is not found, the component renders nothing. This is
 * intentional: a stale column in a host spreadsheet should not crash the
 * page when the underlying template removes a variable.
 */
export const VariableField: FC<VariableFieldProps> = ({
  transformations,
  name,
  value,
  onChange,
  error,
  hideLabel,
}) => {
  const descriptor = useMemo(
    () => listVariables(transformations).find((v) => v.name === name),
    [transformations, name],
  )

  if (!descriptor) return null

  return (
    <FormControl isInvalid={!!error}>
      {!hideLabel && (
        <FormLabel htmlFor={descriptor.name} fontSize="sm">
          {descriptor.label}
        </FormLabel>
      )}
      <TransformationFieldRenderer
        field={descriptor.field}
        value={value}
        onChange={onChange}
      />
      {error && <FormErrorMessage fontSize="sm">{error}</FormErrorMessage>}
    </FormControl>
  )
}
