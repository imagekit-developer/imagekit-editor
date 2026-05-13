import type { Resolver } from "react-hook-form"
import { isVariableRef } from "./index"

/**
 * Wrap a react-hook-form resolver so that fields whose current value is a
 * `VariableRef` marker are exempted from validation.
 *
 * Why: The transformation schemas are written for the *resolved* primitive
 * value of each field (e.g. `z.string()`, `z.number()`). When the user binds
 * a field to a template variable, the form value becomes
 * `{ $var, label, defaultValue }`, which would otherwise fail validation.
 *
 * Strategy:
 * 1. Build a copy of the form values where each `VariableRef` is replaced
 *    by its `defaultValue` (or a benign placeholder) — purely to let the
 *    underlying resolver run without errors for that field.
 * 2. After validation, drop any errors that target a field which is a
 *    `VariableRef` in the *original* values.
 * 3. Restore the original `VariableRef` markers into the resolved values so
 *    react-hook-form continues to hold the marker (it is what gets written
 *    back to the transformation step on submit).
 */
export function makeVariableAwareResolver<TFieldValues extends Record<string, unknown>>(
  inner: Resolver<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values, context, options) => {
    const variableFieldNames = new Set<string>()
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (isVariableRef(value)) {
        variableFieldNames.add(key)
        // Use defaultValue when present and a primitive; otherwise an empty
        // string is the safest "passes most schemas" placeholder.
        const dv = value.defaultValue
        sanitized[key] =
          dv != null && typeof dv !== "object" ? dv : ""
      } else {
        sanitized[key] = value
      }
    }

    const result = await inner(
      sanitized as TFieldValues,
      context,
      options,
    )

    // Drop errors for variable-bound fields.
    const filteredErrors: Record<string, unknown> = {}
    if (result.errors) {
      for (const [k, v] of Object.entries(result.errors)) {
        if (!variableFieldNames.has(k)) {
          filteredErrors[k] = v
        }
      }
    }

    // Restore original VariableRef markers in the resolved values.
    const mergedValues: Record<string, unknown> = {
      ...(result.values as Record<string, unknown>),
    }
    variableFieldNames.forEach((name) => {
      mergedValues[name] = (values as Record<string, unknown>)[name]
    })

    return {
      values: mergedValues as TFieldValues,
      errors: filteredErrors as typeof result.errors,
    }
  }
}
