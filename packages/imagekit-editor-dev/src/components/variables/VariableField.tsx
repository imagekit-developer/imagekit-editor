import { Box, FormControl, FormLabel, Input } from "@chakra-ui/react"
import React from "react"
import type { TransformationField } from "../../schema"

export interface VariableFieldProps {
  name: string
  label: string
  field?: TransformationField
  value: unknown
  onChange: (value: unknown) => void
}

/**
 * Renders an appropriate input for a template variable based on the
 * field schema from the transformation it's bound to.
 *
 * For v1, this renders a text input. Future versions can dispatch on
 * `field.fieldType` to render color pickers, sliders, etc.
 */
export const VariableField: React.FC<VariableFieldProps> = ({
  name,
  label,
  field,
  value,
  onChange,
}) => {
  const fieldType = field?.fieldType || "input"

  return (
    <FormControl>
      <FormLabel fontSize="xs" fontWeight="500" color="gray.600">
        {label}
      </FormLabel>
      <Input
        size="sm"
        value={typeof value === "string" ? value : value != null ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field?.fieldProps?.defaultValue != null
          ? String(field.fieldProps.defaultValue)
          : name}
      />
    </FormControl>
  )
}
