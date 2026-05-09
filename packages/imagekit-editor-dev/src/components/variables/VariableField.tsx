import {
  FormControl,
  FormErrorMessage,
  FormLabel,
} from "@chakra-ui/react"
import { type FC, useCallback, useMemo, useRef } from "react"
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
  /**
   * Prefix prepended to the input's `id` attribute (and the label's `htmlFor`)
   * to make them unique per row.
   *
   * Without this, every row that renders the same variable (e.g. `cta_text`)
   * produces an input with `id="cta_text"`. Clicking any label then focuses
   * the **first** element on the page with that id (row 0), regardless of
   * which row the user intended.
   *
   * Pass a per-row unique string — typically the row id or index:
   *
   * ```tsx
   * <VariableField idPrefix={`row-${row._id}`} name="cta_text" ... />
   * // renders: <input id="row-abc123-cta_text">
   * //          <label htmlFor="row-abc123-cta_text">
   * ```
   */
  idPrefix?: string
  /**
   * Async image picker forwarded to the underlying field renderer. Only
   * relevant for variables bound to image-path inputs (e.g. the image
   * layer's `imageUrl`). When provided, a folder icon appears next to the
   * field; clicking it invokes this callback. Resolve to a URL/path string
   * to fill the field, or to `null`/`undefined` to leave it unchanged.
   */
  onPickImage?: () => Promise<string | null | undefined>
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
  idPrefix,
  onPickImage,
}) => {
  const descriptor = useMemo(
    () => listVariables(transformations).find((v) => v.name === name),
    [transformations, name],
  )

  // ColorPickerField / GradientPicker put `setValue` in a useEffect dep array.
  // If the host passes an inline arrow for `onChange`, it gets a new identity
  // every render, which re-triggers that effect and causes an infinite loop.
  // We break the cycle by holding the latest `onChange` in a ref and wrapping
  // it in a stable useCallback so TransformationFieldRenderer always receives
  // the same function reference regardless of how the host authors their prop.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const stableOnChange = useCallback(
    (v: unknown) => onChangeRef.current(v),
    [], // intentionally empty — stableOnChange identity never changes
  )

  if (!descriptor) return null

  const inputId = idPrefix ? `${idPrefix}-${descriptor.name}` : descriptor.name

  return (
    <FormControl isInvalid={!!error}>
      {!hideLabel && (
        <FormLabel htmlFor={inputId} fontSize="sm">
          {descriptor.label}
        </FormLabel>
      )}
      <TransformationFieldRenderer
        field={descriptor.field}
        value={value}
        onChange={stableOnChange}
        inputId={inputId}
        onPickImage={onPickImage}
      />
      {error && <FormErrorMessage fontSize="sm">{error}</FormErrorMessage>}
    </FormControl>
  )
}
