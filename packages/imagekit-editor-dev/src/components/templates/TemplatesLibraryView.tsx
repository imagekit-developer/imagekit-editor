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
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Text,
} from "@chakra-ui/react"
import { BsThreeDots } from "@react-icons/all-files/bs/BsThreeDots"
import { PiArrowLeft } from "@react-icons/all-files/pi/PiArrowLeft"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiPushPin } from "@react-icons/all-files/pi/PiPushPin"
import { PiPushPinFill } from "@react-icons/all-files/pi/PiPushPinFill"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import humanDate from "human-date"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useDebounce } from "../../hooks/useDebounce"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"
import FilterChipsField from "../common/FilterChipsField"
import MultiSelectListField from "../common/MultiSelectListField"

interface Props {
  onClose(): void
}

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

  const { loadTemplate, setTemplateName, setTemplateId, resetToNewTemplate } =
    useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const isPristine = useEditorStore((s) => s.isPristine)
  const syncStatus = useEditorStore((s) => s.syncStatus)

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
    const base = templates
      .filter((t) => t.id !== templateId)
      .filter((t) =>
        search
          ? t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.createdBy.name.toLowerCase().includes(search.toLowerCase()) ||
            t.createdBy.email.toLowerCase().includes(search.toLowerCase())
          : true,
      )
      .filter((t) => {
        if (visibilityFilter.length === 0) return true
        if (visibilityFilter.includes("private")) return t.isPrivate
        if (visibilityFilter.includes("shared")) return !t.isPrivate
        return true
      })
      .filter((t) =>
        creatorFilter.length > 0
          ? creatorFilter.includes(t.createdBy.userId)
          : true,
      )

    // Sort so that pinned templates (for the local user) come first,
    // then all others by most recently used / updated.
    return [...base].sort((a, b) => {
      const aPinned = a.pinnedBy.includes("local") ? 1 : 0
      const bPinned = b.pinnedBy.includes("local") ? 1 : 0
      if (aPinned !== bPinned) {
        return bPinned - aPinned
      }

      const aTime = a.lastUsedAt ?? a.updatedAt
      const bTime = b.lastUsedAt ?? b.updatedAt
      return bTime - aTime
    })
  }, [templates, templateId, search, visibilityFilter, creatorFilter])

  const handleSelect = (record: TemplateRecord) => {
    if (isPristine || syncStatus === "saved") {
      loadTemplate(record.transformations)
      setTemplateName(record.name)
      setTemplateId(record.id)
      onClose()
    }
  }

  const handleTogglePin = async (record: TemplateRecord) => {
    if (!provider) return

    // For the local storage provider we only have a single logical user.
    const currentUserId = "local"
    const isPinned = record.pinnedBy.includes(currentUserId)
    const nextPinnedBy = isPinned
      ? record.pinnedBy.filter((id) => id !== currentUserId)
      : [...record.pinnedBy, currentUserId]

    try {
      setPinningId(record.id)
      const updated = await provider.saveTemplate({
        id: record.id,
        name: record.name,
        transformations: record.transformations,
        clientNumber: record.clientNumber,
        isPrivate: record.isPrivate,
        pinnedBy: nextPinnedBy,
        createdBy: record.createdBy,
        updatedBy: record.updatedBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })

      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      )
    } catch {
      // Silently ignore pin failures in this view
    } finally {
      setPinningId((current) => (current === record.id ? null : current))
    }
  }

  return (
    <Flex
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
          <Button
            onClick={onClose}
            variant="ghost"
            size="xs"
            alignSelf="flex-start"
            leftIcon={<Icon as={PiArrowLeft} boxSize={4} />}
            color="editorBattleshipGrey.500"
            _hover={{ color: "editorBattleshipGrey.700", bg: "transparent" }}
            px="0"
          >
            Go back
          </Button>

          <Flex alignItems="center" justifyContent="space-between">
            <Box>
              <Text
                fontSize="lg"
                fontWeight="semibold"
                color="editorBattleshipGrey.900"
              >
                All templates
              </Text>
              <Text fontSize="sm" color="editorBattleshipGrey.500">
                Browse and load templates created by you or shared with you.
              </Text>
            </Box>
            <Button
              size="md"
              colorScheme="blue"
              leftIcon={<Icon as={PiPlus} boxSize={4} />}
              px="4"
              onClick={() => {
                resetToNewTemplate()
                onClose()
              }}
            >
              New template
            </Button>
          </Flex>

          {/* Controls bar */}
          <Flex
            mt="2"
            gap="2"
            alignItems="center"
            justifyContent="flex-start"
            w="100%"
            flexWrap="wrap"
          >
            <InputGroup size="md" maxW="xs">
              <InputLeftElement pointerEvents="none" pl="2">
                <Icon as={PiMagnifyingGlass} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search templates..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
            </InputGroup>

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
                  <Flex align="center" gap="2">
                    <Text
                      fontSize="sm"
                      fontWeight="400"
                      noOfLines={1}
                      opacity={creatorFilter.length > 0 ? 1 : 0.5}
                    >
                      Created by
                    </Text>
                    {creatorFilter.length > 0 && (
                      <Badge colorScheme="blue" fontSize="xs">
                        {creatorFilter.length}
                      </Badge>
                    )}
                    <Icon as={PiCaretDown} boxSize="16px" />
                  </Flex>
                </Box>
              </PopoverTrigger>
              <PopoverContent
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
                <PopoverBody p="0" display="flex" flexDirection="column">
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
                  <Divider alignSelf="center" my="0" borderColor="gray.200" />
                  <Button
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
                  </Button>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        </Box>
      </Box>

      {/* Scrollable table area */}
      <Flex
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
        >
          {loading ? (
            <Flex justifyContent="center" alignItems="center" py="16">
              <Spinner size="md" color="editorBattleshipGrey.400" />
            </Flex>
          ) : (
            <>
              {/* Table header */}
              <Flex
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
                  <Text textAlign="left">Name</Text>
                </Box>
                <Box flex="2" minW={0}>
                  <Text textAlign="left">Created by</Text>
                </Box>
                <Box flex="1.5" minW={0}>
                  <Text textAlign="left">Visibility</Text>
                </Box>
                <Box flex="1.5" minW={0}>
                  <Text textAlign="left">Last updated</Text>
                </Box>
                <Box flexShrink={0} w="8" />
              </Flex>

              {/* Current row */}
              {shouldShowCurrent && activeTemplate && (
                <TemplateRow
                  record={activeTemplate}
                  onSelect={() => {
                    // Current row is informational; selecting it is a no-op.
                  }}
                  onTogglePin={handleTogglePin}
                  isPinning={pinningId === activeTemplate.id}
                  onDelete={() => {
                    // Deletion for current row is disabled via props.
                  }}
                  isCurrent
                  canDelete={false}
                />
              )}

              {/* Filtered templates */}
              {filtered.length === 0 ? (
                <Flex
                  justifyContent="center"
                  alignItems="center"
                  py="16"
                  flexDirection="column"
                  gap="2"
                >
                  <Text fontSize="sm" color="editorBattleshipGrey.500">
                    {search ||
                    visibilityFilter.length > 0 ||
                    creatorFilter.length > 0
                      ? "No templates match your filters"
                      : shouldShowCurrent
                        ? "No other saved templates"
                        : "No saved templates yet"}
                  </Text>
                </Flex>
              ) : (
                filtered.map((record) => (
                  <TemplateRow
                    key={record.id}
                    record={record}
                    onSelect={handleSelect}
                    onTogglePin={handleTogglePin}
                    isPinning={pinningId === record.id}
                    onDelete={async (r) => {
                      if (!provider) return
                      if (!provider.deleteTemplate) return
                      await provider.deleteTemplate(r.id)
                      setTemplates((prev) => prev.filter((t) => t.id !== r.id))
                    }}
                  />
                ))
              )}
            </>
          )}
        </Box>
      </Flex>
    </Flex>
  )
}

