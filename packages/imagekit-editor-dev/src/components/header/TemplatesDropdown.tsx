import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiPushPin } from "@react-icons/all-files/pi/PiPushPin"
import { PiPushPinFill } from "@react-icons/all-files/pi/PiPushPinFill"
import { PiSquaresFourLight } from "@react-icons/all-files/pi/PiSquaresFourLight"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTemplatePermissions } from "../../context/TemplatePermissionsContext"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import type { TemplateRecord } from "../../storage"
import { isTemplateAccessDeniedError } from "../../storage/templateAccessError"
import { applyTemplateRecord, useEditorStore } from "../../store"
import {
  chakraAny,
  formatTemplateNameForUI,
  getDisplayTemplates,
  truncateTemplateName,
} from "../../utils"

const PopoverContentAny = chakraAny(PopoverContent)
const PopoverBodyAny = chakraAny(PopoverBody)
const BoxAny = chakraAny(Box)
const TextAny = chakraAny(Text)
const FlexAny = chakraAny(Flex)
const DividerAny = chakraAny(Divider)
const ButtonAny = chakraAny(Button)
const IconAny = chakraAny(Icon)
const InputGroupAny = chakraAny(InputGroup)
const InputLeftElementAny = chakraAny(InputLeftElement)
const InputAny = chakraAny(Input)
const BadgeAny = chakraAny(Badge)
const AvatarAny = chakraAny(Avatar)
const SpinnerAny = chakraAny(Spinner)
const TooltipAny = chakraAny(Tooltip)

const MAX_VISIBLE = 10

// ---------------------------------------------------------------------------
// DropdownTemplateRow — extracted so hooks (useTemplatePermissions) can be used
// ---------------------------------------------------------------------------

interface DropdownTemplateRowProps {
  record: TemplateRecord
  isHovered: boolean
  pinningId: string | null
  onSelect(record: TemplateRecord): void
  onTogglePin(record: TemplateRecord): void
  onMouseEnter(): void
  onMouseLeave(): void
}

