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
  Spinner,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { PiArrowLeft } from "@react-icons/all-files/pi/PiArrowLeft"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiFileCsv } from "@react-icons/all-files/pi/PiFileCsv"
import { PiGear } from "@react-icons/all-files/pi/PiGear"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiPushPin } from "@react-icons/all-files/pi/PiPushPin"
import { PiPushPinFill } from "@react-icons/all-files/pi/PiPushPinFill"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { useVirtualizer } from "@tanstack/react-virtual"
import humanDate from "human-date"
import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTemplatePermissions } from "../../context/TemplatePermissionsContext"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useDebounce } from "../../hooks/useDebounce"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"
import {
  chakraAny,
  formatTemplateNameForUI,
  getDisplayTemplates,
  truncateTemplateName,
} from "../../utils"
import FilterChipsField from "../common/FilterChipsField"
import MultiSelectListField from "../common/MultiSelectListField"
import { SettingsModal } from "../header/SettingsModal"

interface Props {
  onClose(): void
}

const FlexAny = chakraAny(Flex)
const TextAny = chakraAny(Text)
const AvatarAny = chakraAny(Avatar)
const ButtonAny = chakraAny(Button)
const SpinnerAny = chakraAny(Spinner)
const BadgeAny = chakraAny(Badge)
const InputGroupAny = chakraAny(InputGroup)
const InputLeftElementAny = chakraAny(InputLeftElement)
const InputAny = chakraAny(Input)
const TooltipAny = chakraAny(Tooltip)
const IconAny = chakraAny(Icon)
const PopoverContentAny = chakraAny(PopoverContent)
const PopoverBodyAny = chakraAny(PopoverBody)
const DividerAny = chakraAny(Divider)

function formatRelativeTime(ts: number): string {
  const now = Date.now()
  // If the timestamp is within 10 seconds of now, show "Just now"
  if (Math.abs(now - ts) < 10 * 1000) {
    return "Just now"
  }
  const tsDate = new Date(ts)
  return humanDate.relativeTime(tsDate)
}

