import type { TemplatePreset, TemplateVariable } from "../storage/types"

export type EffectiveVariableValuesById = Record<string, string>

export interface UnresolvedTemplateVariable {
  id: string
  name: string
  reason: "missing"
}

function hasValue(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

/**
 * Resolve defaults + optional preset overrides into a single effective values map.
 *
 * - Preset overrides win when present and non-empty.
 * - Otherwise fallback to variable.defaultValue (may still be empty).
 */
export function resolveEffectiveVariableValuesById(args: {
  variables: TemplateVariable[]
  preset?: TemplatePreset | null
}): EffectiveVariableValuesById {
  const { variables, preset } = args
  const out: EffectiveVariableValuesById = {}

  for (const v of variables) {
    const presetVal = preset?.valuesByVariableId?.[v.id]
    out[v.id] = hasValue(presetVal) ? presetVal : (v.defaultValue ?? "")
  }

  return out
}

export function findUnresolvedVariables(args: {
  variables: TemplateVariable[]
  effectiveValuesById: EffectiveVariableValuesById
}): UnresolvedTemplateVariable[] {
  const { variables, effectiveValuesById } = args
  const unresolved: UnresolvedTemplateVariable[] = []
  for (const v of variables) {
    const val = effectiveValuesById[v.id]
    if (!hasValue(val)) {
      unresolved.push({ id: v.id, name: v.name, reason: "missing" })
    }
  }
  return unresolved
}
