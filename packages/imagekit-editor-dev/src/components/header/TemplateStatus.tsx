import {
  Box,
  Button,
  Flex,
  Icon,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { IoMdCloudDone } from "@react-icons/all-files/io/IoMdCloudDone"
import { MdSync } from "@react-icons/all-files/md/MdSync"
import { MdSyncProblem } from "@react-icons/all-files/md/MdSyncProblem"
import { useEffect, useRef, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { APPLY_CHANGES_BEFORE_SAVE_MESSAGE } from "../../hooks/useSaveTemplate"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import { useEditorStore } from "../../store"
import { chakraAny } from "../../utils"

const NOTIFICATION_DURATION_MS = 3000

const TextAny = chakraAny(Text)
const TextAny2 = chakraAny(Text)
const FlexAny = chakraAny(Flex)
const PopoverContentAny = chakraAny(PopoverContent)
const TooltipAny = chakraAny(Tooltip)
const PopoverBodyAny = chakraAny(PopoverBody)
const ButtonAny = chakraAny(Button)

export function TemplateStatus() {
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const isPristine = useEditorStore((s) => s.isPristine)
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt)
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

  const [notificationVisible, setNotificationVisible] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<
    "success" | "error" | null
  >(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSyncStatusRef = useRef(syncStatus)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (syncStatus === "saving") {
      setNotificationVisible(true)
    } else if (syncStatus === "saved") {
      // Avoid flashing a "Saved" success state on initial template load.
      // Only treat "saved" as a success event when it follows an actual save.
      const prev = prevSyncStatusRef.current
      const isSaveCompletion = prev === "saving" || lastSavedAt !== null
      if (isSaveCompletion) {
        setLastSyncResult("success")
        setNotificationVisible(true)
        timerRef.current = setTimeout(
          () => setNotificationVisible(false),
          NOTIFICATION_DURATION_MS,
        )
      }
    } else if (syncStatus === "unsaved" || hasPendingLocalWork) {
      setNotificationVisible(true)
      timerRef.current = setTimeout(
        () => setNotificationVisible(false),
        NOTIFICATION_DURATION_MS,
      )
    } else if (syncStatus === "error") {
      setLastSyncResult("error")
      setNotificationVisible(true)
      timerRef.current = setTimeout(
        () => setNotificationVisible(false),
        NOTIFICATION_DURATION_MS,
      )
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [syncStatus, hasPendingLocalWork, lastSavedAt])

  useEffect(() => {
    prevSyncStatusRef.current = syncStatus
  }, [syncStatus])

  if (
    !provider ||
    (isPristine && syncStatus !== "error" && !hasPendingLocalWork)
  )
    return null

  const providerName = provider.getProviderName()

  // "Saving…" is a transient text-only state — no icon yet
  if (notificationVisible && syncStatus === "saving") {
    return (
      <TextAny
        fontSize="sm"
        fontWeight="medium"
        color="editorBattleshipGrey.600"
        userSelect="none"
      >
        Saving…
      </TextAny>
    )
  }

  // Resolve the icon and label for the current state.
  // When notification is visible, we show the icon + inline text.
  // When notification fades, we show the icon alone (persistent/interactive).
  // The icon wrapper is always structurally identical so its position never shifts.
  let activeIcon: typeof IoMdCloudDone
  let activeColor: string
  let notifText: string | null = null
  let isInteractive = false
  let iconAriaLabel:
    | "template-status-unsaved"
    | "template-status-saved"
    | "template-status-error"

  const isUnsavedState = hasPendingLocalWork || syncStatus === "unsaved"
  const isPermissionDeniedError =
    syncStatus === "error" && templateStorageWriteBlocked

  if (notificationVisible) {
    // Unsynced edits take precedence over the last successful save result.
    // This prevents showing the green cloud when newer changes exist locally.
    if (isUnsavedState) {
      activeIcon = MdSync
      activeColor = "editorBattleshipGrey.500"
      notifText = "Unsaved local changes"
      iconAriaLabel = "template-status-unsaved"
    } else if (syncStatus === "saved") {
      activeIcon = IoMdCloudDone
      activeColor = "green.500"
      notifText = `Saved to ${providerName}`
      iconAriaLabel = "template-status-saved"
    } else if (syncStatus === "error") {
      activeIcon = MdSyncProblem
      activeColor = isPermissionDeniedError ? "red.600" : "yellow.600"
      notifText = "Save failed"
      iconAriaLabel = "template-status-error"
    } else {
      return null
    }
  } else {
    // Persistent (icon-only) state:
    // - If there are unsynced local edits, ALWAYS show the unsaved icon until the next successful save syncs versions.
    // - Otherwise, show the last save outcome icon (success/error).
    if (hasPendingLocalWork) {
      activeIcon = MdSync
      activeColor = "editorBattleshipGrey.500"
      isInteractive = true
      iconAriaLabel = "template-status-unsaved"
    } else {
      if (lastSyncResult === null) return null
      activeIcon = lastSyncResult === "success" ? IoMdCloudDone : MdSyncProblem
      activeColor = lastSyncResult === "success" ? "green.500" : "yellow.600"
      isInteractive = true
      iconAriaLabel =
        lastSyncResult === "success"
          ? "template-status-saved"
          : "template-status-error"
    }
  }

  const popupTitle = isUnsavedState
    ? "Unsaved changes"
    : lastSyncResult === "success"
      ? "All changes saved"
      : isPermissionDeniedError
        ? "Access required"
        : "Save failed"

  const popupBody = isUnsavedState
    ? "Your current local changes haven't been saved to the library yet."
    : lastSyncResult === "success"
      ? `Your changes are saved to ${providerName} successfully.`
      : isPermissionDeniedError
        ? "You don't have permission to save changes to this template."
        : "Failed to save changes. If this problem persists, please contact support."

  return (
    <FlexAny alignItems="center" gap="1.5">
      {/*
       * The icon is always inside this same Box so its screen position never
       * changes when the notification text appears or disappears.
       */}
      <Popover placement="bottom-start" isLazy>
        <TooltipAny
          label="See save status"
          placement="bottom"
          isDisabled={!isInteractive}
        >
          <Box display="inline-flex">
            <PopoverTrigger>
              <Box
                display="flex"
                alignItems="center"
                borderRadius="md"
                p="1"
                cursor={isInteractive ? "pointer" : "default"}
                pointerEvents={isInteractive ? "auto" : "none"}
                _hover={{
                  bg: isInteractive ? "gray.100" : "transparent",
                }}
              >
                <Icon
                  as={activeIcon}
                  color={activeColor}
                  boxSize={5}
                  aria-label={iconAriaLabel}
                  role="img"
                />
              </Box>
            </PopoverTrigger>
          </Box>
        </TooltipAny>
        <PopoverContentAny
          width="auto"
          maxW="xs"
          shadow="lg"
          border="none"
          _focus={{ boxShadow: "lg" }}
        >
          <PopoverArrow />
          <PopoverBodyAny>
            <TextAny fontWeight="semibold" fontSize="sm" mb="1">
              {popupTitle}
            </TextAny>
            <TextAny2 fontSize="sm" color="editorBattleshipGrey.600">
              {popupBody}
            </TextAny2>
            {transformationConfigFormDirty && (
              <TextAny2 fontSize="sm" color="editorBattleshipGrey.600" mt="2">
                {APPLY_CHANGES_BEFORE_SAVE_MESSAGE}
              </TextAny2>
            )}
            {isUnsavedState && (
              <Box mt="3">
                <ButtonAny
                  size="sm"
                  colorScheme="blue"
                  onClick={() => void saveNow({ reason: "manual" })}
                  isLoading={syncStatus === "saving"}
                  isDisabled={
                    templateStorageWriteBlocked || transformationConfigFormDirty
                  }
                >
                  Save
                </ButtonAny>
              </Box>
            )}
          </PopoverBodyAny>
        </PopoverContentAny>
      </Popover>

      {notifText && (
        <TextAny
          fontSize="sm"
          fontWeight="medium"
          color="editorBattleshipGrey.700"
          userSelect="none"
        >
          {notifText}
        </TextAny>
      )}
    </FlexAny>
  )
}
