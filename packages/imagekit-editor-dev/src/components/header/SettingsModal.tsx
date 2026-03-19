import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { useEffect, useState } from "react"
import Select from "react-select"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useEditorStore } from "../../store"

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const provider = useTemplateStorage()
  const templateId = useEditorStore((s) => s.templateId)
  const templateName = useEditorStore((s) => s.templateName)
  const setTemplateName = useEditorStore((s) => s.setTemplateName)
  const transformations = useEditorStore((s) => s.transformations)
  const setSyncStatus = useEditorStore((s) => s.setSyncStatus)
  const resetToNewTemplate = useEditorStore((s) => s.resetToNewTemplate)

  const [localName, setLocalName] = useState(templateName)
  const [localVisibility, setLocalVisibility] = useState<"everyone" | "onlyMe">(
    "onlyMe",
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch current template visibility
  useEffect(() => {
    let cancelled = false

    if (!provider || !templateId) {
      return
    }

    provider
      .getTemplate(templateId)
      .then((record) => {
        if (cancelled || !record) return
        setLocalVisibility(record.isPrivate ? "onlyMe" : "everyone")
      })
      .catch(() => {
        // Ignore errors
      })

    return () => {
      cancelled = true
    }
  }, [provider, templateId])

  const handleSave = async () => {
    if (!provider || !localName.trim()) return

    setIsSaving(true)
    setSyncStatus("saving")

    try {
      await provider.saveTemplate({
        id: templateId ?? undefined,
        name: localName.trim(),
        transformations: transformations.map(({ id: _id, ...rest }) => rest),
        isPrivate: localVisibility === "onlyMe",
      })

      setTemplateName(localName.trim())
      setSyncStatus("saved")
      onClose()
    } catch (err) {
      setSyncStatus(
        "error",
        err instanceof Error ? err.message : "Failed to save",
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!provider || !templateId) return

    setIsDeleting(true)

    try {
      await provider.deleteTemplate(templateId)
      resetToNewTemplate()
      onClose()
    } catch (err) {
      console.error("Failed to delete template:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.400"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1400}
      onClick={onClose}
    >
      <Box
        w="40vw"
        maxW="40vw"
        h="50vh"
        maxH="50vh"
        bg="white"
        borderRadius="xl"
        overflow="hidden"
        boxShadow="xl"
        display="flex"
        flexDirection="column"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Flex
          px="6"
          py="4"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth="1px"
          borderColor="editorGray.300"
        >
          <Text fontSize="lg" fontWeight="semibold" color="editorGray.900">
            Template Settings
          </Text>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<Icon as={PiX} boxSize={5} />}
            aria-label="Close settings"
          />
        </Flex>

        {/* Content */}
        <Box px="6" py="6" flex="1" overflowY="auto">
          <Flex direction="column" gap="6">
            {/* Template Name */}
            <FormControl>
              <FormLabel
                fontSize="sm"
                fontWeight="medium"
                color="editorGray.700"
                mb="2"
              >
                Template Name
              </FormLabel>
              <Input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Enter template name"
                fontSize="sm"
              />
            </FormControl>

            {/* Visibility */}
            <FormControl>
              <FormLabel
                fontSize="sm"
                fontWeight="medium"
                color="editorGray.700"
                mb="2"
              >
                Visibility
              </FormLabel>
              <Select
                value={{
                  value: localVisibility,
                  label:
                    localVisibility === "everyone"
                      ? "Shared with everyone"
                      : "Only to me",
                }}
                onChange={(option) => {
                  if (option) {
                    setLocalVisibility(option.value as "everyone" | "onlyMe")
                  }
                }}
                options={[
                  { value: "onlyMe", label: "Only to me" },
                  { value: "everyone", label: "Shared with everyone" },
                ]}
                formatOptionLabel={(data) => (
                  <Box display="flex" alignItems="center" gap="2">
                    <Icon
                      as={data.value === "everyone" ? PiGlobe : PiLock}
                      boxSize={5}
                      color="editorBattleshipGrey.500"
                    />
                    <span>{data.label}</span>
                  </Box>
                )}
                styles={{
                  control: (base) => ({
                    ...base,
                    fontSize: "12px",
                    minHeight: "32px",
                    borderColor: "#E2E8F0",
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 10,
                  }),
                  option: (base) => ({
                    ...base,
                    fontSize: "12px",
                  }),
                }}
                isSearchable={false}
              />
            </FormControl>
          </Flex>
        </Box>

        {/* Footer */}
        <Flex
          px="6"
          py="4"
          alignItems="center"
          justifyContent="space-between"
          borderTopWidth="1px"
          borderColor="editorGray.300"
        >
          <Button
            variant="ghost"
            colorScheme="red"
            size="md"
            leftIcon={<Icon as={PiTrash} boxSize={5} />}
            onClick={handleDelete}
            isLoading={isDeleting}
            isDisabled={!templateId || isSaving}
          >
            Delete
          </Button>

          <Flex gap="3">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              isDisabled={isDeleting || isSaving}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
              isDisabled={!localName.trim() || isDeleting}
            >
              Save
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}
