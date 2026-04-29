import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
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
  Spinner,
  Text,
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
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import type { TemplateRecord } from "../../storage"
import { applyTemplateStorageAccessFailure } from "../../storage/templateAccessError"
import { useEditorStore } from "../../store"
import { formatTemplateNameForUI, truncateTemplateName } from "../../utils"

const PopoverContentAny = PopoverContent as unknown as React.FC<
  Record<string, unknown>
>

const PopoverBodyAny = PopoverBody as unknown as React.FC<
  Record<string, unknown>
>

const AlertDialogContentAny = AlertDialogContent as unknown as React.FC<
  Record<string, unknown>
>

const BoxAny = Box as unknown as React.FC<Record<string, unknown>>
const TextAny = Text as unknown as React.ElementType
const FlexAny = Flex as unknown as React.ElementType
const DividerAny = Divider as unknown as React.ElementType
const ButtonAny = Button as unknown as React.ElementType
const IconAny = Icon as unknown as React.ElementType
const AlertDialogHeaderAny = AlertDialogHeader as unknown as React.ElementType
const AlertDialogBodyAny = AlertDialogBody as unknown as React.ElementType
const AlertDialogFooterAny = AlertDialogFooter as unknown as React.ElementType
const InputGroupAny = InputGroup as unknown as React.ElementType
const InputLeftElementAny = InputLeftElement as unknown as React.ElementType
const InputAny = Input as unknown as React.ElementType
const BadgeAny = Badge as unknown as React.ElementType
const AvatarAny = Avatar as unknown as React.ElementType
const SpinnerAny = Spinner as unknown as React.ElementType