interface TemplateRowProps {
  record: TemplateRecord
  onSelect(record: TemplateRecord): void
  onTogglePin(record: TemplateRecord): void
  onDelete(record: TemplateRecord): void
  isPinning: boolean
  isCurrent?: boolean
  canDelete?: boolean
}

function TemplateRow({
  record,
  onSelect,
  onTogglePin,
  onDelete,
  isPinning,
  isCurrent = false,
  canDelete = true,
}: TemplateRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  return (
    <Flex
      px="5"
      py="4"
      alignItems="center"
      cursor={isCurrent ? "default" : "pointer"}
      borderBottomWidth="1px"
      borderColor="editorGray.200"
      bg={isCurrent ? "blue.50" : "transparent"}
      _hover={isCurrent ? undefined : { bg: "editorGray.50" }}
      onClick={() => {
        if (!isCurrent) onSelect(record)
      }}
    >
      {/* Pin */}
      <Box flexShrink={0} w="8">
        <Box
          as="button"
          type="button"
          disabled={isPinning}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(record)
          }}
        >
          {isPinning ? (
            <Spinner size="sm" color="editorBattleshipGrey.500" />
          ) : (
            <Icon
              as={record.pinnedBy.includes("local") ? PiPushPinFill : PiPushPin}
              boxSize={5}
              color={
                record.pinnedBy.includes("local")
                  ? "editorBlue.500"
                  : "editorBattleshipGrey.400"
              }
            />
          )}
        </Box>
      </Box>

      {/* Name + transform count */}
      <Box flex="3" minW={0} ml="2">
        <Flex alignItems="center" gap="2" mb="1">
          <Text
            fontSize="sm"
            fontWeight="medium"
            color={isCurrent ? "blue.800" : "editorBattleshipGrey.700"}
            isTruncated
          >
            {record.name}
          </Text>
          {isCurrent && (
            <Badge colorScheme="blue" fontSize="xs" flexShrink={0}>
              Current
            </Badge>
          )}
        </Flex>
        <Text
          fontSize="xs"
          color={isCurrent ? "blue.500" : "editorBattleshipGrey.500"}
          mt="0.5"
        >
          {record.transformations.length} transformation
          {record.transformations.length !== 1 ? "s" : ""}
        </Text>
      </Box>

      {/* Creator */}
      <Flex flex="2" alignItems="center" gap="2" minW={0} overflow="hidden">
        <Avatar
          size="sm"
          name={record.createdBy.name || record.createdBy.email}
          flexShrink={0}
        />
        <Box minW={0}>
          <Text
            fontSize="sm"
            color={isCurrent ? "blue.800" : "editorBattleshipGrey.500"}
            isTruncated
            fontWeight="medium"
          >
            {record.createdBy.name || record.createdBy.email}
          </Text>
          <Text
            fontSize="sm"
            color={isCurrent ? "blue.500" : "editorBattleshipGrey.400"}
            isTruncated
          >
            {record.createdBy.email}
          </Text>
        </Box>
      </Flex>

      {/* Visibility */}
      <Box flex="1.5" minW={0}>
        <Flex alignItems="center" gap="2">
          <Icon
            as={record.isPrivate ? PiLock : PiGlobe}
            boxSize={5}
            color={isCurrent ? "blue.700" : "editorBattleshipGrey.500"}
          />
          <Text
            fontSize="sm"
            color={isCurrent ? "blue.800" : "editorBattleshipGrey.700"}
          >
            {record.isPrivate ? "Only to me" : "Shared with everyone"}
          </Text>
        </Flex>
      </Box>

      {/* Last updated */}
      <Box flex="1.5" minW={0}>
        <Text
          fontSize="sm"
          color={isCurrent ? "blue.700" : "editorBattleshipGrey.400"}
        >
          {formatRelativeTime(record.updatedAt)}
        </Text>
      </Box>

      {/* Row actions menu + delete confirmation popup */}
      <Popover
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        placement="bottom-end"
        closeOnBlur
      >
        <PopoverTrigger>
          <Box
            as="span"
            flexShrink={0}
            w="8"
            onClick={(e) => e.stopPropagation()}
          >
            <Menu isLazy>
              <MenuButton
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
                onClick={(e) => e.stopPropagation()}
              >
                <Icon
                  as={BsThreeDots}
                  boxSize={4}
                  color="editorBattleshipGrey.700"
                />
              </MenuButton>
              <MenuList
                minW="32"
                py="1"
                borderWidth={0}
                borderColor="transparent"
                onClick={(e) => e.stopPropagation()}
              >
                <MenuItem
                  icon={<Icon as={PiTrash} boxSize={4} />}
                  color={canDelete ? "red.500" : "gray.400"}
                  display="flex"
                  alignItems="center"
                  _hover={{ bg: canDelete ? "red.50" : "transparent" }}
                  isDisabled={!canDelete}
                  onClick={(e) => {
                    if (!canDelete) return
                    e.stopPropagation()
                    setShowDeleteConfirm(true)
                  }}
                >
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        </PopoverTrigger>
        <PopoverContent
          p="4"
          fontSize="sm"
          maxW="md"
          w="md"
          borderWidth={0}
          borderColor="transparent"
          _focus={{ boxShadow: "lg", outline: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Flex direction="column" gap="3">
            <Text color="gray.600" fontSize="md">
              Are you sure you want to delete this template? This action is
              irreversible.
            </Text>
            <Flex justifyContent="flex-end" gap="2">
              <Button
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
              </Button>
              <Button
                size="md"
                colorScheme="red"
                leftIcon={<Icon as={PiTrash} boxSize={4} />}
                onClick={() => {
                  setShowDeleteConfirm(false)
                  onDelete(record)
                }}
              >
                Delete
              </Button>
            </Flex>
          </Flex>
        </PopoverContent>
      </Popover>
    </Flex>
  )
}
