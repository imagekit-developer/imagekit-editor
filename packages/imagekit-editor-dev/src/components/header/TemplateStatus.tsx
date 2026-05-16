import { Button, Flex, Text, Tooltip } from "@chakra-ui/react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { APPLY_CHANGES_BEFORE_SAVE_MESSAGE } from "../../hooks/useSaveTemplate"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import { useEditorStore } from "../../store"
import { chakraAny } from "../../utils"

const TextAny = chakraAny(Text)
const FlexAny = chakraAny(Flex)
const ButtonAny = chakraAny(Button)
const TooltipAny = chakraAny(Tooltip)

/**
 * Inline save affordance shown in the editor header.
 *
 * Replaces the previous icon + popover dance with a single Save button plus a
 * persistent status label to the left of it. The button is always rendered
 * once the component is visible (i.e. there's something save-worthy to show)
 * and is enabled only when there's actual pending work the user can flush.
 *
 * State summary:
 *   - pristine + no pending work + no prior error → component renders nothing
 *     (no point taking up space before any interaction or save activity).
 *   - pending local work → "Unsaved local changes" label + enabled Save button.
 *   - sidebar config form dirty (RHF) → label + disabled Save button + an
 *     inline hint asking the user to Apply their in-progress field edit first.
 *   - save in flight → button shows `isLoading`.
 *   - error → "Save failed" / "Access required" label + Save retries on click
 *     (still gated by `templateStorageWriteBlocked`).
 *   - clean (`syncStatus === "saved"` and nothing pending) → no label, button
 *     stays visible but disabled. No transient "Saved" toast — the disabled
 *     state IS the success affordance.
 */
export function TemplateStatus() {
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const isPristine = useEditorStore((s) => s.isPristine)
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )
  const transformationConfigFormDirty = useEditorStore(
    (s) => s.transformationConfigFormDirty,
  )
  const hasPendingLocalWork = useEditorStore(
    (s) =>
      s.localChangeVersion !== s.lastSyncedVersion ||
      s.transformationConfigFormDirty,
  )
  const provider = useTemplateStorage()
  const { saveNow } = useTemplateSync()

  if (
    !provider ||
    (isPristine && syncStatus !== "error" && !hasPendingLocalWork)
  )
    return null

  const isUnsavedState = hasPendingLocalWork || syncStatus === "unsaved"
  const isSaving = syncStatus === "saving"
  const isPermissionDeniedError =
    syncStatus === "error" && templateStorageWriteBlocked
  const isError = syncStatus === "error"

  // Persistent label content. Only set when there's something actionable to
  // communicate; clean/saved state shows no label by design.
  //
  // Precedence:
  //   1. Error states ("Access required" / "Save failed")
  //   2. In-flight RHF edit not yet Applied → ask the user to Apply first.
  //      Save is disabled in this case anyway, so showing "Unsaved local
  //      changes" alongside would be redundant noise (the two messages are
  //      mutually exclusive from the user's POV: applying is the prerequisite
  //      to saving).
  //   3. Otherwise, generic "Unsaved local changes".
  let statusText: string | null = null
  let statusColor = "editorBattleshipGrey.700"
  // aria-label kept on the Save button so the existing
  // `getByLabelText("template-status-*")` test assertions keep working without
  // having to hunt down a separate status node.
  let ariaLabel:
    | "template-status-unsaved"
    | "template-status-saved"
    | "template-status-error" = "template-status-saved"

  if (isError) {
    statusText = isPermissionDeniedError ? "Access required" : "Save failed"
    statusColor = isPermissionDeniedError ? "red.600" : "yellow.700"
    ariaLabel = "template-status-error"
  } else if (transformationConfigFormDirty) {
    statusText = APPLY_CHANGES_BEFORE_SAVE_MESSAGE
    ariaLabel = "template-status-unsaved"
  } else if (isUnsavedState) {
    statusText = "Unsaved local changes"
    ariaLabel = "template-status-unsaved"
  }

  // The button is disabled whenever there's nothing meaningful to flush.
  // Note: `transformationConfigFormDirty` blocks save because the in-flight
  // RHF edit hasn't been Applied to the store yet — saving now would persist
  // a stale snapshot. The inline hint below explains this to the user.
  const canSave =
    !isSaving &&
    !templateStorageWriteBlocked &&
    !transformationConfigFormDirty &&
    (isUnsavedState || isError)

  // Tooltip wording for the disabled cases — keeps the affordance discoverable
  // without forcing users to click and discover.
  let disabledTooltip: string | null = null
  if (templateStorageWriteBlocked) {
    disabledTooltip = "You don't have permission to save this template."
  } else if (transformationConfigFormDirty) {
    disabledTooltip = APPLY_CHANGES_BEFORE_SAVE_MESSAGE
  } else if (!isUnsavedState && !isError) {
    disabledTooltip = "All changes saved"
  }

  const saveButton = (
    <ButtonAny
      size="sm"
      colorScheme="blue"
      onClick={() => void saveNow({ reason: "manual" })}
      isLoading={isSaving}
      loadingText="Saving…"
      isDisabled={!canSave}
      aria-label={ariaLabel}
    >
      Save
    </ButtonAny>
  )

  return (
    <FlexAny alignItems="center" gap="2">
      {disabledTooltip ? (
        <TooltipAny label={disabledTooltip} placement="bottom" hasArrow>
          {/* Wrap so the tooltip still triggers on a disabled button. */}
          <span>{saveButton}</span>
        </TooltipAny>
      ) : (
        saveButton
      )}
      {/*
       * Status label sits AFTER the button so that when it appears/disappears
       * (e.g. transitioning between unsaved and clean) the Save button itself
       * never shifts horizontally. This keeps muscle memory intact for users
       * who repeatedly click Save.
       *
       * A single label slot conveys exactly one message at a time:
       * Apply-first ⊕ Unsaved ⊕ Error. They're mutually exclusive from the
       * user's perspective so showing more than one would be noise.
       */}
      {statusText && (
        <TextAny
          fontSize="sm"
          fontWeight="medium"
          color={statusColor}
          userSelect="none"
        >
          {statusText}
        </TextAny>
      )}
    </FlexAny>
  )
}
