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
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
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
  return humanDate.relativeTime(new Date(ts))
}

export function TemplatesLibraryView({ onClose }: Props) {
  const provider = useTemplateStorage()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const search = useDebounce(searchInput, 200)
  const [visibilityFilter, setVisibilityFilter] = useState<string[]>([])
  const [creatorFilter, setCreatorFilter] = useState<string[]>([])

  const { loadTemplate, setTemplateName, setTemplateId } = useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const templateName = useEditorStore((s) => s.templateName)
  const transformations = useEditorStore((s) => s.transformations)
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

  const currentTransformCount = activeTemplate
    ? activeTemplate.transformations.length
    : transformations.length

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
    return templates
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
      })

      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      )
    } catch {
      // Silently ignore pin failures in this view
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
          <Box>
            <Text
              fontSize="lg"
              fontWeight="semibold"
              color="editorBattleshipGrey.900"
            >
              All templates
            </Text>
            <Text fontSize="sm" color="editorBattleshipGrey.500">
              Browse and load templates shared with you or created by your team.
            </Text>
          </Box>

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
                <Box flex="3" minW={0}>
                  <Text>Name</Text>
                </Box>
                <Box flex="2" minW={0}>
                  <Text>Created by</Text>
                </Box>
                <Box flex="1.5" minW={0}>
                  <Text>Visibility</Text>
                </Box>
                <Box flex="1.5" minW={0}>
                  <Text>Last updated</Text>
                </Box>
                <Box flexShrink={0} w="8" />
              </Flex>

              {/* Current row */}
              {shouldShowCurrent && (
                <Flex
                  px="5"
                  py="4"
                  alignItems="center"
                  bg="blue.50"
                  borderBottomWidth="1px"
                  borderColor="editorGray.200"
                  pointerEvents="none"
                  gap="4"
                >
                  <Box flex="1" minW={0}>
                    <Flex alignItems="center" gap="2" mb="1">
                      <Text
                        fontSize="md"
                        fontWeight="medium"
                        isTruncated
                        color="blue.800"
                      >
                        {templateName}
                      </Text>
                      <Badge colorScheme="blue" fontSize="xs" flexShrink={0}>
                        Current
                      </Badge>
                    </Flex>
                    <Text fontSize="sm" color="blue.500">
                      {currentTransformCount} transformation
                      {currentTransformCount !== 1 ? "s" : ""}
                    </Text>
                  </Box>
                </Flex>
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
}

function TemplateRow({
  record,
  onSelect,
  onTogglePin,
  onDelete,
}: TemplateRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  return (
    <Flex
      px="5"
      py="4"
      alignItems="center"
      cursor="pointer"
      borderBottomWidth="1px"
      borderColor="editorGray.200"
      _hover={{ bg: "editorGray.50" }}
      onClick={() => onSelect(record)}
    >
      {/* Pin */}
      <Box flexShrink={0} w="8">
        <Box
          as="button"
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin(record)
          }}
        >
          <Icon
            as={record.pinnedBy.includes("local") ? PiPushPinFill : PiPushPin}
            boxSize={4}
            color={
              record.pinnedBy.includes("local")
                ? "editorBlue.500"
                : "editorBattleshipGrey.400"
            }
          />
        </Box>
      </Box>

      {/* Name + transform count */}
      <Box flex="3" minW={0} ml="2">
        <Text
          fontSize="sm"
          fontWeight="medium"
          color="editorBattleshipGrey.700"
          isTruncated
        >
          {record.name}
        </Text>
        <Text fontSize="xs" color="editorBattleshipGrey.500" mt="0.5">
          {record.transformations.length} transformation
          {record.transformations.length !== 1 ? "s" : ""}
        </Text>
      </Box>

      {/* Creator */}
      <Flex flex="2" alignItems="center" gap="2" minW={0} overflow="hidden">
        <Avatar
          size="xs"
          name={record.createdBy.name || record.createdBy.email}
          flexShrink={0}
        />
        <Box minW={0}>
          <Text
            fontSize="xs"
            color="editorBattleshipGrey.700"
            isTruncated
            fontWeight="medium"
          >
            {record.createdBy.name || record.createdBy.email}
          </Text>
          <Text fontSize="xs" color="editorBattleshipGrey.400" isTruncated>
            {record.createdBy.email}
          </Text>
        </Box>
      </Flex>

      {/* Visibility */}
      <Box flex="1.5" minW={0}>
        <Flex alignItems="center" gap="2">
          <Icon
            as={record.isPrivate ? PiLock : PiGlobe}
            boxSize={4}
            color="editorBattleshipGrey.500"
          />
          <Text fontSize="xs" color="editorBattleshipGrey.700">
            {record.isPrivate ? "Only to me" : "Shared with everyone"}
          </Text>
        </Flex>
      </Box>

      {/* Last updated */}
      <Box flex="1.5" minW={0}>
        <Text fontSize="xs" color="editorBattleshipGrey.400">
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
                  color="red.500"
                  display="flex"
                  alignItems="center"
                  _hover={{ bg: "red.50" }}
                  onClick={(e) => {
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