export function TemplatesLibraryView({ onClose }: Props) {
  const provider = useTemplateStorage()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebounce(searchInput, 200)
  const [visibilityFilter, setVisibilityFilter] = useState<string[]>([])
  const [creatorFilter, setCreatorFilter] = useState<string[]>([])
  const [pinningId, setPinningId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsRecord, setSettingsRecord] = useState<TemplateRecord | null>(
    null,
  )
  const [activeVirtualIndex, setActiveVirtualIndex] = useState<number | null>(
    null,
  )
  // Used to make keyboard navigation deterministic even under batched updates
  // (e.g. rapid key presses or tight loops in tests).
  const activeVirtualIndexRef = useRef<number | null>(null)

  const { loadTemplatePayload, resetToNewTemplate, hydrateTemplateMetadata } =
    useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const templateName = useEditorStore((s) => s.templateName)
  const isPristine = useEditorStore((s) => s.isPristine)
  const onBulkGenerate = useEditorStore((s) => s.onBulkGenerate)
  const hasUnsyncedChanges = useEditorStore(
    (s) => s.localChangeVersion !== s.lastSyncedVersion,
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
    fetchTemplates()
  }, [fetchTemplates])

  const shouldShowCurrent = !isPristine

  const activeTemplate = templateId
    ? (templates.find((t) => t.id === templateId) ?? null)
    : null

  const scrollParentRef = useRef<HTMLDivElement | null>(null)

  const uniqueCreators = useMemo(() => {
    const seen = new Map<string, { name: string; email: string }>()
    for (const t of templates) {
      if (!seen.has(t.createdBy.userId)) {
        seen.set(t.createdBy.userId, {
          name: t.createdBy.name || t.createdBy.email,
          email: t.createdBy.email,
        })
      }
    }
    return Array.from(seen.entries()).map(([userId, { name, email }]) => ({
      userId,
      name,
      email,
    }))
  }, [templates])

  const filtered = useMemo(() => {
    const base = getDisplayTemplates({
      templates,
      templateId,
      templateName,
      shouldShowCurrent,
      search,
      searchMode: "nameOrCreator",
    })
      .filter((t) => {
        if (visibilityFilter.length === 0) return true
        const allowPrivate = visibilityFilter.includes("private")
        const allowShared = visibilityFilter.includes("shared")
        // If both are selected, visibility is effectively unfiltered (OR across both buckets).
        if (allowPrivate && allowShared) return true
        if (allowPrivate) return t.isPrivate
        if (allowShared) return !t.isPrivate
        return true
      })
      .filter((t) =>
        creatorFilter.length > 0
          ? creatorFilter.includes(t.createdBy.userId)
          : true,
      )

    // getDisplayTemplates already returns a pinned+recent sorted list.
    return base
  }, [
    templates,
    templateId,
    templateName,
    search,
    visibilityFilter,
    creatorFilter,
    shouldShowCurrent,
  ])

  const handleSelect = (record: TemplateRecord) => {
    if (!hasUnsyncedChanges) {
      loadTemplatePayload({
        transformations: record.transformations,
        variables: record.variables,
      })
      hydrateTemplateMetadata({
        templateId: record.id,
        templateName: record.name,
        templateIsPrivate: record.isPrivate,
      })
      onClose()
    }
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
    } catch {
      // Silently ignore pin failures in this view
    } finally {
      setPinningId((current) => (current === record.id ? null : current))
    }
  }

  const deleteTemplateAndCleanup = useCallback(
    async (record: TemplateRecord) => {
      if (!provider) return
      if (!provider.deleteTemplate) return

      await provider.deleteTemplate(record.id)
      setTemplates((prev) => prev.filter((t) => t.id !== record.id))

      if (record.id === useEditorStore.getState().templateId) {
        resetToNewTemplate()
      }
    },
    [provider, resetToNewTemplate],
  )

  const handleOpenSettings = useCallback((record: TemplateRecord) => {
    setSettingsRecord(record)
    setIsSettingsOpen(true)
  }, [])

  const showCurrentRow = shouldShowCurrent && activeTemplate !== null

  const virtualRowCount = showCurrentRow ? filtered.length + 1 : filtered.length

  const getRowByVirtualIndex = useCallback(
    (virtualIndex: number): { record: TemplateRecord; isCurrent: boolean } => {
      if (showCurrentRow) {
        if (virtualIndex === 0) {
          // biome-ignore lint/style/noNonNullAssertion: guarded by showCurrentRow
          return { record: activeTemplate!, isCurrent: true }
        }
        return { record: filtered[virtualIndex - 1], isCurrent: false }
      }

      return { record: filtered[virtualIndex], isCurrent: false }
    },
    [filtered, showCurrentRow, activeTemplate],
  )

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: virtualRowCount,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 84,
    overscan: 10,
    getItemKey: (index: number) => {
      if (showCurrentRow && index === 0) {
        return `current:${activeTemplate?.id ?? "unknown"}`
      }
      const row = getRowByVirtualIndex(index)
      return row.record.id
    },
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset active row on filter/search changes
  useEffect(() => {
    setActiveVirtualIndex(null)
    activeVirtualIndexRef.current = null
  }, [search, visibilityFilter, creatorFilter, templates.length, templateId])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (virtualRowCount === 0) return

    if (e.key === "Enter") {
      e.preventDefault()
      const activeIndex = activeVirtualIndexRef.current
      if (activeIndex === null) return

      const { record } = getRowByVirtualIndex(activeIndex)
      handleSelect(record)
      return
    }

    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()

    // Avoid wrap-around (cyclic navigation) for very large lists. When the
    // virtualized list is big, wrapping makes it too easy to "lose" your place.
    const shouldCycle = virtualRowCount <= 200
    const current = activeVirtualIndexRef.current ?? -1
    const next = shouldCycle
      ? e.key === "ArrowDown"
        ? (current + 1 + virtualRowCount) % virtualRowCount
        : (current - 1 + virtualRowCount) % virtualRowCount
      : e.key === "ArrowDown"
        ? Math.min(current + 1, virtualRowCount - 1)
        : Math.max(current - 1, 0)

    activeVirtualIndexRef.current = next
    setActiveVirtualIndex(next)
    rowVirtualizer.scrollToIndex(next, { align: "auto" })
  }

  return (
    <FlexAny
      flexDirection="column"
      width="full"
      flex="1 1 0"
      minH={0}
      background="white"
      overflowY="hidden"
    >
      {/* Static top section: title, filters */}
      <Box px="6" pt="4" pb="3" flexShrink={0}>
        <Box
          width="100%"
          mx="auto"
          display="flex"
          flexDirection="column"
          gap="4"
        >
          <ButtonAny
            onClick={onClose}
            variant="ghost"
            size="xs"
            alignSelf="flex-start"
            leftIcon={<IconAny as={PiArrowLeft} boxSize={4} />}
            color="editorBattleshipGrey.500"
            _hover={{ color: "editorBattleshipGrey.700", bg: "transparent" }}
            px="0"
          >
            Go back
          </ButtonAny>

          <FlexAny alignItems="center" justifyContent="space-between">
            <Box>
              <TextAny
                fontSize="lg"
                fontWeight="semibold"
                color="editorBattleshipGrey.900"
              >
                All templates
              </TextAny>
              <TextAny fontSize="sm" color="editorBattleshipGrey.500">
                Browse and load templates created by you or shared with you.
              </TextAny>
            </Box>
            <ButtonAny
              size="md"
              colorScheme="blue"
              leftIcon={<IconAny as={PiPlus} boxSize={4} />}
              px="4"
              onClick={() => {
                resetToNewTemplate()
                onClose()
              }}
            >
              New template
            </ButtonAny>
          </FlexAny>

          {/* Controls bar */}
          <FlexAny
            mt="2"
            gap="2"
            alignItems="center"
            justifyContent="flex-start"
            w="100%"
            flexWrap="wrap"
          >
            <InputGroupAny size="md" maxW="xs">
              <InputLeftElementAny pointerEvents="none" pl="2">
                <IconAny as={PiMagnifyingGlass} color="gray.400" />
              </InputLeftElementAny>
              <InputAny
                placeholder="Search templates..."
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchInput(e.target.value)
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

            <FilterChipsField
              options={[
                { label: "Only to me", value: "private", icon: PiLock },
                {
                  label: "Shared with everyone",
                  value: "shared",
                  icon: PiGlobe,
                },
              ]}
              value={visibilityFilter}
              onChange={setVisibilityFilter}
            />

            <Popover placement="bottom-start">
              <PopoverTrigger>
                <Box
                  as="button"
                  cursor="pointer"
                  borderWidth="1px"
                  borderRadius="md"
                  p="2"
                  borderColor="gray.200"
                  bg="transparent"
                  transition="all 0.12s ease-in-out"
                  _hover={{ bg: "gray.50" }}
                  _focus={{ outline: "none", boxShadow: "none" }}
                  _active={{ outline: "none", boxShadow: "none" }}
                  _focusVisible={{ outline: "none", boxShadow: "none" }}
                  sx={{
                    "&:focus": {
                      outline: "none !important",
                      boxShadow: "none !important",
                    },
                    "&:focus-visible": {
                      outline: "none !important",
                      boxShadow: "none !important",
                    },
                  }}
                >
                  <FlexAny align="center" gap="2">
                    <TextAny
                      fontSize="sm"
                      fontWeight="400"
                      noOfLines={1}
                      opacity={creatorFilter.length > 0 ? 1 : 0.5}
                    >
                      Created by
                    </TextAny>
                    {creatorFilter.length > 0 && (
                      <BadgeAny colorScheme="blue" fontSize="xs">
                        {creatorFilter.length}
                      </BadgeAny>
                    )}
                    <IconAny as={PiCaretDown} boxSize="16px" />
                  </FlexAny>
                </Box>
              </PopoverTrigger>
              <PopoverContentAny
                width="320px"
                p="0"
                outline="none"
                boxShadow="md"
                borderWidth="0"
                _focus={{
                  outline: "none",
                  boxShadow: "md",
                  borderColor: "transparent",
                }}
              >
                <PopoverBodyAny p="0" display="flex" flexDirection="column">
                  <MultiSelectListField
                    options={uniqueCreators.map(({ userId, name, email }) => ({
                      label: name,
                      value: userId,
                      email: email || undefined,
                    }))}
                    value={creatorFilter}
                    onChange={setCreatorFilter}
                    isSearchable
                    selectedFirst
                    showSelectedSeparator
                  />
                  <DividerAny
                    alignSelf="center"
                    my="0"
                    borderColor="gray.200"
                  />
                  <ButtonAny
                    w="full"
                    variant="ghost"
                    fontSize="sm"
                    py="2"
                    fontWeight="400"
                    isDisabled={creatorFilter.length === 0}
                    _hover={{
                      bg:
                        creatorFilter.length === 0 ? "transparent" : "gray.50",
                    }}
                    _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                    onClick={() => setCreatorFilter([])}
                  >
                    Clear selected
                  </ButtonAny>
                </PopoverBodyAny>
              </PopoverContentAny>
            </Popover>
          </FlexAny>
        </Box>
      </Box>

      {/* Scrollable table area */}
      <FlexAny
        flexDirection="column"
        flex="1 1 0"
        minH={0}
        px="6"
        pb="4"
        overflowY="hidden"
      >
        <Box
          width="100%"
          mx="auto"
          display="flex"
          flexDirection="column"
          flex="1 1 0"
          minH={0}
          overflowY="auto"
          ref={scrollParentRef}
          data-testid="templates-library-scroll"
        >
          {loading ? (
            <FlexAny justifyContent="center" alignItems="center" py="16">
              <SpinnerAny size="md" color="editorBattleshipGrey.400" />
            </FlexAny>
          ) : (
            <>
              {/* Table header */}
              <FlexAny
                px="5"
                py="2"
                alignItems="center"
                borderBottomWidth="1px"
                borderColor="editorGray.300"
                fontSize="xs"
                color="editorBattleshipGrey.500"
                textTransform="uppercase"
                letterSpacing="0.06em"
              >
                {/* Pin column spacer to align with row */}
                <Box flexShrink={0} w="8" />
                <Box flex="3" minW={0} ml="2">
                  <TextAny textAlign="left">Name</TextAny>
                </Box>
                <Box flex="2" minW={0}>
                  <TextAny textAlign="left">Created by</TextAny>
                </Box>
                <Box flex="1.5" minW={0}>
                  <TextAny textAlign="left">Visibility</TextAny>
                </Box>
                <Box flex="1.5" minW={0}>
                  <TextAny textAlign="left">Last updated</TextAny>
                </Box>
                <Box flexShrink={0} w="8" />
              </FlexAny>

              {/* Filtered templates */}
              {filtered.length === 0 && !showCurrentRow ? (
                <FlexAny
                  justifyContent="center"
                  alignItems="center"
                  py="16"
                  flexDirection="column"
                  gap="2"
                >
                  <TextAny fontSize="sm" color="editorBattleshipGrey.500">
                    {search ||
                    visibilityFilter.length > 0 ||
                    creatorFilter.length > 0
                      ? "No templates match your filters"
                      : shouldShowCurrent
                        ? "No other saved templates"
                        : "No saved templates yet"}
                  </TextAny>
                </FlexAny>
              ) : (
                <Box
                  height={`${rowVirtualizer.getTotalSize()}px`}
                  position="relative"
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const { record, isCurrent } = getRowByVirtualIndex(
                      virtualRow.index,
                    )
                    const isActive = activeVirtualIndex === virtualRow.index

                    return (
                      <Box
                        key={String(virtualRow.key)}
                        position="absolute"
                        top={0}
                        left={0}
                        width="100%"
                        transform={`translateY(${virtualRow.start}px)`}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        data-active={isActive ? "true" : undefined}
                        data-testid={
                          isCurrent
                            ? `templates-library-row-current-${record.id}`
                            : `templates-library-row-${record.id}`
                        }
                      >
                        <TemplateRow
                          record={record}
                          onSelect={
                            isCurrent
                              ? () => {
                                  // Current row is informational; selecting it is a no-op.
                                }
                              : handleSelect
                          }
                          onTogglePin={handleTogglePin}
                          isPinning={pinningId === record.id}
                          onDelete={deleteTemplateAndCleanup}
                          onSettings={handleOpenSettings}
                          onBulkGenerate={
                            onBulkGenerate
                              ? (r) =>
                                  onBulkGenerate({ id: r.id, name: r.name })
                              : undefined
                          }
                          isCurrent={isCurrent}
                          isActive={isActive}
                        />
                      </Box>
                    )
                  })}
                </Box>
              )}
            </>
          )}
        </Box>
      </FlexAny>
      {isSettingsOpen && settingsRecord && (
        <SettingsModal
          key={settingsRecord.id}
          data={settingsRecord}
          onClose={() => {
            setIsSettingsOpen(false)
            setSettingsRecord(null)
          }}
          onSaved={(updated) => {
            // Refresh the template list so the updated name/visibility is reflected
            setTemplates((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t)),
            )
          }}
          onDeleteRequested={async () => {
            await deleteTemplateAndCleanup(settingsRecord)
          }}
        />
      )}
    </FlexAny>
  )
}

