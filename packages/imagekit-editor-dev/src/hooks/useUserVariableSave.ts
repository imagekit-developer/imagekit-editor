import { useCallback } from "react"
import { USER_VAR_UUID_INNER_RE } from "../components/common/expressionTokens"
import type { UserVariableDefinitionSavePayload } from "../components/common/VariableValueEditPopover"
import type { TemplateVariable } from "../storage/types"
import { useEditorStore } from "../store"
import { useTemplateSync } from "./useTemplateSync"

export type UserVariableSaveResult =
  | { ok: true; variable: TemplateVariable }
  | { ok: false }

/**
 * Shared save flow for template variables created/edited inline (e.g. VariableAwareInput popover).
 *
 * Returns `true` when persistence succeeded, so the caller can close the popover.
 */
export function useUserVariableSave() {
  const { saveNow } = useTemplateSync()
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )

  return useCallback(
    async (p: UserVariableDefinitionSavePayload) => {
      if (templateStorageWriteBlocked)
        return { ok: false } satisfies UserVariableSaveResult

      // Only treat UUIDs as stable ids. Name-based tokens must be canonicalized
      // to UUID tokens by the caller after save succeeds.
      const stableId =
        p.variableId && USER_VAR_UUID_INNER_RE.test(p.variableId)
          ? p.variableId.toLowerCase()
          : undefined

      const variable = useEditorStore.getState().upsertTemplateVariable({
        id: stableId,
        name: p.variableName,
        defaultValue: p.defaultValue.trim(),
        description: p.description.trim() || undefined,
      })

      const saved = await saveNow({ reason: "sidebar" })
      if (saved == null) return { ok: false } satisfies UserVariableSaveResult
      return { ok: true, variable } satisfies UserVariableSaveResult
    },
    [saveNow, templateStorageWriteBlocked],
  )
}
