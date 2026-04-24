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
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Select, { type StylesConfig } from "react-select"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import { applyTemplateStorageAccessFailure } from "../../storage/templateAccessError"
import { useEditorStore } from "../../store"

const FlexAny = Flex as unknown as React.FC<Record<string, unknown>>

function visibilityFromKnownPrivate(
  isPrivate: boolean | null,
): "everyone" | "onlyMe" {
  if (isPrivate === false) {
    return "everyone"
  }
  return "onlyMe"
}

interface SettingsModalProps {
  onClose: () => void
  /** From header refetch of template visibility; seeds the dropdown before async getTemplate completes. */
  knownIsPrivate: boolean | null
}

export function SettingsModal({ onClose, knownIsPrivate }: SettingsModalProps) {
  const provider = useTemplateStorage()
  const templateId = useEditorStore((s) => s.templateId)
  const templateName = useEditorStore((s) => s.templateName)
  const setTemplateIsPrivate = useEditorStore((s) => s.setTemplateIsPrivate)
  const resetToNewTemplate = useEditorStore((s) => s.resetToNewTemplate)
  const denyTemplateStorageAccess = useEditorStore(
    (s) => s.denyTemplateStorageAccess,
  )
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )
  const { saveNow } = useTemplateSync()

  // Stable ref so the getTemplate effect doesn't re-run when onClose identity changes.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const [localName, setLocalName] = useState(templateName)
  const [localVisibility, setLocalVisibility] = useState<"everyone" | "onlyMe">(
    () => visibilityFromKnownPrivate(knownIsPrivate),
  )
  const [canChangeVisibility, setCanChangeVisibility] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalName(templateName)
  }, [templateName])

  useEffect(() => {
    setLocalVisibility(visibilityFromKnownPrivate(knownIsPrivate))
  }, [knownIsPrivate])

  // Authoritative visibility from API (may arrive after header snapshot).
  // onClose is intentionally read via ref so its identity change never re-triggers this effect.
  useEffect(() => {
    let cancelled = false

    if (!provider || !templateId) {
      setCanChangeVisibility(true)
      return
    }

    provider
      .getTemplate(templateId)
      .then((record) => {
        if (cancelled) return
        if (!record) {
          setCanChangeVisibility(true)
          return
        }
        setLocalVisibility(record.isPrivate ? "onlyMe" : "everyone")
        const session = provider.getCurrentUserSession() as {
          id?: string
        } | null
        setCanChangeVisibility(record.createdBy.userId === session?.id)
      })
      .catch((err) => {
        if (
          applyTemplateStorageAccessFailure(err, {
            denyTemplateStorageAccess,
          })
        ) {
          onCloseRef.current()
        }
      })

    return () => {
      cancelled = true
    }
    // denyTemplateStorageAccess is a stable Zustand action — safe to include.
    // onClose is intentionally excluded; we use onCloseRef instead.
  }, [provider, templateId, denyTemplateStorageAccess])

  const saveTemplate = async (opts?: { closeAfter?: boolean }) => {
    if (!provider || !localName.trim() || templateStorageWriteBlocked) return

    try {
      setIsSaving(true)
      const saved = await saveNow({
        reason: "settings",
        overrides: {
          name: localName.trim(),
          isPrivate: localVisibility === "onlyMe",
        },
      })
      if (!saved) return
      useEditorStore.getState().hydrateTemplateMetadata({
        templateId: saved.id,
        templateName: localName.trim(),
        templateIsPrivate: saved.isPrivate,
      })
      if (opts?.closeAfter !== false) {
        onClose()
      }
    } catch (err) {
      if (
        applyTemplateStorageAccessFailure(err, {
          denyTemplateStorageAccess,
        })
      ) {
        if (opts?.closeAfter !== false) {
          onClose()
        }
        return
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!provider || !templateId) return
    if (!provider.deleteTemplate) return

    setIsDeleting(true)

    try {
      await provider.deleteTemplate(templateId)
      resetToNewTemplate()
      onClose()
    } catch (err) {
      if (
        applyTemplateStorageAccessFailure(err, {
          denyTemplateStorageAccess,
        })
      ) {
        onClose()
        return
      }
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

  const selectStyles = useMemo<
    StylesConfig<{ value: string; label: string }, false>
  >(
    () => ({
      control: (base) => ({
        ...base,
        fontSize: "12px",
        minHeight: "32px",
        borderColor: "#E2E8F0",
        backgroundColor: canChangeVisibility ? base.backgroundColor : "#F7FAFC",
        opacity: canChangeVisibility ? 1 : 0.6,
      }),
      menu: (base) => ({
        ...base,
        zIndex: 10,
      }),
      option: (base) => ({
        ...base,
        fontSize: "12px",
      }),
    }),
    [canChangeVisibility],
  )

  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.400"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1500}
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
        <FlexAny
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
        </FlexAny>

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
                key={`${templateId ?? "new"}-${localVisibility}`}
                value={{
                  value: localVisibility,
                  label:
                    localVisibility === "everyone"
                      ? "Shared with everyone"
                      : "Only to me",
                }}
                onChange={(option) => {
                  if (!canChangeVisibility) return
                  if (option) {
                    setLocalVisibility(option.value as "everyone" | "onlyMe")
                    setTemplateIsPrivate(option.value === "onlyMe")
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
                styles={selectStyles}
                isSearchable={false}
                isDisabled={!canChangeVisibility}
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
              onClick={() => saveTemplate({ closeAfter: true })}
              isLoading={isSaving}
              isDisabled={
                !localName.trim() || isDeleting || templateStorageWriteBlocked
              }
            >
              Save
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}
