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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import { applyTemplateStorageAccessFailure } from "../../storage/templateAccessError"
import { useEditorStore } from "../../store"
import { truncateTemplateName } from "../../utils"

const MAX_VISIBLE = 5

interface TemplatesDropdownProps {
  onViewAllTemplates?: () => void
}

export function TemplatesDropdown({
  onViewAllTemplates,
}: TemplatesDropdownProps) {
  const provider = useTemplateStorage()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [search, setSearch] = useState("")
  const [pinningId, setPinningId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const [pendingTemplate, setPendingTemplate] = useState<TemplateRecord | null>(
    null,
  )

  const { loadTemplate, setTemplateName, setTemplateId, resetToNewTemplate } =
    useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const templateName = useEditorStore((s) => s.templateName)
  const transformations = useEditorStore((s) => s.transformations)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const isPristine = useEditorStore((s) => s.isPristine)
  const setSyncStatus = useEditorStore((s) => s.setSyncStatus)
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

  if (!provider) return null

  const doLoadTemplate = (record: TemplateRecord) => {
    loadTemplate(record.transformations)
    setTemplateName(record.name)
    setTemplateId(record.id)
    onClose()
    setPendingTemplate(null)
  }

  const handleSelect = (record: TemplateRecord) => {
    if (isPristine || syncStatus === "saved") {
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
    const state = useEditorStore.getState()
    setSyncStatus("saving")
    try {
      await provider.saveTemplate({
        id: state.templateId ?? undefined,
        name: state.templateName,
        transformations: state.transformations.map(
          ({ id: _id, ...rest }) => rest,
        ),
      })
      setSyncStatus("saved")
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
          <Box
            as="button"
            display="inline-flex"
            alignItems="center"
            gap="2"
            cursor="pointer"
            borderRadius="md"
            paddingX="4"
            paddingY="2"
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
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="editorBattleshipGrey.700"
            >
              Templates
            </Text>
            <Icon
              as={PiCaretDown}
              boxSize={4}
              color="editorBattleshipGrey.600"
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent
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
          <PopoverBody p="0">
            <Flex
              px="4"
              py="3"
              gap="3"
              alignItems="center"
              borderBottomWidth="1px"
              borderColor="editorGray.300"
            >
              <InputGroup size="md" flex="1" maxW="xs">
                <InputLeftElement pointerEvents="none" pl="2">
                  <Icon as={PiMagnifyingGlass} color="gray.400" />
                </InputLeftElement>
                <Input
                  ref={searchRef}
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Icon as={PiPlus} boxSize={4} />}
                px="4"
                flexShrink={0}
                fontWeight="normal"
                onClick={handleNewTemplate}
              >
                New
              </Button>
            </Flex>

            <Box maxH="72" overflowY="auto">
              {shouldShowCurrent && (
                <Flex
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
                  <Icon
                    as={activeTemplate?.isPrivate === false ? PiGlobe : PiLock}
                    boxSize={4}
                    color="blue.700"
                    flexShrink={0}
                  />

                  {/* Name + badge */}
                  <Box flex="1" minW={0}>
                    <Flex alignItems="center" gap="2">
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        isTruncated
                        color="blue.800"
                        title={templateName}
                      >
                        {truncateTemplateName(templateName)}
                      </Text>
                      <Badge colorScheme="blue" fontSize="xs" flexShrink={0}>
                        Current
                      </Badge>
                    </Flex>
                  </Box>

                  {/* Transform count on the right */}
                  <Text fontSize="xs" color="blue.600" flexShrink={0}>
                    {currentTransformCount} transformation
                    {currentTransformCount !== 1 ? "s" : ""}
                  </Text>
                </Flex>
              )}

              {filtered.length === 0 && !shouldShowCurrent ? (
                <Flex px="4" py="8" justifyContent="center" alignItems="center">
                  <Text fontSize="sm" color="editorBattleshipGrey.500">
                    {search ? "No templates found" : "No saved templates yet"}
                  </Text>
                </Flex>
              ) : filtered.length === 0 && shouldShowCurrent ? (
                <Flex px="4" py="6" justifyContent="center" alignItems="center">
                  <Text fontSize="sm" color="editorBattleshipGrey.500">
                    {search
                      ? "No other templates found"
                      : "No other saved templates"}
                  </Text>
                </Flex>
              ) : (
                filtered.map((record) => (
                  // biome-ignore lint/a11y/useSemanticElements: Not necessary for this component
                  <Flex
                    key={record.id}
                    px="4"
                    py="2"
                    cursor="pointer"
                    alignItems="center"
                    gap="3"
                    role="group"
                    _hover={{ bg: "editorGray.100" }}
                    onClick={() => handleSelect(record)}
                    transition="background-color 0.15s"
                  >
                    {/* Visibility Icon */}
                    <Icon
                      as={record.isPrivate ? PiLock : PiGlobe}
                      boxSize={4}
                      color="editorBattleshipGrey.500"
                      flexShrink={0}
                    />

                    {/* Template name */}
                    <Text
                      flex="1"
                      minW={0}
                      fontSize="sm"
                      fontWeight="medium"
                      isTruncated
                      color="editorBattleshipGrey.800"
                      title={record.name}
                    >
                      {truncateTemplateName(record.name)}
                    </Text>

                    {/* Creator on hover + pin (always visible for pinned, hover for others) */}
                    <Flex alignItems="center" gap="3">
                      {/* Creator: only on hover */}
                      <Flex
                        alignItems="center"
                        gap="1.5"
                        maxW="36"
                        opacity={0}
                        _groupHover={{ opacity: 1 }}
                        transition="opacity 0.12s ease-in-out"
                      >
                        <Avatar
                          name={record.createdBy.name || record.createdBy.email}
                          size="xs"
                          fontSize="xs"
                          fontWeight="bold"
                          flexShrink={0}
                        />
                        <Text
                          fontSize="xs"
                          color="editorBattleshipGrey.500"
                          isTruncated
                        >
                          {record.createdBy.name || record.createdBy.email}
                        </Text>
                      </Flex>

                      {/* Pin */}
                      <Box
                        as="button"
                        type="button"
                        opacity={record.isPinned ? 1 : 0}
                        _groupHover={{ opacity: 1 }}
                        transition="opacity 0.12s ease-in-out"
                        disabled={pinningId === record.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTogglePin(record)
                        }}
                      >
                        {pinningId === record.id ? (
                          <Spinner size="xs" color="editorBattleshipGrey.500" />
                        ) : (
                          <Icon
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
                    </Flex>
                  </Flex>
                ))
              )}
            </Box>

            {/* Always show "View all templates" when callback is provided, or when there are more templates than visible */}
            {onViewAllTemplates ? (
              <>
                <Divider borderColor="editorGray.300" />
                <Flex px="4" py="3" justifyContent="flex-start">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Icon as={PiSquaresFourLight} boxSize={4} />}
                    color="editorGray.700"
                    fontWeight="normal"
                    onClick={() => {
                      onClose()
                      // Defer to next tick to allow popover to close cleanly
                      setTimeout(() => onViewAllTemplates?.(), 0)
                    }}
                  >
                    View all templates
                  </Button>
                </Flex>
              </>
            ) : templates.length > MAX_VISIBLE + (shouldShowCurrent ? 1 : 0) ? (
              <>
                <Divider borderColor="editorGray.300" />
                <Flex px="4" py="3" justifyContent="center">
                  <Text fontSize="sm" color="editorBattleshipGrey.500">
                    {templates.length} templates total
                  </Text>
                </Flex>
              </>
            ) : null}
          </PopoverBody>
        </PopoverContent>
      </Popover>

      <AlertDialog
        isOpen={pendingTemplate !== null}
        leastDestructiveRef={cancelRef}
        onClose={() => setPendingTemplate(null)}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="md" fontWeight="semibold">
              Unsaved changes
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              Your current changes haven't been saved yet. What would you like
              to do before switching to{" "}
              <Box as="span" fontWeight="semibold">
                {pendingTemplate?.name}
              </Box>
              ?
            </AlertDialogBody>
            <AlertDialogFooter gap="2">
              <Button
                ref={cancelRef}
                size="sm"
                variant="ghost"
                onClick={() => setPendingTemplate(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleContinueWithoutSaving}
              >
                Continue without saving
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleSaveAndContinue}
              >
                Save and continue
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  )
}
