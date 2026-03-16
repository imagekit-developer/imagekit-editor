import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
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
  Text,
  useDisclosure,
} from "@chakra-ui/react"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"

const MAX_VISIBLE = 8

export function TemplatesDropdown() {
  const provider = useTemplateStorage()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [search, setSearch] = useState("")
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

  if (!provider) return null

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

  const filtered = templates
    .filter((t) => t.id !== templateId)
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, MAX_VISIBLE)

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

  const handleSaveAndContinue = async () => {
    if (!provider || !pendingTemplate) return
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
    } catch (err) {
      setSyncStatus(
        "error",
        err instanceof Error ? err.message : "Failed to save",
      )
    }
    doLoadTemplate(pendingTemplate)
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
            display="inline-flex"
            alignItems="center"
            cursor="pointer"
            borderRadius="md"
            p="1"
            _hover={{ bg: "editorGray.200" }}
            aria-label="Open templates dropdown"
          >
            <Icon
              as={PiCaretDown}
              boxSize={4}
              color="editorBattleshipGrey.600"
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent
          width="sm"
          shadow="lg"
          p="0"
          overflow="hidden"
          _focus={{ boxShadow: "lg" }}
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
              <InputGroup size="md" flex="1">
                <InputLeftElement pointerEvents="none">
                  <Icon
                    as={PiMagnifyingGlass}
                    color="editorBattleshipGrey.500"
                    boxSize={4}
                  />
                </InputLeftElement>
                <Input
                  ref={searchRef}
                  placeholder="Search templates"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  variant="filled"
                  bg="editorGray.200"
                  _focus={{ bg: "editorGray.200" }}
                  borderRadius="md"
                  fontSize="sm"
                />
              </InputGroup>
              <Button
                size="sm"
                leftIcon={<Icon as={PiPlus} boxSize={4} />}
                onClick={handleNewTemplate}
                variant="ghost"
                colorScheme="blue"
                flexShrink={0}
                fontWeight="normal"
              >
                New
              </Button>
            </Flex>

            <Box maxH="72" overflowY="auto">
              {shouldShowCurrent && (
                <Flex
                  px="4"
                  py="3"
                  alignItems="center"
                  bg="blue.50"
                  borderBottomWidth="1px"
                  borderColor="blue.100"
                  pointerEvents="none"
                >
                  <Box flex="1" minW="0">
                    <Flex alignItems="center" gap="2" mb="0.5">
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
                  <Flex
                    key={record.id}
                    px="4"
                    py="3"
                    cursor="pointer"
                    alignItems="center"
                    _hover={{ bg: "editorGray.200" }}
                    onClick={() => handleSelect(record)}
                  >
                    <Box flex="1" minW="0">
                      <Text fontSize="md" fontWeight="medium" isTruncated>
                        {record.name}
                      </Text>
                      <Text fontSize="sm" color="editorBattleshipGrey.500">
                        {record.transformations.length} transformation
                        {record.transformations.length !== 1 ? "s" : ""}
                      </Text>
                    </Box>
                  </Flex>
                ))
              )}
            </Box>

            {templates.length > MAX_VISIBLE + (shouldShowCurrent ? 1 : 0) && (
              <>
                <Divider borderColor="editorGray.300" />
                <Flex px="4" py="3" justifyContent="center">
                  <Text
                    fontSize="sm"
                    color="editorBlue.500"
                    cursor="pointer"
                    _hover={{ textDecoration: "underline" }}
                  >
                    View all templates
                  </Text>
                </Flex>
              </>
            )}
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
