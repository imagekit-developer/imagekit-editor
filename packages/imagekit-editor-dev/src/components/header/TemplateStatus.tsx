import {
  Box,
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
import React, { useEffect, useRef, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useEditorStore } from "../../store"

const NOTIFICATION_DURATION_MS = 3000

export function TemplateStatus() {
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const storageError = useEditorStore((s) => s.storageError)
  const isPristine = useEditorStore((s) => s.isPristine)
  const provider = useTemplateStorage()

  const [notificationVisible, setNotificationVisible] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<
    "success" | "error" | null
  >(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (syncStatus === "saving") {
      setNotificationVisible(true)
    } else if (syncStatus === "saved") {
      setLastSyncResult("success")
      setNotificationVisible(true)
      timerRef.current = setTimeout(
        () => setNotificationVisible(false),
        NOTIFICATION_DURATION_MS,
      )
    } else if (syncStatus === "unsaved") {
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
  }, [syncStatus])

  if (!provider || isPristine) return null

  const providerName = provider.getProviderName()

  // "Saving…" is a transient text-only state — no icon yet
  if (notificationVisible && syncStatus === "saving") {
    return (
      <Text fontSize="sm" color="editorBattleshipGrey.600" userSelect="none">
        Saving…
      </Text>
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

  if (notificationVisible) {
    if (syncStatus === "saved") {
      activeIcon = IoMdCloudDone
      activeColor = "green.500"
      notifText = `Saved to ${providerName}`
    } else if (syncStatus === "unsaved") {
      activeIcon = MdSync
      activeColor = "editorBattleshipGrey.500"
      notifText = "Unsaved local changes"
    } else if (syncStatus === "error") {
      activeIcon = MdSyncProblem
      activeColor = "yellow.600"
      notifText = "Save failed"
    } else {
      return null
    }
  } else {
    if (lastSyncResult === null) return null
    activeIcon = lastSyncResult === "success" ? IoMdCloudDone : MdSyncProblem
    activeColor = lastSyncResult === "success" ? "green.500" : "yellow.600"
    isInteractive = true
  }

  const popupTitle =
    lastSyncResult === "success" ? "All changes saved" : "Sync failed"
  const popupBody =
    lastSyncResult === "success"
      ? `Your changes are synced to ${providerName} successfully.`
      : (storageError ?? "Failed to save changes. Please try again.")

  return (
    <Flex alignItems="center" gap="1.5">
      {/*
       * The icon is always inside this same Box so its screen position never
       * changes when the notification text appears or disappears.
       */}
      <Popover placement="bottom-start" isLazy>
        <Tooltip
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
                  bg: isInteractive ? "editorGray.200" : "transparent",
                }}
              >
                <Icon as={activeIcon} color={activeColor} boxSize={5} />
              </Box>
            </PopoverTrigger>
          </Box>
        </Tooltip>
        <PopoverContent
          width="auto"
          maxW="xs"
          shadow="lg"
          _focus={{ boxShadow: "lg" }}
        >
          <PopoverArrow />
          <PopoverBody>
            <Text fontWeight="semibold" fontSize="sm" mb="1">
              {popupTitle}
            </Text>
            <Text fontSize="sm" color="editorBattleshipGrey.600">
              {popupBody}
            </Text>
          </PopoverBody>
        </PopoverContent>
      </Popover>

      {notifText && (
        <Text fontSize="sm" color="editorBattleshipGrey.700" userSelect="none">
          {notifText}
        </Text>
      )}
    </Flex>
  )
}
