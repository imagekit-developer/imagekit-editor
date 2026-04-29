import { Box, Flex, Icon, IconButton, Input, Text } from "@chakra-ui/react"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { PiX } from "@react-icons/all-files/pi/PiX"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Select, { type StylesConfig } from "react-select"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { applyTemplateStorageAccessFailure } from "../../storage/templateAccessError"
import type { TemplateRecord } from "../../storage/types"
import { useEditorStore } from "../../store"
import { formatTemplateNameForUI } from "../../utils"

// ---------------------------------------------------------------------------
// Type casts — Chakra's strict generic signatures conflict with our JSX usage
// ---------------------------------------------------------------------------
const FlexAny = Flex as unknown as React.ElementType
const TextAny = Text as unknown as React.ElementType
const IconButtonAny = IconButton as unknown as React.ElementType
const InputAny = Input as unknown as React.ElementType

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SettingsModalProps {
  /** The template whose settings are being edited. All operations act on this record. */
  data: TemplateRecord
  onClose(): void
  /** Called with the updated record after a successful save. */
  onSaved?(updated: TemplateRecord): void
  /** Called after the template is successfully deleted. */
  onDeleted?(): void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Visibility = "everyone" | "onlyMe"

function visibilityFromRecord(record: TemplateRecord): Visibility {
  return record.isPrivate ? "onlyMe" : "everyone"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsModal({
  data,
  onClose,
  onSaved,
  onDeleted,
}: SettingsModalProps) {
  const provider = useTemplateStorage()
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )
  const denyTemplateStorageAccess = useEditorStore(
    (s) => s.denyTemplateStorageAccess,
  )

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const [localName, setLocalName] = useState(() =>
    formatTemplateNameForUI(data.name),
  )
  const [localVisibility, setLocalVisibility] = useState<Visibility>(() =>
    visibilityFromRecord(data),
  )
  // Whether the current user is allowed to change visibility (only the creator can).
  const [canChangeVisibility, setCanChangeVisibility] = useState(true)

  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch authoritative visibility + creator check from the API.
  useEffect(() => {
    let cancelled = false

    if (!provider) {
      setCanChangeVisibility(true)
      return
    }

    provider
      .getTemplate(data.id)
      .then((record) => {
        if (cancelled) return
        if (!record) {
          setCanChangeVisibility(true)
          return
        }
        setLocalVisibility(visibilityFromRecord(record))
        const session = provider.getCurrentUserSession() as {
          id?: string
        } | null
        setCanChangeVisibility(record.createdBy.userId === session?.id)
      })
      .catch((err) => {
        if (cancelled) return
        if (
          applyTemplateStorageAccessFailure(err, { denyTemplateStorageAccess })
        ) {
          onCloseRef.current()
        }
      })

    return () => {
      cancelled = true
    }
  }, [provider, data.id, denyTemplateStorageAccess])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // -------------------------------------------------------------------------
  // Save: patches only name + visibility; preserves all other fields
  // -------------------------------------------------------------------------
  const handleSave = async () => {
    if (!provider || !localName.trim() || templateStorageWriteBlocked) return

    setIsSaving(true)
    try {
      const updated = await provider.saveTemplate({
        ...data,
        name: localName.trim(),
        isPrivate: localVisibility === "onlyMe",
        // transformations are preserved from the original data record
        transformations: data.transformations,
      })
      onSaved?.(updated)
      onClose()
    } catch (err) {
      if (
        applyTemplateStorageAccessFailure(err, { denyTemplateStorageAccess })
      ) {
        onClose()
      }
    } finally {
      setIsSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------
  const handleDelete = async () => {
    if (!provider || !provider.deleteTemplate) return

    setIsDeleting(true)
    try {
      await provider.deleteTemplate(data.id)
      onDeleted?.()
      onClose()
    } catch (err) {
      if (
        applyTemplateStorageAccessFailure(err, { denyTemplateStorageAccess })
      ) {
        onClose()
        return
      }
      console.error("Failed to delete template:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  // -------------------------------------------------------------------------
  // react-select styles
  // -------------------------------------------------------------------------
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
      menu: (base) => ({ ...base, zIndex: 10 }),
      option: (base) => ({ ...base, fontSize: "12px" }),
    }),
    [canChangeVisibility],
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
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
          <TextAny fontSize="lg" fontWeight="semibold" color="editorGray.900">
            Template Settings
          </TextAny>
          <IconButtonAny
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<Icon as={PiX} boxSize={5} />}
            aria-label="Close settings"
          />
        </FlexAny>

        {/* Content */}
        <Box px="6" py="6" flex="1" overflowY="auto">
          <FlexAny direction="column" gap="6">
            {/* Template Name */}
            <Box>
              <TextAny
                fontSize="sm"
                fontWeight="medium"
                color="editorGray.700"
                mb="2"
              >
                Template Name
              </TextAny>
              <InputAny
                value={localName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLocalName(e.target.value)
                }
                placeholder="Enter template name"
                fontSize="sm"
              />
            </Box>

            {/* Visibility */}
            <Box>
              <TextAny
                fontSize="sm"
                fontWeight="medium"
                color="editorGray.700"
                mb="2"
              >
                Visibility
              </TextAny>
              <Select
                key={`${data.id}-${localVisibility}`}
                value={{
                  value: localVisibility,
                  label:
                    localVisibility === "everyone"
                      ? "Shared with everyone"
                      : "Only to me",
                }}
                onChange={(option) => {
                  if (!canChangeVisibility || !option) return
                  setLocalVisibility(option.value as Visibility)
                }}
                options={[
                  { value: "onlyMe", label: "Only to me" },
                  { value: "everyone", label: "Shared with everyone" },
                ]}
                formatOptionLabel={(opt) => (
                  <Box display="flex" alignItems="center" gap="2">
                    <Icon
                      as={opt.value === "everyone" ? PiGlobe : PiLock}
                      boxSize={5}
                      color="editorBattleshipGrey.500"
                    />
                    <span>{opt.label}</span>
                  </Box>
                )}
                styles={selectStyles}
                isSearchable={false}
                isDisabled={!canChangeVisibility}
              />
            </Box>
          </FlexAny>
        </Box>

        {/* Footer */}
        <FlexAny
          px="6"
          py="4"
          alignItems="center"
          justifyContent="space-between"
          borderTopWidth="1px"
          borderColor="editorGray.300"
        >
          {/* Delete button — only shown when deleteTemplate is supported */}
          {provider?.deleteTemplate ? (
            <FlexAny>
              <Box
                as="button"
                display="inline-flex"
                alignItems="center"
                gap="2"
                color={isDeleting || isSaving ? "gray.400" : "red.500"}
                cursor={isDeleting || isSaving ? "not-allowed" : "pointer"}
                fontSize="sm"
                fontWeight="medium"
                onClick={isDeleting || isSaving ? undefined : handleDelete}
                aria-disabled={isDeleting || isSaving}
              >
                <Icon as={PiTrash} boxSize={5} />
                {isDeleting ? "Deleting…" : "Delete"}
              </Box>
            </FlexAny>
          ) : (
            <Box />
          )}

          <FlexAny gap="3">
            <Box
              as="button"
              display="inline-flex"
              alignItems="center"
              px="4"
              py="2"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
              fontSize="sm"
              fontWeight="medium"
              color={isDeleting || isSaving ? "gray.400" : "editorGray.700"}
              cursor={isDeleting || isSaving ? "not-allowed" : "pointer"}
              onClick={isDeleting || isSaving ? undefined : onClose}
              aria-disabled={isDeleting || isSaving}
            >
              Cancel
            </Box>
            <Box
              as="button"
              display="inline-flex"
              alignItems="center"
              px="4"
              py="2"
              borderRadius="md"
              bg={
                !localName.trim() ||
                isDeleting ||
                isSaving ||
                templateStorageWriteBlocked
                  ? "blue.200"
                  : "blue.500"
              }
              color="white"
              fontSize="sm"
              fontWeight="medium"
              cursor={
                !localName.trim() ||
                isDeleting ||
                isSaving ||
                templateStorageWriteBlocked
                  ? "not-allowed"
                  : "pointer"
              }
              onClick={
                !localName.trim() ||
                isDeleting ||
                isSaving ||
                templateStorageWriteBlocked
                  ? undefined
                  : handleSave
              }
              aria-disabled={
                !localName.trim() ||
                isDeleting ||
                isSaving ||
                templateStorageWriteBlocked
              }
            >
              {isSaving ? "Saving…" : "Save"}
            </Box>
          </FlexAny>
        </FlexAny>
      </Box>
    </Box>
  )
}