const MAX_VISIBLE = 5

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
  const [search, setSearch] = useState("")
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(
    null,
  )
  const searchRef = useRef<HTMLInputElement>(null)
  const resultsScrollRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [isSavingAndContinuing, setIsSavingAndContinuing] = useState(false)

  const [pendingTemplate, setPendingTemplate] = useState<TemplateRecord | null>(
    null,
  )

  const { loadTemplate, resetToNewTemplate } = useEditorStore()
  const hydrateTemplateMetadata = useEditorStore(
    (s) => s.hydrateTemplateMetadata,
  )
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
    const list = await provider.listTemplates()
    setTemplates(list)
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
    const base = templates
      .filter((t) => t.id !== templateId)
      .filter((t) => {
        if (
          shouldShowCurrent &&
          templateId === null &&
          t.name === templateName
        ) {
          return false
        }
        return true
      })
      .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))

    // Sort by: pinned first, then by most recently used/updated
    return [...base]
      .sort((a, b) => {
        const aPinned = a.isPinned ? 1 : 0
        const bPinned = b.isPinned ? 1 : 0
        if (aPinned !== bPinned) {
          return bPinned - aPinned
        }

        const aTime = a.lastUsedAt ?? a.updatedAt
        const bTime = b.lastUsedAt ?? b.updatedAt
        return bTime - aTime
      })
      .slice(0, MAX_VISIBLE)
  }, [templates, templateId, search, shouldShowCurrent, templateName])

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
    loadTemplate(record.transformations)
    hydrateTemplateMetadata({
      templateId: record.id,
      templateName: record.name,
      templateIsPrivate: record.isPrivate,
    })
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
      const { denyTemplateStorageAccess } = useEditorStore.getState()
      if (
        record.id === templateId &&
        applyTemplateStorageAccessFailure(err, {
          denyTemplateStorageAccess,
        })
      ) {
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
      const { denyTemplateStorageAccess, setSyncStatus } =
        useEditorStore.getState()
      if (
        applyTemplateStorageAccessFailure(err, {
          denyTemplateStorageAccess,
        })
      ) {
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
            _hover={{ bg: "editorGray.200" }}
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
                flexShrink={0}
                fontWeight="normal"
                onClick={handleNewTemplate}
              >
                New
              </ButtonAny>
            </FlexAny>

            <Box maxH="72" overflowY="auto" ref={resultsScrollRef}>
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
                    as={activeTemplate?.isPrivate === false ? PiGlobe : PiLock}
                    boxSize={4}
                    color="blue.700"
                    flexShrink={0}
                  />

                  {/* Name + badge */}
                  <Box flex="1" minW={0}>
                    <FlexAny alignItems="center" gap="2">
                      <TextAny
                        fontSize="sm"
                        fontWeight="medium"
                        isTruncated
                        color="blue.800"
                        title={templateNameUI}
                      >
                        {truncateTemplateName(templateName)}
                      </TextAny>
                      <BadgeAny colorScheme="blue" fontSize="xs" flexShrink={0}>
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
                    {search ? "No templates found" : "No saved templates yet"}
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
                filtered.map((record) =>
                  (() => {
                    const isHovered = hoveredTemplateId === record.id
                    const creatorLabel =
                      record.createdBy.name || record.createdBy.email
                    const recordNameUI = formatTemplateNameForUI(record.name)

                    return (
                      // biome-ignore lint/a11y/useSemanticElements: Not necessary for this component
                      <FlexAny
                        key={record.id}
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
                        onClick={() => handleSelect(record)}
                        onMouseEnter={() => setHoveredTemplateId(record.id)}
                        onMouseLeave={() =>
                          setHoveredTemplateId((current) =>
                            current === record.id ? null : current,
                          )
                        }
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
                        <TextAny
                          flex="1"
                          minW={0}
                          fontSize="sm"
                          fontWeight="medium"
                          isTruncated
                          color="editorBattleshipGrey.800"
                          title={recordNameUI}
                        >
                          {truncateTemplateName(record.name)}
                        </TextAny>

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
                            <TextAny
                              fontSize="xs"
                              color="editorBattleshipGrey.500"
                              isTruncated
                            >
                              {creatorLabel}
                            </TextAny>
                          </FlexAny>

                          {/* Pin: always rendered, shown/hidden via opacity to avoid layout shift */}
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
                            visibility={
                              isHovered || record.isPinned
                                ? "visible"
                                : "hidden"
                            }
                            disabled={pinningId === record.id}
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                              e.stopPropagation()
                              handleTogglePin(record)
                            }}
                          >
                            {pinningId === record.id ? (
                              <SpinnerAny
                                size="xs"
                                color="editorBattleshipGrey.500"
                              />
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
                        </FlexAny>
                      </FlexAny>
                    )
                  })(),
                )
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

      <AlertDialog
        isOpen={pendingTemplate !== null}
        leastDestructiveRef={cancelRef}
        onClose={() => {
          if (isSavingAndContinuing) return
          setPendingTemplate(null)
        }}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContentAny
            w="45vw"
            maxW="45vw"
            h="40vh"
            maxH="40vh"
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="xl"
            display="flex"
            flexDirection="column"
          >
            <AlertDialogHeaderAny
              fontSize="lg"
              fontWeight="semibold"
              color="editorGray.900"
              px="6"
              py="4"
              borderBottomWidth="0.5px"
              borderColor="editorGray.50"
            >
              Unsaved changes
            </AlertDialogHeaderAny>
            <AlertDialogBodyAny
              fontSize="lg"
              color="editorGray.700"
              p="6"
              flex="1"
              overflowY="auto"
            >
              Your current changes haven't been saved yet. What would you like
              to do before switching to{" "}
              <Box as="span" fontWeight="semibold">
                {pendingTemplate
                  ? formatTemplateNameForUI(pendingTemplate.name)
                  : null}
              </Box>
              ?
            </AlertDialogBodyAny>
            <AlertDialogFooterAny
              p="6"
              borderTopWidth="0.5px"
              borderColor="editorGray.50"
              gap="3"
            >
              <ButtonAny
                ref={cancelRef}
                size="md"
                variant="ghost"
                onClick={() => setPendingTemplate(null)}
                isDisabled={isSavingAndContinuing}
              >
                Cancel
              </ButtonAny>
              <ButtonAny
                size="md"
                variant="outline"
                onClick={handleContinueWithoutSaving}
                isDisabled={isSavingAndContinuing}
              >
                Continue without saving
              </ButtonAny>
              <ButtonAny
                size="md"
                colorScheme="blue"
                onClick={handleSaveAndContinue}
                isLoading={isSavingAndContinuing}
                isDisabled={templateStorageWriteBlocked}
              >
                Save and continue
              </ButtonAny>
            </AlertDialogFooterAny>
          </AlertDialogContentAny>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}
