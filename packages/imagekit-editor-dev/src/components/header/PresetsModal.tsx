import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  useToast,
} from "@chakra-ui/react"
import { PiCheck } from "@react-icons/all-files/pi/PiCheck"
import { PiCopy } from "@react-icons/all-files/pi/PiCopy"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiStack } from "@react-icons/all-files/pi/PiStack"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { PiUpload } from "@react-icons/all-files/pi/PiUpload"
import { PiWarningCircle } from "@react-icons/all-files/pi/PiWarningCircle"
import { PiX } from "@react-icons/all-files/pi/PiX"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import type { TemplatePreset, TemplateVariable } from "../../storage/types"
import { useEditorStore } from "../../store"
import { chakraAny } from "../../utils"

const FlexAny = chakraAny(Flex)
const TextAny = chakraAny(Text)
const InputAny = chakraAny(Input)
const InputGroupAny = chakraAny(InputGroup)
const InputLeftElementAny = chakraAny(InputLeftElement)
const ButtonAny = chakraAny(Button)

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      result.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map(parseCsvLine)
}

function makeId(prefix: "preset") {
  return typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function shallowClonePresets(presets: TemplatePreset[]): TemplatePreset[] {
  return presets.map((p) => ({
    ...p,
    valuesByVariableId: { ...(p.valuesByVariableId ?? {}) },
  }))
}

function countSet(
  variables: TemplateVariable[],
  preset: TemplatePreset,
): number {
  let n = 0
  for (const v of variables) {
    const val = preset.valuesByVariableId?.[v.id]
    if (val !== undefined && val.trim() !== "") n++
  }
  return n
}

export interface PresetsModalProps {
  onClose(): void
}

export function PresetsModal({ onClose }: PresetsModalProps) {
  const { saveNow } = useTemplateSync()
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )

  const templateId = useEditorStore((s) => s.templateId)
  const storeVars = useEditorStore((s) => s.templateVariables)
  const storePresets = useEditorStore((s) => s.templatePresets)
  const activePresetId = useEditorStore((s) => s.activeTemplatePresetId)

  const setTemplatePresets = useEditorStore((s) => s.setTemplatePresets)

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    storePresets[0]?.id ? storePresets[0].id : null,
  )

  const [draftPresets, setDraftPresets] = useState<TemplatePreset[]>(() =>
    shallowClonePresets(storePresets),
  )

  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const toast = useToast()

  const selectedPreset = useMemo(
    () => draftPresets.find((p) => p.id === selectedId) ?? null,
    [draftPresets, selectedId],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return draftPresets
    return draftPresets.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    )
  }, [draftPresets, search])

  // Keep selection valid under filtering/deletes.
  useEffect(() => {
    if (!selectedId) {
      setSelectedId(filtered[0]?.id ?? null)
      return
    }
    if (!draftPresets.some((p) => p.id === selectedId)) {
      setSelectedId(draftPresets[0]?.id ?? null)
    }
  }, [draftPresets, filtered, selectedId])

  // Close on Escape.
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

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const disableActions = !templateId || templateStorageWriteBlocked

  const handleAddPreset = () => {
    const next: TemplatePreset = {
      id: makeId("preset"),
      name: `New preset`,
      valuesByVariableId: {},
    }
    setDraftPresets((prev) => [...prev, next])
    setSelectedId(next.id)
  }

  const handleDeletePreset = (id: string) => {
    setDraftPresets((prev) => prev.filter((p) => p.id !== id))
  }

  const setSelectedField = (patch: Partial<TemplatePreset>) => {
    if (!selectedPreset) return
    setDraftPresets((prev) =>
      prev.map((p) => (p.id === selectedPreset.id ? { ...p, ...patch } : p)),
    )
  }

  const setOverride = (variableId: string, value: string) => {
    if (!selectedPreset) return
    setDraftPresets((prev) =>
      prev.map((p) =>
        p.id !== selectedPreset.id
          ? p
          : {
              ...p,
              valuesByVariableId: {
                ...(p.valuesByVariableId ?? {}),
                [variableId]: value,
              },
            },
      ),
    )
  }

  const handleCopyId = async () => {
    if (!selectedPreset) return
    try {
      await navigator.clipboard?.writeText(selectedPreset.id)
      setCopiedId(true)
      window.setTimeout(() => setCopiedId(false), 1000)
    } catch {
      // ignore
    }
  }

  const handleImportCsvClick = () => {
    csvInputRef.current?.click()
  }

  const handleCsvFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    try {
      const rows = parseCsv(await file.text())

      if (rows.length < 2) {
        toast({
          title: "CSV must have a header row and at least one data row.",
          status: "error",
          duration: 4000,
          isClosable: true,
        })
        return
      }

      const [headerRow, ...dataRows] = rows
      const variableHeaders = headerRow.slice(1)

      if (variableHeaders.length === 0) {
        toast({
          title: "CSV has no variable columns.",
          status: "error",
          duration: 4000,
          isClosable: true,
        })
        return
      }

      // Map header name → variable id (null when no matching variable exists)
      const varIdByIndex = variableHeaders.map((name) => {
        const found = storeVars.find((v) => v.name === name)
        return found ? found.id : null
      })

      const skippedColumns = varIdByIndex.filter((id) => id === null).length

      const newPresets: TemplatePreset[] = dataRows
        .filter((row) => row[0]?.trim())
        .map((row) => {
          const valuesByVariableId: Record<string, string> = {}
          for (let i = 0; i < variableHeaders.length; i++) {
            const varId = varIdByIndex[i]
            if (varId !== null && row[i + 1] !== undefined) {
              valuesByVariableId[varId] = row[i + 1]
            }
          }
          return {
            id: makeId("preset"),
            name: row[0].trim(),
            valuesByVariableId,
          }
        })

      if (newPresets.length === 0) {
        toast({
          title: "No valid preset rows found in the CSV.",
          status: "error",
          duration: 4000,
          isClosable: true,
        })
        return
      }

      setDraftPresets((prev) => [...prev, ...newPresets])
      setSelectedId(newPresets[0].id)

      const count = newPresets.length
      const presetWord = count === 1 ? "preset" : "presets"
      if (skippedColumns > 0) {
        const colWord = skippedColumns === 1 ? "column" : "columns"
        toast({
          title: `${count} ${presetWord} imported. ${skippedColumns} unknown variable ${colWord} skipped.`,
          status: "warning",
          duration: 5000,
          isClosable: true,
        })
      } else {
        toast({
          title: `${count} ${presetWord} imported successfully.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        })
      }
    } catch (err) {
      console.error("CSV import failed:", err)
      toast({
        title: "Failed to read or parse the CSV file.",
        status: "error",
        duration: 4000,
        isClosable: true,
      })
    }
  }

  const handleSave = async () => {
    if (!templateId) return
    if (templateStorageWriteBlocked) return
    setIsSaving(true)
    try {
      setTemplatePresets(draftPresets)
      await saveNow({ reason: "manual" })
      onCloseRef.current()
    } finally {
      setIsSaving(false)
    }
  }

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
        bg="white"
        borderRadius="2xl"
        boxShadow="xl"
        borderWidth="1px"
        borderColor="editorGray.300"
        width="860px"
        maxW="96vw"
        height="580px"
        maxH="90vh"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <FlexAny
          px="6"
          py="4"
          alignItems="center"
          borderBottomWidth="1px"
          borderColor="editorGray.300"
          gap="3"
        >
          <FlexAny alignItems="center" gap="2" minW={0} flex="1">
            <Icon as={PiStack} boxSize={5} color="green.500" />
            <Box minW={0}>
              <TextAny
                fontSize="lg"
                fontWeight="semibold"
                color="editorGray.900"
              >
                Presets
              </TextAny>
              <TextAny
                fontSize="sm"
                color="editorGray.600"
                mt="0.5"
                isTruncated
              >
                Presets define a named set of variable overrides, used during
                preview and automation.
              </TextAny>
            </Box>
          </FlexAny>

          <Box
            as="button"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            borderRadius="md"
            p="2"
            _hover={{ bg: "gray.100" }}
            onClick={onClose}
            aria-label="Close presets modal"
          >
            <Icon as={PiX} boxSize={5} color="editorBattleshipGrey.600" />
          </Box>
        </FlexAny>

        {/* Body */}
        <FlexAny flex="1" overflow="hidden">
          {/* Left list */}
          <Box
            width="230px"
            borderRightWidth="1px"
            borderColor="editorGray.300"
          >
            <FlexAny
              px="4"
              py="3"
              gap="3"
              alignItems="center"
              borderBottomWidth="1px"
              borderColor="editorGray.300"
            >
              <InputGroupAny size="md" flex="1">
                <InputLeftElementAny pointerEvents="none" pl="2">
                  <Icon as={PiMagnifyingGlass} boxSize={4} color="gray.400" />
                </InputLeftElementAny>
                <InputAny
                  placeholder="Search presets…"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
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
            </FlexAny>

            <Box px="2" py="2" overflowY="auto" height="calc(100% - 110px)">
              {filtered.map((p) => {
                const isSelected = p.id === selectedId
                const set = countSet(storeVars, p)
                const hasUnset = storeVars.length > 0 && set < storeVars.length
                const isActive =
                  activePresetId != null && p.id === activePresetId
                return (
                  <Box
                    key={p.id}
                    px="3"
                    py="2.5"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={
                      isSelected ? "editorGray.400" : "editorGray.300"
                    }
                    bg="white"
                    cursor="pointer"
                    mb="2"
                    onClick={() => setSelectedId(p.id)}
                    _hover={{ bg: "gray.50" }}
                  >
                    <FlexAny alignItems="center" gap="2">
                      <TextAny
                        fontSize="sm"
                        fontWeight="semibold"
                        color={isActive ? "green.700" : "editorGray.800"}
                        isTruncated
                        flex="1"
                      >
                        {p.name}
                      </TextAny>
                      {hasUnset ? (
                        <Icon
                          as={PiWarningCircle}
                          boxSize={4}
                          color="yellow.500"
                        />
                      ) : null}
                    </FlexAny>
                    <TextAny fontSize="xs" color="editorGray.600" mt="1">
                      {set} of {storeVars.length} variables set
                    </TextAny>
                  </Box>
                )
              })}
            </Box>

            <Box
              px="3"
              py="3"
              borderTopWidth="1px"
              borderColor="editorGray.300"
            >
              <FlexAny alignItems="center" justifyContent="center">
                <ButtonAny
                  size="sm"
                  variant="ghost"
                  leftIcon={<Icon as={PiPlus} boxSize={4} />}
                  color="editorGray.700"
                  fontWeight="normal"
                  onClick={disableActions ? undefined : handleAddPreset}
                  isDisabled={disableActions}
                  px="4"
                >
                  Add preset
                </ButtonAny>
              </FlexAny>
            </Box>
          </Box>

          {/* Right detail */}
          <Box flex="1" overflow="hidden">
            {selectedPreset ? (
              <>
                <Box
                  px="6"
                  py="4"
                  borderBottomWidth="1px"
                  borderColor="editorGray.300"
                >
                  <TextAny
                    fontSize="lg"
                    fontWeight="semibold"
                    color={
                      selectedPreset.id === activePresetId
                        ? "green.700"
                        : "editorGray.900"
                    }
                  >
                    {selectedPreset.name}
                  </TextAny>
                  <TextAny fontSize="sm" color="editorGray.600" mt="1">
                    {countSet(storeVars, selectedPreset)} of {storeVars.length}{" "}
                    variables set
                  </TextAny>
                </Box>

                <Box px="6" py="5" overflowY="auto" height="calc(100% - 76px)">
                  <Box mb="6">
                    <TextAny
                      fontSize="xs"
                      fontWeight="semibold"
                      color="editorGray.500"
                      textTransform="uppercase"
                      letterSpacing="0.04em"
                      mb="3"
                    >
                      Schema
                    </TextAny>

                    <Box mb="4">
                      <TextAny
                        fontSize="sm"
                        fontWeight="medium"
                        color="editorGray.700"
                        mb="2"
                      >
                        Preset ID
                      </TextAny>
                      <FlexAny
                        alignItems="center"
                        gap="2"
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor="editorGray.300"
                        bg="editorGray.50"
                        px="3"
                        py="2"
                      >
                        <TextAny
                          fontSize="xs"
                          color="editorGray.600"
                          fontFamily="mono"
                          flex="1"
                          userSelect="all"
                          isTruncated
                        >
                          {selectedPreset.id}
                        </TextAny>
                        <Box
                          as="button"
                          display="inline-flex"
                          alignItems="center"
                          justifyContent="center"
                          borderRadius="md"
                          p="1.5"
                          _hover={{ bg: "gray.100" }}
                          onClick={handleCopyId}
                          aria-label="Copy preset id"
                        >
                          <Icon
                            as={copiedId ? PiCheck : PiCopy}
                            boxSize={4}
                            color="editorGray.600"
                          />
                        </Box>
                      </FlexAny>
                    </Box>

                    <Box mb="4">
                      <TextAny
                        fontSize="sm"
                        fontWeight="medium"
                        color="editorGray.700"
                        mb="2"
                      >
                        Preset name
                      </TextAny>
                      <InputAny
                        value={selectedPreset.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSelectedField({ name: e.target.value })
                        }
                        fontSize="sm"
                        isDisabled={disableActions}
                      />
                    </Box>
                  </Box>

                  <Box mb="6">
                    <TextAny
                      fontSize="xs"
                      fontWeight="semibold"
                      color="editorGray.500"
                      textTransform="uppercase"
                      letterSpacing="0.04em"
                      mb="3"
                    >
                      Variable values
                    </TextAny>

                    <Box
                      borderWidth="1px"
                      borderColor="editorGray.300"
                      borderRadius="xl"
                      overflow="hidden"
                    >
                      <FlexAny
                        bg="editorGray.50"
                        borderBottomWidth="1px"
                        borderColor="editorGray.300"
                        px="4"
                        py="2"
                      >
                        <TextAny
                          fontSize="xs"
                          fontWeight="semibold"
                          color="editorGray.500"
                          textTransform="uppercase"
                          letterSpacing="0.04em"
                          flex="1"
                        >
                          Variable
                        </TextAny>
                        <TextAny
                          fontSize="xs"
                          fontWeight="semibold"
                          color="editorGray.500"
                          textTransform="uppercase"
                          letterSpacing="0.04em"
                          flex="1"
                        >
                          Default
                        </TextAny>
                        <TextAny
                          fontSize="xs"
                          fontWeight="semibold"
                          color="editorGray.500"
                          textTransform="uppercase"
                          letterSpacing="0.04em"
                          flex="1"
                        >
                          Override value
                        </TextAny>
                      </FlexAny>

                      {storeVars.map((v) => {
                        const value =
                          selectedPreset.valuesByVariableId?.[v.id] ?? ""
                        return (
                          <FlexAny
                            key={v.id}
                            px="4"
                            py="2.5"
                            borderBottomWidth="1px"
                            borderColor="editorGray.200"
                            alignItems="center"
                            gap="4"
                          >
                            <Box flex="1" minW={0}>
                              <TextAny
                                fontSize="sm"
                                fontFamily="mono"
                                color="orange.700"
                                isTruncated
                              >
                                {"{{"}
                                {v.name}
                                {"}}"}
                              </TextAny>
                              {v.description ? (
                                <TextAny
                                  fontSize="xs"
                                  color="editorGray.600"
                                  mt="0.5"
                                  isTruncated
                                >
                                  {v.description}
                                </TextAny>
                              ) : null}
                            </Box>
                            <TextAny
                              flex="1"
                              fontSize="xs"
                              fontFamily="mono"
                              color="editorGray.600"
                              isTruncated
                            >
                              {v.defaultValue || "—"}
                            </TextAny>
                            <InputAny
                              value={value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                              ) => setOverride(v.id, e.target.value)}
                              placeholder={
                                v.defaultValue
                                  ? `uses default (${v.defaultValue})`
                                  : "uses default"
                              }
                              fontSize="sm"
                              fontFamily="mono"
                              flex="1"
                              isDisabled={disableActions}
                            />
                          </FlexAny>
                        )
                      })}
                    </Box>
                  </Box>

                  <FlexAny
                    justifyContent="space-between"
                    alignItems="center"
                    gap="3"
                  >
                    <Box
                      as="button"
                      display="inline-flex"
                      alignItems="center"
                      gap="2"
                      px="4"
                      py="2"
                      borderRadius="md"
                      color="red.500"
                      fontSize="sm"
                      fontWeight="medium"
                      _hover={{ bg: "red.50" }}
                      onClick={
                        disableActions
                          ? undefined
                          : () => handleDeletePreset(selectedPreset.id)
                      }
                      cursor={disableActions ? "not-allowed" : "pointer"}
                      opacity={disableActions ? 0.6 : 1}
                      aria-disabled={disableActions}
                    >
                      <Icon as={PiTrash} boxSize={4} />
                      Delete preset
                    </Box>
                  </FlexAny>
                </Box>
              </>
            ) : (
              <FlexAny
                alignItems="center"
                justifyContent="center"
                height="full"
              >
                <TextAny fontSize="sm" color="editorGray.600">
                  No presets yet
                </TextAny>
              </FlexAny>
            )}
          </Box>
        </FlexAny>

        {/* Footer */}
        <FlexAny
          px="6"
          py="4"
          alignItems="center"
          justifyContent="space-between"
          borderTopWidth="1px"
          borderColor="editorGray.300"
          gap="3"
        >
          <Box>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={handleCsvFileSelected}
            />
            <Box
              as="button"
              display="inline-flex"
              alignItems="center"
              gap="2"
              px="4"
              py="2"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
              bg="white"
              fontSize="sm"
              fontWeight="medium"
              color={disableActions ? "gray.400" : "editorGray.700"}
              cursor={disableActions ? "not-allowed" : "pointer"}
              _hover={{ bg: disableActions ? "white" : "gray.50" }}
              onClick={disableActions ? undefined : handleImportCsvClick}
              aria-disabled={disableActions}
            >
              <Icon as={PiUpload} boxSize={4} />
              Import Presets from CSV
            </Box>
          </Box>

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
              color={isSaving ? "gray.400" : "editorGray.700"}
              cursor={isSaving ? "not-allowed" : "pointer"}
              onClick={isSaving ? undefined : onClose}
              aria-disabled={isSaving}
              _hover={{ bg: "gray.50" }}
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
              bg={disableActions || isSaving ? "blue.200" : "blue.500"}
              _hover={{ bg: "blue.600" }}
              color="white"
              fontSize="sm"
              fontWeight="medium"
              cursor={disableActions || isSaving ? "not-allowed" : "pointer"}
              onClick={disableActions || isSaving ? undefined : handleSave}
              aria-disabled={disableActions || isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </Box>
          </FlexAny>
        </FlexAny>
      </Box>
    </Box>
  )
}
