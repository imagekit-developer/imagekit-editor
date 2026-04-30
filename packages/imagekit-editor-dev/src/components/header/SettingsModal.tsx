import { Box, Flex, Icon, IconButton, Input, Text } from "@chakra-ui/react"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { PiX } from "@react-icons/all-files/pi/PiX"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import Select, { type StylesConfig } from "react-select"
import { useTemplatePermissions } from "../../context/TemplatePermissionsContext"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { isTemplateAccessDeniedError } from "../../storage/templateAccessError"
import type { TemplateRecord } from "../../storage/types"
import { useEditorStore } from "../../store"
import { chakraAny, formatTemplateNameForUI } from "../../utils"

// ---------------------------------------------------------------------------
// Type casts — Chakra's strict generic signatures conflict with our JSX usage
// ---------------------------------------------------------------------------
const FlexAny = chakraAny(Flex)
const TextAny = chakraAny(Text)
const IconButtonAny = chakraAny(IconButton)
const InputAny = chakraAny(Input)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SettingsModalProps {
  /** The template whose settings are being edited. All operations act on this record. */
  data: TemplateRecord
  onClose(): void
  /** Called with the updated record after a successful save. */
  onSaved?(updated: TemplateRecord): void
  /**
   * Called after the user confirms deletion.
   *
   * `SettingsModal` does not delete templates itself. Callers must provide a
   * single delete implementation that can also handle required side-effects
   * (list refresh, editor reset, etc.).
   */
  onDeleteRequested?(id: string): Promise<void> | void
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
  onDeleteRequested,
}: SettingsModalProps) {
  const provider = useTemplateStorage()
  const permissions = useTemplatePermissions(data)
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
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

  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      if (isTemplateAccessDeniedError(err)) {
        useEditorStore
          .getState()
          .blockTemplateStorageWrites(
            err instanceof Error
              ? err.message
              : "You no longer have access to this template.",
          )
        onClose()
        return
      }
    } finally {
      setIsSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------
  const handleDeleteConfirmed = async () => {
    if (!onDeleteRequested) return

    setIsDeleting(true)
    setShowDeleteConfirm(false)
    try {
      await onDeleteRequested(data.id)
      onClose()
    } catch (err) {
      if (isTemplateAccessDeniedError(err)) {
        useEditorStore
          .getState()
          .blockTemplateStorageWrites(
            err instanceof Error
              ? err.message
              : "You no longer have access to this template.",
          )
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
        backgroundColor: permissions.changeVisibility
          ? base.backgroundColor
          : "#F7FAFC",
        opacity: permissions.changeVisibility ? 1 : 0.6,
      }),
      menu: (base) => ({ ...base, zIndex: 10 }),
      option: (base) => ({ ...base, fontSize: "12px" }),
    }),
    [permissions.changeVisibility],
  )

  // Get height of the current viewport
  const viewportHeight = useMemo(() => {
    return window.innerHeight
  }, [])

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
        boxShadow="xl"
        display="flex"
        flexDirection="column"
        position="relative"
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
                isDisabled={!permissions.rename}
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
                  if (!permissions.changeVisibility || !option) return
                  setLocalVisibility(option.value as Visibility)
                }}
                options={[
                  { value: "onlyMe", label: "Only to me" },
                  { value: "everyone", label: "Shared with everyone" },
                ]}
                menuPlacement={viewportHeight > 900 ? "auto" : "top"}
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
                isDisabled={!permissions.changeVisibility}
              />
            </Box>
          </FlexAny>
        </Box>

        {/* Delete confirmation — blur overlay + centered floating card */}
        {showDeleteConfirm && (
          <>
            {/* Frosted-glass overlay dims the modal content behind the popover */}
            <Box
              position="absolute"
              inset={0}
              bg="whiteAlpha.700"
              backdropFilter="blur(3px)"
              zIndex={9}
              borderRadius="xl"
            />
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              w="75%"
              bg="white"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="red.200"
              boxShadow="0 8px 24px rgba(0,0,0,0.18), 0 2px 8px rgba(220,53,69,0.12)"
              px="5"
              py="4"
              zIndex={10}
              onClick={(e) => e.stopPropagation()}
            >
              <FlexAny direction="column" gap="4">
                <FlexAny alignItems="flex-start" gap="3">
                  <Box
                    flexShrink={0}
                    mt="0.5"
                    p="1.5"
                    borderRadius="md"
                    bg="red.50"
                  >
                    <Icon
                      as={PiTrash}
                      boxSize={4}
                      color="red.500"
                      display="block"
                    />
                  </Box>
                  <Box>
                    <TextAny
                      fontSize="sm"
                      fontWeight="semibold"
                      color="gray.800"
                    >
                      Delete template?
                    </TextAny>
                    <TextAny
                      fontSize="xs"
                      color="gray.700"
                      mt="1"
                      lineHeight="1.5"
                    >
                      This will permanently delete &ldquo;
                      {formatTemplateNameForUI(data.name)}&rdquo;. This action
                      cannot be reversed.
                    </TextAny>
                  </Box>
                </FlexAny>
                <FlexAny gap="2" justifyContent="flex-end">
                  <Box
                    as="button"
                    display="inline-flex"
                    alignItems="center"
                    px="3"
                    py="1.5"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    bg="white"
                    fontSize="sm"
                    fontWeight="medium"
                    color="gray.600"
                    cursor="pointer"
                    _hover={{ bg: "gray.50" }}
                    onClick={() => setShowDeleteConfirm(false)}
                    data-testid="delete-confirm-cancel"
                  >
                    Cancel
                  </Box>
                  <Box
                    as="button"
                    display="inline-flex"
                    alignItems="center"
                    px="3"
                    py="1.5"
                    borderRadius="md"
                    bg={isDeleting ? "red.300" : "red.500"}
                    color="white"
                    fontSize="sm"
                    fontWeight="medium"
                    cursor={isDeleting ? "not-allowed" : "pointer"}
                    _hover={{ bg: isDeleting ? "red.300" : "red.600" }}
                    onClick={isDeleting ? undefined : handleDeleteConfirmed}
                    aria-disabled={isDeleting}
                    data-testid="delete-confirm-submit"
                  >
                    {isDeleting ? "Deleting…" : "Yes, delete"}
                  </Box>
                </FlexAny>
              </FlexAny>
            </Box>
          </>
        )}

        {/* Footer */}
        <FlexAny
          px="6"
          py="4"
          alignItems="center"
          justifyContent="space-between"
          borderTopWidth="1px"
          borderColor="editorGray.300"
        >
          {/* Delete button — only shown when deletion is supported */}
          {onDeleteRequested ? (
            <FlexAny>
              <Box
                as="button"
                display="inline-flex"
                alignItems="center"
                px="4"
                py="2"
                borderRadius="md"
                gap="2"
                color={
                  isDeleting || isSaving || showDeleteConfirm
                    ? "gray.400"
                    : "red.500"
                }
                _hover={{
                  bg: "red.50",
                }}
                cursor={
                  isDeleting || isSaving || showDeleteConfirm
                    ? "not-allowed"
                    : "pointer"
                }
                fontSize="sm"
                fontWeight="medium"
                onClick={() => {
                  if (!permissions.delete) return
                  if (isDeleting || isSaving || showDeleteConfirm) return
                  setShowDeleteConfirm(true)
                }}
                aria-disabled={isDeleting || isSaving || showDeleteConfirm}
                disabled={!permissions.delete}
                _disabled={{
                  color: "gray.400",
                  cursor: "not-allowed",
                }}
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
              _hover={{
                bg: "gray.50",
              }}
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
              _hover={{
                bg: "blue.600",
              }}
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
              disabled={!permissions.save}
              _disabled={{
                bg: "blue.200",
                cursor: "not-allowed",
              }}
            >
              {isSaving ? "Saving…" : "Save"}
            </Box>
          </FlexAny>
        </FlexAny>
      </Box>
    </Box>
  )
}
