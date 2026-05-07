import {
  extractTemplateVariableIdsFromString,
  replaceTemplateVariablePlaceholders,
} from "../expression/placeholders"
import type { TemplatePreset, TemplateVariable } from "../storage/types"
import type { Transformation } from "../store"
import { resolveEffectiveVariableValuesById } from "../templateVariables/runtime"
import { deepMapStrings } from "../utils/deepMapStrings"

export type TemplateRenderError = {
  type: "UNRESOLVED_VARIABLES"
  unresolved: Array<{ id: string; name: string | null }>
  usedVariableIds: string[]
}

export type ResolveTemplateForRenderResult =
  | { ok: true; transformations: Omit<Transformation, "id">[] }
  | { ok: false; error: TemplateRenderError }

function nameById(
  variables: Pick<TemplateVariable, "id" | "name">[],
  id: string,
): string | null {
  const hit = variables.find((v) => v.id === id)
  return hit?.name ?? null
}

/**
 * Single entry point:
 * - determines which variables are used in the template
 * - resolves effective values (defaults + optional preset overrides)
 * - fails fast if any used variable has no value
 * - otherwise returns transformations with placeholders substituted
 */
export function resolveTemplateForRender(args: {
  transformations: Omit<Transformation, "id">[]
  variables: TemplateVariable[]
  presets: TemplatePreset[]
  activePresetId?: string | null
}): ResolveTemplateForRenderResult {
  const { transformations, variables, presets, activePresetId } = args
  const preset =
    activePresetId != null
      ? (presets.find((p) => p.id === activePresetId) ?? null)
      : null

  const valuesById = resolveEffectiveVariableValuesById({ variables, preset })

  const usedVariableIds = new Set<string>()
  const unresolvedIds = new Set<string>()

  // First scan and attempt substitution; gather unresolved ids without mutating on failure.
  const resolvedTransformations = transformations.map((step) => {
    const nextValue = deepMapStrings(step.value, (s) => {
      // Track usage even if we later fail.
      for (const id of extractTemplateVariableIdsFromString({
        input: s,
        variables,
      })) {
        usedVariableIds.add(id)
      }
      const replaced = replaceTemplateVariablePlaceholders({
        input: s,
        variables,
        valuesById,
      })
      if (!replaced.ok) {
        replaced.unresolvedIds.forEach((id) => unresolvedIds.add(id))
      }
      return replaced.value
    })

    return { ...step, value: nextValue as any }
  })

  const used = Array.from(usedVariableIds)
  const unresolvedUsed = Array.from(unresolvedIds).filter((id) =>
    usedVariableIds.has(id),
  )

  if (unresolvedUsed.length > 0) {
    return {
      ok: false,
      error: {
        type: "UNRESOLVED_VARIABLES",
        usedVariableIds: used,
        unresolved: unresolvedUsed.map((id) => ({
          id,
          name: nameById(variables, id),
        })),
      },
    }
  }

  return { ok: true, transformations: resolvedTransformations }
}
