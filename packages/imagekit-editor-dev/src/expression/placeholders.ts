import { USER_VAR_UUID_INNER_RE } from "../components/common/expressionTokens"
import type { TemplateVariable } from "../storage/types"

export function resolvePlaceholderInnerToId(args: {
  inner: string
  variables?: Pick<TemplateVariable, "id" | "name">[]
}): string {
  const trimmed = args.inner.trim()
  if (USER_VAR_UUID_INNER_RE.test(trimmed)) return trimmed.toLowerCase()
  return trimmed
}

export type ReplacePlaceholdersResult =
  | { ok: true; value: string; usedVariableIds: string[] }
  | {
      ok: false
      value: string
      usedVariableIds: string[]
      unresolvedIds: string[]
    }

/**
 * Replace all `{{...}}` placeholders in an arbitrary string with resolved values.
 *
 * This is intentionally not tied to underscore tokenization so it can be applied
 * to any string field in transformation configs.
 */
export function replaceTemplateVariablePlaceholders(args: {
  input: string
  variables?: Pick<TemplateVariable, "id" | "name">[]
  valuesById: Record<string, string>
}): ReplacePlaceholdersResult {
  const used = new Set<string>()
  const unresolved = new Set<string>()

  const out = args.input.replace(/\{\{([^}]+)\}\}/g, (full, innerRaw) => {
    const variableId = resolvePlaceholderInnerToId({
      inner: String(innerRaw ?? ""),
      variables: args.variables,
    })
    used.add(variableId)
    const resolved = args.valuesById[variableId]
    if (typeof resolved !== "string" || resolved.trim().length === 0) {
      unresolved.add(variableId)
      return full
    }
    return resolved
  })

  const usedVariableIds = Array.from(used)
  if (unresolved.size > 0) {
    return {
      ok: false,
      value: out,
      usedVariableIds,
      unresolvedIds: Array.from(unresolved),
    }
  }
  return { ok: true, value: out, usedVariableIds }
}

/**
 * Scan an arbitrary string and return all `{{...}}` placeholder ids it references.
 */
export function extractTemplateVariableIdsFromString(args: {
  input: string
  variables?: Pick<TemplateVariable, "id" | "name">[]
}): string[] {
  const used = new Set<string>()
  args.input.replace(/\{\{([^}]+)\}\}/g, (_full, innerRaw) => {
    const variableId = resolvePlaceholderInnerToId({
      inner: String(innerRaw ?? ""),
      variables: args.variables,
    })
    used.add(variableId)
    return _full
  })
  return Array.from(used)
}