function DropdownTemplateRow({
  record,
  isHovered,
  pinningId,
  onSelect,
  onTogglePin,
  onMouseEnter,
  onMouseLeave,
}: DropdownTemplateRowProps) {
  const permissions = useTemplatePermissions(record)
  const creatorLabel = record.createdBy.name || record.createdBy.email
  const recordNameUI = formatTemplateNameForUI(record.name)

  return (
    // biome-ignore lint/a11y/useSemanticElements: Not necessary for this component
    <FlexAny
      px="4"
      py="2"
      cursor="pointer"
      alignItems="center"
      gap="3"
      role="group"
      data-active={isHovered ? "true" : undefined}
      bg={isHovered ? "editorGray.100" : "transparent"}
      _hover={{ bg: "editorGray.100" }}
      data-testid={`templates-dropdown-row-${record.id}`}
      onClick={() => onSelect(record)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      transition="background-color 0.15s"
    >
      {/* Visibility Icon */}
      <IconAny
        as={record.isPrivate ? PiLock : PiGlobe}
        boxSize={4}
        color="editorBattleshipGrey.500"
        flexShrink={0}
      />

      {/* Template name */}
      <TooltipAny
        label={recordNameUI}
        openDelay={300}
        placement="top-start"
        hasArrow
      >
        <TextAny
          flex="1"
          minW={0}
          fontSize="sm"
          fontWeight="medium"
          isTruncated
          color="editorBattleshipGrey.800"
        >
          {truncateTemplateName(record.name)}
        </TextAny>
      </TooltipAny>

      {/* Creator on hover + pin (always visible for pinned, hover for others) */}
      <FlexAny alignItems="center" gap="3">
        {/* Creator: always rendered, shown/hidden via opacity to avoid layout shift */}
        <FlexAny
          alignItems="center"
          gap="1.5"
          maxW="36"
          transition="opacity 0.12s ease-in-out"
          opacity={isHovered ? 1 : 0}
          visibility={isHovered ? "visible" : "hidden"}
          data-testid={`templates-dropdown-creator-${record.id}`}
        >
          <AvatarAny
            name={creatorLabel}
            size="xs"
            fontSize="xs"
            fontWeight="bold"
            flexShrink={0}
            data-testid={`templates-dropdown-creator-avatar-${record.id}`}
          />
          <TextAny fontSize="xs" color="editorBattleshipGrey.500" isTruncated>
            {creatorLabel}
          </TextAny>
        </FlexAny>

        {/* Pin: only rendered when user has permission */}
        {permissions.pin && (
          <Box
            as="button"
            type="button"
            aria-label={
              record.isPinned
                ? `Unpin template ${recordNameUI}`
                : `Pin template ${recordNameUI}`
            }
            transition="opacity 0.12s ease-in-out"
            opacity={isHovered || record.isPinned ? 1 : 0}
            visibility={isHovered || record.isPinned ? "visible" : "hidden"}
            disabled={pinningId === record.id}
            onClick={(e: React.MouseEvent<HTMLElement>) => {
              e.stopPropagation()
              onTogglePin(record)
            }}
          >
            {pinningId === record.id ? (
              <SpinnerAny size="xs" color="editorBattleshipGrey.500" />
            ) : (
              <IconAny
                as={record.isPinned ? PiPushPinFill : PiPushPin}
                boxSize={4}
                color={
                  record.isPinned
                    ? "editorBlue.500"
                    : "editorBattleshipGrey.400"
                }
              />
            )}
          </Box>
        )}
      </FlexAny>
    </FlexAny>
  )
}

interface TemplatesDropdownProps {
  onViewAllTemplates?: () => void
}

export function TemplatesDropdown({
  onViewAllTemplates,
}: TemplatesDropdownProps) {
  const provider = useTemplateStorage()
  const { saveNow } = useTemplateSync()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(
    null,
  )
  const searchRef = useRef<HTMLInputElement>(null)
  const resultsScrollRef = useRef<HTMLDivElement>(null)

  const [isSavingAndContinuing, setIsSavingAndContinuing] = useState(false)

  const [pendingTemplate, setPendingTemplate] = useState<TemplateRecord | null>(
    null,
  )

  const { resetToNewTemplate } = useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const templateName = useEditorStore((s) => s.templateName)
  const transformations = useEditorStore((s) => s.transformations)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const hasUnsyncedChanges = useEditorStore(
    (s) => s.localChangeVersion !== s.lastSyncedVersion,
  )
  const isPristine = useEditorStore((s) => s.isPristine)
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )

  const fetchTemplates = useCallback(async () => {
    if (!provider) return
    setLoading(true)
    try {
      const list = await provider.listTemplates()
      setTemplates(list)
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    if (isOpen) {
      setSearch("")
      fetchTemplates()
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [isOpen, fetchTemplates])

  useEffect(() => {
    // Refetch templates when sync status changes to "saved" to reflect updates
    if (syncStatus === "saved") {
      fetchTemplates()
    }
  }, [syncStatus, fetchTemplates])

  const activeTemplate = templateId
    ? (templates.find((t) => t.id === templateId) ?? null)
    : null

  // Show a "Current" row whenever the editor has live (non-pristine) state,
  // regardless of whether the template has been saved to the provider yet.
  const shouldShowCurrent = !isPristine

  // Prefer server-side transformation count when available; fall back to store.
  const currentTransformCount = activeTemplate
    ? activeTemplate.transformations.length
    : transformations.length

  const filtered = useMemo(() => {
    return getDisplayTemplates({
      templates,
      templateId,
      templateName,
      shouldShowCurrent,
      search,
      searchMode: "name",
    }).slice(0, MAX_VISIBLE)
  }, [templates, templateId, templateName, shouldShowCurrent, search])

  const skeletonRows = useMemo(() => Array.from({ length: 5 }), [])

  useEffect(() => {
    if (!isOpen) return
    // If the hovered template is no longer in the filtered list (e.g. search changed),
    // clear the hover so keyboard navigation starts from the top again.
    if (
      hoveredTemplateId &&
      !filtered.some((t) => t.id === hoveredTemplateId)
    ) {
      setHoveredTemplateId(null)
    }
  }, [isOpen, hoveredTemplateId, filtered])

  if (!provider) return null
  const templateNameUI = formatTemplateNameForUI(templateName)

  const scrollRowIntoView = (templateIdToScroll: string) => {
    const el = resultsScrollRef.current?.querySelector(
      `[data-testid="templates-dropdown-row-${templateIdToScroll}"]`,
    ) as HTMLElement | null
    el?.scrollIntoView?.({ block: "nearest" })
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return
    if (e.key === "Enter") {
      e.preventDefault()
      const record =
        (hoveredTemplateId
          ? filtered.find((t) => t.id === hoveredTemplateId)
          : null) ?? filtered[0]
      if (record) handleSelect(record)
      return
    }

    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()

    const currentIndex = hoveredTemplateId
      ? filtered.findIndex((t) => t.id === hoveredTemplateId)
      : -1

    const nextIndex =
      e.key === "ArrowDown"
        ? (currentIndex + 1 + filtered.length) % filtered.length
        : (currentIndex - 1 + filtered.length) % filtered.length

    const next = filtered[nextIndex]
    if (!next) return
    setHoveredTemplateId(next.id)
    scrollRowIntoView(next.id)
  }

  const doLoadTemplate = (record: TemplateRecord) => {
    applyTemplateRecord(record)
    onClose()
    setPendingTemplate(null)
  }

  const handleSelect = (record: TemplateRecord) => {
    if (!hasUnsyncedChanges) {
      doLoadTemplate(record)
    } else {
      setPendingTemplate(record)
      onClose()
    }
  }

  const handleNewTemplate = () => {
    resetToNewTemplate()
    onClose()
  }

  const handleTogglePin = async (record: TemplateRecord) => {
    if (!provider) return

    try {
      setPinningId(record.id)
      const updated = await provider.setTemplatePinned(
        record.id,
        !record.isPinned,
      )

      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      )
    } catch (err) {
      if (record.id === templateId && isTemplateAccessDeniedError(err)) {
        useEditorStore
          .getState()
          .blockTemplateStorageWrites(
            err instanceof Error
              ? err.message
              : "You no longer have access to this template.",
          )
        return
      }
    } finally {
      setPinningId((current) => (current === record.id ? null : current))
    }
  }

  const handleSaveAndContinue = async () => {
    if (!provider || !pendingTemplate || templateStorageWriteBlocked) return
    try {
      setIsSavingAndContinuing(true)
      const saved = await saveNow({ reason: "manual" })
      // saveNow can return null (e.g. another save is already in progress).
      // In that case, do not switch templates or we'd drop unsaved changes.
      if (!saved) return
      doLoadTemplate(pendingTemplate)
    } catch (err) {
      const { setSyncStatus } = useEditorStore.getState()
      if (isTemplateAccessDeniedError(err)) {
        useEditorStore
          .getState()
          .blockTemplateStorageWrites(
            err instanceof Error
              ? err.message
              : "You no longer have access to this template.",
          )
        return
      }
      setSyncStatus(
        "error",
        err instanceof Error ? err.message : "Failed to save",
      )
    } finally {
      setIsSavingAndContinuing(false)
    }
  }

  const handleContinueWithoutSaving = () => {
    if (pendingTemplate) doLoadTemplate(pendingTemplate)
  }

  return (
    <>
      <Popover
        isOpen={isOpen}
        onOpen={onOpen}
        onClose={onClose}
        placement="bottom-start"
        isLazy
      >
        <PopoverTrigger>
          <BoxAny
            as="button"
            display="inline-flex"
            alignItems="center"
            gap="2"
            cursor="pointer"
            borderRadius="md"
            paddingX="4"
            paddingY="2"
            height="10"
            marginX="2"
            _hover={{ bg: "gray.100" }}
            transition="background-color 0.15s"
            aria-label="Open templates dropdown"
          >
            <Icon
              as={PiSquaresFourLight}
              boxSize={5}
              color="editorBattleshipGrey.600"
            />
            <TextAny
              fontSize="sm"
              fontWeight="medium"
              color="editorBattleshipGrey.700"
            >
              Templates
            </TextAny>
            <Icon
              as={PiCaretDown}
              boxSize={4}
              color="editorBattleshipGrey.600"
            />
          </BoxAny>
        </PopoverTrigger>
        <PopoverContentAny
          width="md"
          shadow="lg"
          p="0"
          overflow="hidden"
          borderWidth="0"
          outline="none"
          _focus={{
            boxShadow: "lg",
            outline: "none",
            borderColor: "transparent",
          }}
        >
          <PopoverBodyAny p="0">
            <FlexAny
              px="4"
              py="3"
              gap="3"
              alignItems="center"
              borderBottomWidth="1px"
              borderColor="editorGray.300"
            >
              <InputGroupAny size="md" flex="1" maxW="xs">
                <InputLeftElementAny pointerEvents="none" pl="2">
                  <IconAny as={PiMagnifyingGlass} color="gray.400" />
                </InputLeftElementAny>
                <InputAny
                  ref={searchRef}
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                  onKeyDown={handleSearchKeyDown}
                  bg="white"
                  borderColor="gray.200"
                  borderRadius="md"
                  px="3"
                  fontSize="sm"
                  fontWeight="400"
                  _placeholder={{ fontWeight: "400" }}
                  _hover={{ borderColor: "gray.300" }}
                  _focus={{
                    borderColor: "blue.500",
                    boxShadow: "0 0 0 1px #3182ce",
                  }}
                />
              </InputGroupAny>
              <ButtonAny
                size="sm"
                variant="ghost"
                leftIcon={<IconAny as={PiPlus} boxSize={4} />}
                px="4"
                h="10"
                minH="10"
                flexShrink={0}
                fontWeight="normal"
                onClick={handleNewTemplate}
              >
                New
              </ButtonAny>
            </FlexAny>

            <Box h="72" overflowY="auto" ref={resultsScrollRef}>
              {loading ? (
                <Box px="4" py="3">
                  <Flex direction="column" gap="2">
                    {skeletonRows.map((_, i) => (
                      <Flex
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable fixed skeleton list
                        key={i}
                        px="2"
                        py="2"
                        alignItems="center"
                        gap="3"
                      >
                        <Skeleton
                          height="16px"
                          width="16px"
                          borderRadius="md"
                          flexShrink={0}
                        />
                        <Box flex="1" minW={0}>
                          <SkeletonText noOfLines={1} spacing="2" />
                        </Box>
                        <SkeletonCircle size="6" flexShrink={0} />
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              ) : (
                <>
                  {shouldShowCurrent && (
                    <FlexAny
                      px="4"
                      py="2"
                      alignItems="center"
                      bg="blue.50"
                      borderBottomWidth="1px"
                      borderColor="blue.100"
                      pointerEvents="none"
                      gap="3"
                    >
                      {/* Visibility Icon (fallback to private when unknown) */}
                      <IconAny
                        as={
                          activeTemplate?.isPrivate === false ? PiGlobe : PiLock
                        }
                        boxSize={4}
                        color="blue.700"
                        flexShrink={0}
                      />

                      {/* Name + badge */}
                      <Box flex="1" minW={0}>
                        <FlexAny alignItems="center" gap="2">
                          <TooltipAny
                            label={templateNameUI}
                            openDelay={300}
                            placement="top-start"
                            hasArrow
                          >
                            <TextAny
                              fontSize="sm"
                              fontWeight="medium"
                              isTruncated
                              color="blue.800"
                            >
                              {truncateTemplateName(templateName)}
                            </TextAny>
                          </TooltipAny>
                          <BadgeAny
                            colorScheme="blue"
                            fontSize="xs"
                            flexShrink={0}
                          >
                            Current
                          </BadgeAny>
                        </FlexAny>
                      </Box>

                      {/* Transform count on the right */}
                      <TextAny fontSize="xs" color="blue.600" flexShrink={0}>
                        {currentTransformCount} transformation
                        {currentTransformCount !== 1 ? "s" : ""}
                      </TextAny>
                    </FlexAny>
                  )}

                  {filtered.length === 0 && !shouldShowCurrent ? (
                    <FlexAny
                      px="4"
                      py="8"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <TextAny fontSize="sm" color="editorBattleshipGrey.500">
                        {search
                          ? "No templates found"
                          : "No saved templates yet"}
                      </TextAny>
                    </FlexAny>
                  ) : filtered.length === 0 && shouldShowCurrent ? (
                    <FlexAny
                      px="4"
                      py="6"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <TextAny fontSize="sm" color="editorBattleshipGrey.500">
                        {search
                          ? "No other templates found"
                          : "No other saved templates"}
                      </TextAny>
                    </FlexAny>
                  ) : (
                    filtered.map((record) => (
                      <DropdownTemplateRow
                        key={record.id}
                        record={record}
                        isHovered={hoveredTemplateId === record.id}
                        pinningId={pinningId}
                        onSelect={handleSelect}
                        onTogglePin={handleTogglePin}
                        onMouseEnter={() => setHoveredTemplateId(record.id)}
                        onMouseLeave={() =>
                          setHoveredTemplateId((current) =>
                            current === record.id ? null : current,
                          )
                        }
                      />
                    ))
                  )}
                </>
              )}
            </Box>

            {/* Always show "View all templates" when callback is provided, or when there are more templates than visible */}
            {onViewAllTemplates ? (
              <>
                <DividerAny borderColor="editorGray.300" />
                <FlexAny px="4" py="3" justifyContent="flex-start">
                  <ButtonAny
                    size="sm"
                    variant="ghost"
                    leftIcon={<IconAny as={PiSquaresFourLight} boxSize={4} />}
                    color="editorGray.700"
                    fontWeight="normal"
                    onClick={() => {
                      onClose()
                      // Defer to next tick to allow popover to close cleanly
                      setTimeout(() => onViewAllTemplates?.(), 0)
                    }}
                  >
                    View all templates
                  </ButtonAny>
                </FlexAny>
              </>
            ) : templates.length > MAX_VISIBLE + (shouldShowCurrent ? 1 : 0) ? (
              <>
                <DividerAny borderColor="editorGray.300" />
                <FlexAny px="4" py="3" justifyContent="center">
                  <TextAny fontSize="sm" color="editorBattleshipGrey.500">
                    {templates.length} templates total
                  </TextAny>
                </FlexAny>
              </>
            ) : null}
          </PopoverBodyAny>
        </PopoverContentAny>
      </Popover>

      {pendingTemplate !== null && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.400"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1500}
          onClick={() => {
            if (isSavingAndContinuing) return
            setPendingTemplate(null)
          }}
        >
          <Box
            w="40vw"
            maxW="40vw"
            bg="white"
            borderRadius="xl"
            boxShadow="xl"
            display="flex"
            flexDirection="column"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <FlexAny
              px="6"
              py="4"
              alignItems="center"
              justifyContent="space-between"
              borderBottomWidth="1px"
              borderColor="editorGray.300"
            >
              <TextAny
                fontSize="lg"
                fontWeight="semibold"
                color="editorGray.900"
              >
                Unsaved changes
              </TextAny>
            </FlexAny>

            {/* Body */}
            <Box px="6" py="6" flex="1">
              <TextAny fontSize="sm" color="editorGray.700" lineHeight="1.6">
                Your current changes haven&apos;t been saved yet. What would you
                like to do before switching to{" "}
                <Box as="span" fontWeight="semibold" color="editorGray.900">
                  {formatTemplateNameForUI(pendingTemplate.name)}
                </Box>
                ?
              </TextAny>
            </Box>

            {/* Footer */}
            <FlexAny
              px="6"
              py="4"
              alignItems="center"
              justifyContent="flex-end"
              gap="3"
              borderTopWidth="1px"
              borderColor="editorGray.300"
            >
              {/* Cancel */}
              <Box
                as="button"
                display="inline-flex"
                alignItems="center"
                px="4"
                py="2"
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                color={isSavingAndContinuing ? "gray.400" : "editorGray.700"}
                cursor={isSavingAndContinuing ? "not-allowed" : "pointer"}
                _hover={{ bg: isSavingAndContinuing ? undefined : "gray.50" }}
                onClick={
                  isSavingAndContinuing
                    ? undefined
                    : () => setPendingTemplate(null)
                }
                aria-disabled={isSavingAndContinuing}
              >
                Cancel
              </Box>

              {/* Continue without saving */}
              <Box
                as="button"
                display="inline-flex"
                alignItems="center"
                px="4"
                py="2"
                borderRadius="md"
                borderWidth="1px"
                borderColor={isSavingAndContinuing ? "gray.200" : "gray.300"}
                fontSize="sm"
                fontWeight="medium"
                color={isSavingAndContinuing ? "gray.400" : "editorGray.700"}
                cursor={isSavingAndContinuing ? "not-allowed" : "pointer"}
                _hover={{ bg: isSavingAndContinuing ? undefined : "gray.50" }}
                onClick={
                  isSavingAndContinuing
                    ? undefined
                    : handleContinueWithoutSaving
                }
                aria-disabled={isSavingAndContinuing}
              >
                Continue without saving
              </Box>

              {/* Save and continue */}
              <Box
                as="button"
                display="inline-flex"
                alignItems="center"
                gap="2"
                px="4"
                py="2"
                borderRadius="md"
                bg={
                  isSavingAndContinuing || templateStorageWriteBlocked
                    ? "blue.200"
                    : "blue.500"
                }
                color="white"
                fontSize="sm"
                fontWeight="medium"
                cursor={
                  isSavingAndContinuing || templateStorageWriteBlocked
                    ? "not-allowed"
                    : "pointer"
                }
                _hover={{
                  bg:
                    isSavingAndContinuing || templateStorageWriteBlocked
                      ? "blue.200"
                      : "blue.600",
                }}
                onClick={
                  isSavingAndContinuing || templateStorageWriteBlocked
                    ? undefined
                    : handleSaveAndContinue
                }
                aria-disabled={
                  isSavingAndContinuing || templateStorageWriteBlocked
                }
              >
                {isSavingAndContinuing && (
                  <SpinnerAny size="xs" color="white" />
                )}
                {isSavingAndContinuing ? "Saving…" : "Save and continue"}
              </Box>
            </FlexAny>
          </Box>
        </Box>
      )}
    </>
  )
}