interface TemplateRowProps {
  record: TemplateRecord
  onSelect(record: TemplateRecord): void
  onTogglePin(record: TemplateRecord): void
  onDelete(record: TemplateRecord): void
  onSettings(record: TemplateRecord): void
  onBulkGenerate?: (record: TemplateRecord) => void
  isPinning: boolean
  isCurrent?: boolean
  isActive?: boolean
}

function TemplateRow({
  record,
  onSelect,
  onTogglePin,
  onDelete,
  onSettings,
  onBulkGenerate,
  isPinning,
  isCurrent = false,
  isActive = false,
}: TemplateRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const permissions = useTemplatePermissions(record)
  const recordNameUI = formatTemplateNameForUI(record.name)
  return (
    <FlexAny
      px="5"
      py="4"
      alignItems="center"
      cursor={isCurrent ? "default" : "pointer"}
      borderBottomWidth="1px"
      borderColor="editorGray.200"
      bg={isCurrent ? "blue.50" : isActive ? "editorGray.50" : "transparent"}
      _hover={isCurrent ? undefined : { bg: "editorGray.50" }}
      onClick={() => {
        if (!isCurrent) onSelect(record)
      }}
    >
      {/* Pin */}
      <Box flexShrink={0} w="8">
        {permissions.pin && (
          <Box
            as="button"
            type="button"
            disabled={isPinning}
            onClick={(e: React.MouseEvent<HTMLElement>) => {
              e.stopPropagation()
              onTogglePin(record)
            }}
          >
            {isPinning ? (
              <SpinnerAny size="sm" color="editorBattleshipGrey.500" />
            ) : (
              <Icon
                as={record.isPinned ? PiPushPinFill : PiPushPin}
                boxSize={5}
                color={
                  record.isPinned
                    ? "editorBlue.500"
                    : "editorBattleshipGrey.400"
                }
              />
            )}
          </Box>
        )}
      </Box>

      {/* Name + transform count */}
      <Box flex="3" minW={0} ml="2">
        <FlexAny alignItems="center" gap="2" mb="1">
          <TooltipAny
            label={recordNameUI}
            openDelay={300}
            placement="top-start"
            hasArrow
            shouldWrapChildren
          >
            <TextAny
              fontSize="sm"
              fontWeight="medium"
              color={isCurrent ? "blue.800" : "editorBattleshipGrey.700"}
              isTruncated
            >
              {truncateTemplateName(record.name)}
            </TextAny>
          </TooltipAny>
          {isCurrent && (
            <BadgeAny colorScheme="blue" fontSize="xs" flexShrink={0}>
              Current
            </BadgeAny>
          )}
        </FlexAny>
        <TextAny
          fontSize="xs"
          color={isCurrent ? "blue.500" : "editorBattleshipGrey.500"}
          mt="0.5"
        >
          {record.transformations.length} transformation
          {record.transformations.length !== 1 ? "s" : ""}
        </TextAny>
      </Box>

      {/* Creator */}
      <FlexAny flex="2" alignItems="center" gap="2" minW={0} overflow="hidden">
        <AvatarAny
          size="sm"
          name={record.createdBy.name || record.createdBy.email}
          flexShrink={0}
        />
        <Box minW={0}>
          <TextAny
            fontSize="sm"
            color={isCurrent ? "blue.800" : "editorBattleshipGrey.500"}
            isTruncated
            fontWeight="medium"
          >
            {record.createdBy.name || record.createdBy.email}
          </TextAny>
          <TextAny
            fontSize="sm"
            color={isCurrent ? "blue.500" : "editorBattleshipGrey.400"}
            isTruncated
          >
            {record.createdBy.email}
          </TextAny>
        </Box>
      </FlexAny>

      {/* Visibility */}
      <Box flex="1.5" minW={0}>
        <FlexAny alignItems="center" gap="2">
          <Icon
            as={record.isPrivate ? PiLock : PiGlobe}
            boxSize={5}
            color={isCurrent ? "blue.700" : "editorBattleshipGrey.500"}
          />
          <TextAny
            fontSize="sm"
            color={isCurrent ? "blue.800" : "editorBattleshipGrey.700"}
          >
            {record.isPrivate ? "Only to me" : "Shared with everyone"}
          </TextAny>
        </FlexAny>
      </Box>

      {/* Last updated */}
      <Box flex="1.5" minW={0}>
        <TextAny
          fontSize="sm"
          color={isCurrent ? "blue.700" : "editorBattleshipGrey.400"}
        >
          {formatRelativeTime(record.updatedAt)}
        </TextAny>
      </Box>

      {/* Row actions */}
      <Flex
        flexShrink={0}
        gap="1"
        alignItems="center"
        onClick={(e) => e.stopPropagation()}
      >
        {onBulkGenerate && (
          <TooltipAny label="Bulk Generate with CSV" placement="top">
            <ButtonAny
              as={Button}
              size="md"
              variant="ghost"
              px="2"
              py="1"
              minW="auto"
              bg="transparent"
              borderWidth={0}
              borderColor="transparent"
              _hover={{ bg: "editorGray.200" }}
              _focus={{ boxShadow: "none" }}
              onClick={() => onBulkGenerate(record)}
              aria-label="Bulk Generate with CSV"
            >
              <IconAny
                as={PiFileCsv}
                boxSize={5}
                color="editorBattleshipGrey.700"
              />
            </ButtonAny>
          </TooltipAny>
        )}
        <Popover
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          placement="bottom-end"
          closeOnBlur
        >
          <PopoverTrigger>
            <Box as="span" flexShrink={0} w="8">
              <TooltipAny label="Template Settings" placement="top">
                <ButtonAny
                  as={Button}
                  size="md"
                  variant="ghost"
                  px="2"
                  py="1"
                  minW="auto"
                  bg="transparent"
                  borderWidth={0}
                  borderColor="transparent"
                  _hover={{ bg: "editorGray.200" }}
                  _focus={{ boxShadow: "none" }}
                  onClick={(e: React.MouseEvent<HTMLElement>) => {
                    e.stopPropagation()
                    onSettings(record)
                  }}
                  aria-label="Template Settings"
                >
                  <IconAny
                    as={PiGear}
                    boxSize={5}
                    color="editorBattleshipGrey.700"
                  />
                </ButtonAny>
              </TooltipAny>
            </Box>
          </PopoverTrigger>
          {permissions.delete && (
            <PopoverContentAny
              p="4"
              fontSize="sm"
              maxW="md"
              w="md"
              borderWidth={0}
              borderColor="transparent"
              _focus={{ boxShadow: "lg", outline: "none" }}
              onClick={(e: React.MouseEvent<HTMLElement>) =>
                e.stopPropagation()
              }
            >
              <FlexAny direction="column" gap="3">
                <TextAny color="gray.600" fontSize="md">
                  Are you sure you want to delete this template? This action is
                  irreversible.
                </TextAny>
                <FlexAny justifyContent="flex-end" gap="2">
                  <ButtonAny
                    size="md"
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(false)}
                    color="editorBattleshipGrey.500"
                    _hover={{
                      color: "editorBattleshipGrey.800",
                      bg: "editorGray.50",
                    }}
                  >
                    Cancel
                  </ButtonAny>
                  <ButtonAny
                    size="md"
                    colorScheme="red"
                    leftIcon={<Icon as={PiTrash} boxSize={4} />}
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      onDelete(record)
                    }}
                  >
                    Delete
                  </ButtonAny>
                </FlexAny>
              </FlexAny>
            </PopoverContentAny>
          )}
        </Popover>
      </Flex>
    </FlexAny>
  )
}
