import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiCheck } from "@react-icons/all-files/pi/PiCheck"
import { PiCopy } from "@react-icons/all-files/pi/PiCopy"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
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

function makeId(prefix: "var" | "preset") {
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

export interface VariablesModalProps {
  onClose(): void
}

/**
 * Variables modal: manages templateVariables and preset overrides per variable.
 *
 * Implemented as a lightweight overlay (not Chakra Modal) to match project conventions.
 */
export function VariablesModal({ onClose }: VariablesModalProps) {
  const { saveNow } = useTemplateSync()
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )

  const templateId = useEditorStore((s) => s.templateId)
  const storeVars = useEditorStore((s) => s.templateVariables)
  const storePresets = useEditorStore((s) => s.templatePresets)

  const setTemplateVariables = useEditorStore((s) => s.setTemplateVariables)
  const setTemplatePresets = useEditorStore((s) => s.setTemplatePresets)

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    storeVars[0]?.id ? storeVars[0].id : null,
  )

  const [draftVars, setDraftVars] = useState<TemplateVariable[]>(() =>
    storeVars.map((v) => ({ ...v })),
  )
  const [draftPresets, setDraftPresets] = useState<TemplatePreset[]>(() =>
    shallowClonePresets(storePresets),
  )

  const [isSaving, setIsSaving] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const selectedVar = useMemo(
    () => draftVars.find((v) => v.id === selectedId) ?? null,
    [draftVars, selectedId],
  )

  const filteredVars = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return draftVars
    return draftVars.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.description ?? "").toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q),
    )
  }, [draftVars, search])

  // Keep selection valid under filtering/deletes.
  useEffect(() => {
    if (!selectedId) {
      setSelectedId(filteredVars[0]?.id ?? null)
      return
    }
    if (!draftVars.some((v) => v.id === selectedId)) {
      setSelectedId(draftVars[0]?.id ?? null)
    }
  }, [draftVars, filteredVars, selectedId])

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

  const handleAddVariable = () => {
    const next: TemplateVariable = {
      id: makeId("var"),
      name: `variable_${draftVars.length + 1}`,
      defaultValue: "",
      description: "",
    }
    setDraftVars((prev) => [...prev, next])
    setSelectedId(next.id)
  }

  const handleDeleteVariable = (id: string) => {
    setDraftVars((prev) => prev.filter((v) => v.id !== id))
    setDraftPresets((prev) =>
      prev.map((p) => {
        const { [id]: _deleted, ...rest } = p.valuesByVariableId ?? {}
        return { ...p, valuesByVariableId: rest }
      }),
    )
  }

  const setSelectedField = (patch: Partial<TemplateVariable>) => {
    if (!selectedVar) return
    setDraftVars((prev) =>
      prev.map((v) => (v.id === selectedVar.id ? { ...v, ...patch } : v)),
    )
  }

  const setPresetOverride = (
    presetId: string,
    variableId: string,
    value: string,
  ) => {
    setDraftPresets((prev) =>
      prev.map((p) =>
        p.id !== presetId
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
    if (!selectedVar) return
    try {
      await navigator.clipboard?.writeText(selectedVar.id)
      setCopiedId(true)
      window.setTimeout(() => setCopiedId(false), 1000)
    } catch {
      // ignore
    }
  }

  const handleSave = async () => {
    if (!templateId) return
    if (templateStorageWriteBlocked) return
    setIsSaving(true)
    try {
      setTemplateVariables(draftVars)
      setTemplatePresets(draftPresets)
      await saveNow({ reason: "manual" })
      onCloseRef.current()
    } finally {
      setIsSaving(false)
    }
  }

  const disableActions = !templateId || templateStorageWriteBlocked

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
            <Icon as={PiBracketsCurly} boxSize={5} color="orange.500" />
            <Box minW={0}>
              <TextAny
                fontSize="lg"
                fontWeight="semibold"
                color="editorGray.900"
              >
                Variables
              </TextAny>
              <TextAny
                fontSize="sm"
                color="editorGray.600"
                mt="0.5"
                isTruncated
              >
                Placeholders that get filled from a preset during preview, or
                from a CSV column during automation.
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
            aria-label="Close variables modal"
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
                  placeholder="Search variables…"
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
              {filteredVars.map((v) => {
                const isSelected = v.id === selectedId
                return (
                  <Box
                    key={v.id}
                    px="3"
                    py="2.5"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={isSelected ? "orange.200" : "editorGray.300"}
                    bg={isSelected ? "orange.50" : "white"}
                    cursor="pointer"
                    mb="2"
                    onClick={() => setSelectedId(v.id)}
                    _hover={{ bg: isSelected ? "orange.50" : "gray.50" }}
                  >
                    <TextAny
                      fontSize="sm"
                      fontWeight="semibold"
                      color="orange.700"
                      fontFamily="mono"
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
                        mt="1"
                        isTruncated
                      >
                        {v.description}
                      </TextAny>
                    ) : null}
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
                  onClick={disableActions ? undefined : handleAddVariable}
                  isDisabled={disableActions}
                  px="4"
                >
                  Add variable
                </ButtonAny>
              </FlexAny>
            </Box>
          </Box>

          {/* Right detail */}
          <Box flex="1" overflow="hidden">
            {selectedVar ? (
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
                    color="orange.700"
                    fontFamily="mono"
                  >
                    {"{{"}
                    {selectedVar.name}
                    {"}}"}
                  </TextAny>
                  <TextAny
                    fontSize="sm"
                    color="editorGray.600"
                    mt="1"
                    isTruncated
                  >
                    {selectedVar.description || "—"}
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
                        Variable ID
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
                          {selectedVar.id}
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
                          aria-label="Copy variable id"
                        >
                          <Icon
                            as={copiedId ? PiCheck : PiCopy}
                            boxSize={4}
                            color="editorGray.600"
                          />
                        </Box>
                      </FlexAny>
                    </Box>

                    <FlexAny gap="4" mb="4">
                      <Box flex="1">
                        <TextAny
                          fontSize="sm"
                          fontWeight="medium"
                          color="editorGray.700"
                          mb="2"
                        >
                          Variable name
                        </TextAny>
                        <InputAny
                          value={selectedVar.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSelectedField({ name: e.target.value })
                          }
                          fontSize="sm"
                          fontFamily="mono"
                          isDisabled={disableActions}
                        />
                      </Box>
                      <Box flex="1">
                        <TextAny
                          fontSize="sm"
                          fontWeight="medium"
                          color="editorGray.700"
                          mb="2"
                        >
                          Default value
                        </TextAny>
                        <InputAny
                          value={selectedVar.defaultValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSelectedField({ defaultValue: e.target.value })
                          }
                          fontSize="sm"
                          fontFamily="mono"
                          isDisabled={disableActions}
                        />
                      </Box>
                    </FlexAny>

                    <Box mb="4">
                      <TextAny
                        fontSize="sm"
                        fontWeight="medium"
                        color="editorGray.700"
                        mb="2"
                      >
                        Description
                      </TextAny>
                      <InputAny
                        value={selectedVar.description ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSelectedField({ description: e.target.value })
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
                      Value per preset
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
                          Preset
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

                      {draftPresets.map((p) => {
                        const value =
                          p.valuesByVariableId?.[selectedVar.id] ?? ""
                        return (
                          <FlexAny
                            key={p.id}
                            px="4"
                            py="2.5"
                            borderBottomWidth="1px"
                            borderColor="editorGray.200"
                            alignItems="center"
                            gap="4"
                          >
                            <TextAny
                              fontSize="sm"
                              color="editorGray.800"
                              flex="1"
                              isTruncated
                            >
                              {p.name}
                            </TextAny>
                            <InputAny
                              value={value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                              ) =>
                                setPresetOverride(
                                  p.id,
                                  selectedVar.id,
                                  e.target.value,
                                )
                              }
                              placeholder={
                                selectedVar.defaultValue
                                  ? `default: ${selectedVar.defaultValue}`
                                  : "uses default value"
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
                          : () => handleDeleteVariable(selectedVar.id)
                      }
                      cursor={disableActions ? "not-allowed" : "pointer"}
                      opacity={disableActions ? 0.6 : 1}
                      aria-disabled={disableActions}
                    >
                      <Icon as={PiTrash} boxSize={4} />
                      Delete variable
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
                  No variables yet
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
          justifyContent="flex-end"
          borderTopWidth="1px"
          borderColor="editorGray.300"
          gap="3"
        >
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
      </Box>
    </Box>
  )
}
