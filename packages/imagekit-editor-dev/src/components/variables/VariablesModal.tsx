import {
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  IconButton,
  Input,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiCaretUp } from "@react-icons/all-files/pi/PiCaretUp"
import { PiDotsSixVertical } from "@react-icons/all-files/pi/PiDotsSixVertical"
import { PiImage } from "@react-icons/all-files/pi/PiImage"
import { PiNotePencil } from "@react-icons/all-files/pi/PiNotePencil"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { PiXCircle } from "@react-icons/all-files/pi/PiXCircle"
import { useMemo, useState } from "react"
import { useEditorStore } from "../../store"
import type {
  AssetSearchDynamicVariableDefinition,
  CustomMetadataFieldDefinition,
  DynamicVariableDefinition,
} from "../../variables/types"

function createVariable(): DynamicVariableDefinition {
  return {
    id: `variable-${Date.now()}`,
    name: "",
    type: "literal",
    valueType: "string",
    sampleValue: "",
  }
}

export function VariablesModal({ onClose }: { onClose(): void }) {
  const dynamicVariables = useEditorStore((s) => s.dynamicVariables)
  const setDynamicVariables = useEditorStore((s) => s.setDynamicVariables)
  const customMetadataFields = useEditorStore((s) => s.customMetadataFields)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const isCardExpanded = (id: string) => !collapsedIds.has(id)
  const toggleCard = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const variableNames = useMemo(
    () =>
      dynamicVariables.reduce<Record<string, number>>((acc, variable) => {
        const name = variable.name.trim()
        if (name) acc[name] = (acc[name] ?? 0) + 1
        return acc
      }, {}),
    [dynamicVariables],
  )

  const updateVariable = (
    id: string,
    updater: (variable: DynamicVariableDefinition) => DynamicVariableDefinition,
  ) => {
    setDynamicVariables(
      dynamicVariables.map((variable) =>
        variable.id === id ? updater(variable) : variable,
      ),
    )
  }

  const updateAssetQuery = (
    variableId: string,
    patch: Partial<
      import("../../variables/types").DynamicVariableAssetSearchQuery
    >,
  ) => {
    updateVariable(variableId, (current) => {
      if (current.type !== "assetSearch") return current
      return {
        ...current,
        assetQuery: { ...current.assetQuery, ...patch },
      }
    })
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
        w="60vw"
        maxW="60vw"
        h="80vh"
        maxH="80vh"
        bg="white"
        borderRadius="xl"
        boxShadow="xl"
        display="flex"
        flexDirection="column"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Flex
          px="6"
          py="5"
          alignItems="flex-start"
          justifyContent="space-between"
          borderBottomWidth="1px"
          borderColor="editorGray.200"
        >
          <Box>
            <Text fontSize="lg" fontWeight="bold" color="editorGray.900">
              Variables
            </Text>
            <Text fontSize="sm" color="editorBattleshipGrey.500" mt="1">
              Define the{" "}
              <Text
                as="span"
                fontFamily="mono"
                fontSize="xs"
                bg="editorGray.100"
                px="1"
                py="0.5"
                borderRadius="sm"
              >
                {"{{token}}"}
              </Text>{" "}
              placeholders used in this template. For each CSV row, these get
              substituted with real values.
            </Text>
          </Box>
          <Flex gap="2" align="center">
            <Button
              leftIcon={<PiPlus />}
              size="sm"
              variant="outline"
              borderRadius="md"
              onClick={() =>
                setDynamicVariables([
                  ...dynamicVariables,
                  {
                    ...createVariable(),
                    id: `variable-${Date.now()}-${dynamicVariables.length}`,
                  },
                ])
              }
            >
              Add variable
            </Button>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<Icon as={PiX} boxSize={5} />}
              aria-label="Close variables"
            />
          </Flex>
        </Flex>

        {/* Body */}
        <Box px="6" py="5" flex="1" overflowY="auto">
          <Flex direction="column" gap="5">
            {dynamicVariables.length === 0 && (
              <VStack py={16} spacing={3} color="editorBattleshipGrey.400">
                <Box bg="editorGray.100" borderRadius="full" p={4} mb={1}>
                  <Icon
                    as={PiBracketsCurly}
                    boxSize={7}
                    color="editorBattleshipGrey.400"
                  />
                </Box>
                <Text fontSize="sm" fontWeight="medium" color="editorGray.600">
                  No variables defined
                </Text>
                <Text
                  fontSize="xs"
                  color="editorBattleshipGrey.400"
                  maxW="280px"
                  textAlign="center"
                >
                  Variables let you create dynamic templates with values that
                  change per image.
                </Text>
              </VStack>
            )}
            {dynamicVariables.map((variable) => {
              const duplicated =
                variable.name.trim().length > 0 &&
                (variableNames[variable.name.trim()] ?? 0) > 1
              const expanded = isCardExpanded(variable.id)
              const tokenName = variable.name.trim() || "token"
              const typeLabel =
                variable.type === "assetSearch" ? "image" : "text"
              const typeBadgeColor =
                variable.type === "assetSearch" ? "purple" : "green"

              return (
                <Box
                  key={variable.id}
                  borderWidth="1px"
                  borderColor="editorGray.200"
                  borderRadius="lg"
                  overflow="hidden"
                >
                  {/* Card header */}
                  <Flex
                    px="3"
                    py="3"
                    align="center"
                    gap="2.5"
                    cursor="pointer"
                    onClick={() => toggleCard(variable.id)}
                    _hover={{ bg: "editorGray.50" }}
                    transition="background 0.15s"
                  >
                    <Icon
                      as={PiDotsSixVertical}
                      boxSize={4}
                      color="editorBattleshipGrey.300"
                      cursor="grab"
                      flexShrink={0}
                    />
                    <Text
                      fontFamily="mono"
                      fontSize="sm"
                      fontWeight="semibold"
                      bg="editorGray.100"
                      px="2"
                      py="0.5"
                      borderRadius="md"
                      color="editorGray.800"
                      whiteSpace="nowrap"
                    >
                      {`{{${tokenName}}}`}
                    </Text>
                    <Text
                      fontSize="sm"
                      color="editorBattleshipGrey.500"
                      flex="1"
                      noOfLines={1}
                    >
                      {variable.displayLabel || ""}
                    </Text>
                    <Badge
                      colorScheme={typeBadgeColor}
                      fontSize="xs"
                      fontWeight="medium"
                      borderRadius="md"
                      px="2"
                      py="0.5"
                      textTransform="lowercase"
                    >
                      <Flex align="center" gap="1">
                        <Icon
                          as={
                            variable.type === "assetSearch"
                              ? PiImage
                              : PiNotePencil
                          }
                          boxSize={3}
                        />
                        {typeLabel}
                      </Flex>
                    </Badge>
                    <Icon
                      as={expanded ? PiCaretUp : PiCaretDown}
                      boxSize={4}
                      color="editorBattleshipGrey.400"
                    />
                  </Flex>

                  {/* Card body */}
                  <Collapse in={expanded} animateOpacity>
                    <Flex
                      direction="column"
                      gap="4"
                      px="4"
                      py="4"
                      borderTopWidth="1px"
                      borderColor="editorGray.100"
                    >
                      {/* Token name + Display label */}
                      <Flex gap="4">
                        <FormControl
                          flex={1}
                          isInvalid={duplicated || !variable.name.trim()}
                        >
                          <FormLabel
                            fontSize="xs"
                            fontWeight="semibold"
                            color="editorBattleshipGrey.500"
                            textTransform="uppercase"
                            letterSpacing="wider"
                          >
                            Token name
                          </FormLabel>
                          <Flex align="center" gap="0">
                            <Text
                              fontSize="sm"
                              fontFamily="mono"
                              color="editorBattleshipGrey.400"
                              px="2"
                              borderWidth="1px"
                              borderRightWidth="0"
                              borderColor="editorGray.300"
                              borderLeftRadius="md"
                              h="40px"
                              lineHeight="38px"
                              bg="editorGray.50"
                            >
                              {"{{"}
                            </Text>
                            <Input
                              value={variable.name}
                              onChange={(e) =>
                                updateVariable(variable.id, (current) => ({
                                  ...current,
                                  name: e.target.value.replace(
                                    /[^a-zA-Z0-9_]/g,
                                    "",
                                  ),
                                }))
                              }
                              placeholder="token_name"
                              borderRadius="0"
                              fontFamily="mono"
                              fontSize="sm"
                            />
                            <Text
                              fontSize="sm"
                              fontFamily="mono"
                              color="editorBattleshipGrey.400"
                              px="2"
                              borderWidth="1px"
                              borderLeftWidth="0"
                              borderColor="editorGray.300"
                              borderRightRadius="md"
                              h="40px"
                              lineHeight="38px"
                              bg="editorGray.50"
                            >
                              {"}}"}
                            </Text>
                          </Flex>
                          {!variable.name.trim() && (
                            <Text mt="1" fontSize="xs" color="red.500">
                              Token name is required.
                            </Text>
                          )}
                          {duplicated && variable.name.trim() && (
                            <Text mt="1" fontSize="xs" color="red.500">
                              Duplicate token name.
                            </Text>
                          )}
                        </FormControl>
                        <FormControl flex={1}>
                          <FormLabel
                            fontSize="xs"
                            fontWeight="semibold"
                            color="editorBattleshipGrey.500"
                            textTransform="uppercase"
                            letterSpacing="wider"
                          >
                            Display label
                          </FormLabel>
                          <Input
                            value={variable.displayLabel ?? ""}
                            onChange={(e) =>
                              updateVariable(variable.id, (current) => ({
                                ...current,
                                displayLabel: e.target.value || undefined,
                              }))
                            }
                            placeholder="Product title"
                            fontSize="sm"
                          />
                        </FormControl>
                      </Flex>

                      {/* Description */}
                      <FormControl>
                        <FormLabel
                          fontSize="xs"
                          fontWeight="semibold"
                          color="editorBattleshipGrey.500"
                          textTransform="uppercase"
                          letterSpacing="wider"
                        >
                          Description{" "}
                          <Text
                            as="span"
                            fontWeight="normal"
                            color="editorBattleshipGrey.400"
                          >
                            optional
                          </Text>
                        </FormLabel>
                        <Input
                          value={variable.description ?? ""}
                          onChange={(e) =>
                            updateVariable(variable.id, (current) => ({
                              ...current,
                              description: e.target.value || undefined,
                            }))
                          }
                          placeholder="Short product name shown on the card"
                          fontSize="sm"
                        />
                      </FormControl>

                      {/* Type toggle */}
                      <FormControl>
                        <FormLabel
                          fontSize="xs"
                          fontWeight="semibold"
                          color="editorBattleshipGrey.500"
                          textTransform="uppercase"
                          letterSpacing="wider"
                        >
                          Type
                        </FormLabel>
                        <Flex gap="2">
                          <Button
                            size="sm"
                            variant={
                              variable.type === "literal" ? "outline" : "ghost"
                            }
                            borderWidth={
                              variable.type === "literal" ? "2px" : "1px"
                            }
                            borderColor={
                              variable.type === "literal"
                                ? "blue.400"
                                : "editorGray.300"
                            }
                            color={
                              variable.type === "literal"
                                ? "blue.600"
                                : "editorGray.600"
                            }
                            bg={
                              variable.type === "literal" ? "blue.50" : "white"
                            }
                            leftIcon={<Icon as={PiNotePencil} boxSize={4} />}
                            onClick={() =>
                              updateVariable(variable.id, (current) => ({
                                ...current,
                                type: "literal",
                                valueType: "string",
                              }))
                            }
                            fontWeight="medium"
                            px="4"
                          >
                            Text
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              variable.type === "assetSearch"
                                ? "outline"
                                : "ghost"
                            }
                            borderWidth={
                              variable.type === "assetSearch" ? "2px" : "1px"
                            }
                            borderColor={
                              variable.type === "assetSearch"
                                ? "blue.400"
                                : "editorGray.300"
                            }
                            color={
                              variable.type === "assetSearch"
                                ? "blue.600"
                                : "editorGray.600"
                            }
                            bg={
                              variable.type === "assetSearch"
                                ? "blue.50"
                                : "white"
                            }
                            leftIcon={<Icon as={PiImage} boxSize={4} />}
                            onClick={() =>
                              updateVariable(variable.id, (current) => ({
                                ...current,
                                type: "assetSearch",
                                valueType: "imagePath",
                                assetQuery:
                                  current.type === "assetSearch"
                                    ? current.assetQuery
                                    : {},
                              }))
                            }
                            fontWeight="medium"
                            px="4"
                          >
                            Image asset
                          </Button>
                        </Flex>
                      </FormControl>

                      {/* Default value section */}
                      <Box bg="editorGray.50" borderRadius="md" p="4">
                        <Flex gap="4">
                          <FormControl flex={1}>
                            <FormLabel
                              fontSize="xs"
                              fontWeight="semibold"
                              color="editorBattleshipGrey.500"
                              textTransform="uppercase"
                              letterSpacing="wider"
                            >
                              Sample value{" "}
                              <Text
                                as="span"
                                fontWeight="normal"
                                color="editorBattleshipGrey.400"
                                textTransform="none"
                              >
                                used in template preview
                              </Text>
                            </FormLabel>
                            <Input
                              value={String(variable.sampleValue ?? "")}
                              onChange={(e) =>
                                updateVariable(variable.id, (current) => ({
                                  ...current,
                                  sampleValue: e.target.value,
                                }))
                              }
                              placeholder={
                                variable.type === "assetSearch"
                                  ? "/deliverables/shirt.png"
                                  : "e.g. $49.99"
                              }
                              fontSize="sm"
                              bg="white"
                            />
                          </FormControl>
                          {variable.type === "literal" && (
                            <FormControl w="120px" flexShrink={0}>
                              <FormLabel
                                fontSize="xs"
                                fontWeight="semibold"
                                color="editorBattleshipGrey.500"
                                textTransform="uppercase"
                                letterSpacing="wider"
                              >
                                Max length
                              </FormLabel>
                              <Input
                                type="number"
                                min={1}
                                value={String(variable.maxLength ?? "")}
                                onChange={(e) =>
                                  updateVariable(variable.id, (current) => ({
                                    ...current,
                                    maxLength: e.target.value
                                      ? Number(e.target.value)
                                      : undefined,
                                  }))
                                }
                                placeholder="100"
                                fontSize="sm"
                                bg="white"
                              />
                            </FormControl>
                          )}
                        </Flex>
                      </Box>

                      {/* Asset search filters */}
                      {variable.type === "assetSearch" && (
                        <AssetSearchSection
                          variable={variable}
                          updateAssetQuery={updateAssetQuery}
                          customMetadataFields={customMetadataFields}
                        />
                      )}

                      {/* Remove variable */}
                      <Flex justify="flex-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          color="editorBattleshipGrey.400"
                          leftIcon={<Icon as={PiXCircle} boxSize={4} />}
                          onClick={() =>
                            setDynamicVariables(
                              dynamicVariables.filter(
                                (item) => item.id !== variable.id,
                              ),
                            )
                          }
                          _hover={{ color: "red.500" }}
                          fontWeight="normal"
                        >
                          Remove variable
                        </Button>
                      </Flex>
                    </Flex>
                  </Collapse>
                </Box>
              )
            })}
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}

/* ─── Locked asset filters sub-section ─────────────────────────────────────── */

interface AssetFilter {
  field: string
  op: string
  value: string
}

const STANDARD_FIELDS = ["format", "tags", "name", "path", "fileType", "type"]

const OPERATOR_OPTIONS = [
  { value: "=", label: "=" },
  { value: "!=", label: "≠" },
  { value: "contains", label: "contains" },
  { value: "startsWith", label: "starts with" },
]

function filtersFromQuery(
  q: import("../../variables/types").DynamicVariableAssetSearchQuery,
): AssetFilter[] {
  const filters: AssetFilter[] = []
  if (q.format) filters.push({ field: "format", op: "=", value: q.format })
  if (q.fileType)
    filters.push({ field: "fileType", op: "=", value: q.fileType })
  if (q.type) filters.push({ field: "type", op: "=", value: q.type })
  if (q.name) filters.push({ field: "name", op: "=", value: q.name })
  if (q.path) filters.push({ field: "path", op: "=", value: q.path })
  if (q.tags && q.tags.length > 0)
    filters.push({ field: "tags", op: "=", value: q.tags.join(", ") })
  if (q.customMetadata) {
    for (const [k, v] of Object.entries(q.customMetadata)) {
      filters.push({ field: `customMetadata.${k}`, op: "=", value: v })
    }
  }
  return filters
}

function filtersToQuery(
  filters: AssetFilter[],
): Partial<import("../../variables/types").DynamicVariableAssetSearchQuery> {
  const patch: Partial<
    import("../../variables/types").DynamicVariableAssetSearchQuery
  > = {
    format: undefined,
    fileType: undefined,
    type: undefined,
    name: undefined,
    path: undefined,
    tags: undefined,
    customMetadata: undefined,
  }
  const cm: Record<string, string> = {}
  for (const f of filters) {
    if (!f.field || !f.value) continue
    if (f.field === "format") patch.format = f.value
    else if (
      f.field === "fileType" &&
      ["all", "image", "non-image"].includes(f.value)
    )
      patch.fileType = f.value as "all" | "image" | "non-image"
    else if (
      f.field === "type" &&
      ["file", "file-version", "folder", "all"].includes(f.value)
    )
      patch.type = f.value as "file" | "file-version" | "folder" | "all"
    else if (f.field === "name") patch.name = f.value
    else if (f.field === "path") patch.path = f.value
    else if (f.field === "tags")
      patch.tags = f.value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    else if (f.field.startsWith("customMetadata.")) {
      const key = f.field.replace("customMetadata.", "")
      if (key) cm[key] = f.value
    }
  }
  if (Object.keys(cm).length > 0) patch.customMetadata = cm
  return patch
}

function AssetSearchSection({
  variable,
  updateAssetQuery,
  customMetadataFields,
}: {
  variable: AssetSearchDynamicVariableDefinition
  updateAssetQuery: (
    id: string,
    patch: Partial<
      import("../../variables/types").DynamicVariableAssetSearchQuery
    >,
  ) => void
  customMetadataFields: CustomMetadataFieldDefinition[] | undefined
}) {
  const [filters, setFilters] = useState<AssetFilter[]>(() =>
    filtersFromQuery(variable.assetQuery ?? {}),
  )

  const fieldOptions = useMemo(() => {
    const opts = [...STANDARD_FIELDS]
    if (customMetadataFields) {
      for (const f of customMetadataFields) {
        opts.push(`customMetadata.${f.name}`)
      }
    }
    return opts
  }, [customMetadataFields])

  const syncToQuery = (next: AssetFilter[]) => {
    setFilters(next)
    updateAssetQuery(variable.id, filtersToQuery(next))
  }

  const updateFilter = (idx: number, patch: Partial<AssetFilter>) => {
    const next = filters.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    syncToQuery(next)
  }

  const removeFilter = (idx: number) => {
    const next = filters.filter((_, i) => i !== idx)
    syncToQuery(next)
  }

  const addFilter = () => {
    syncToQuery([...filters, { field: "", op: "=", value: "" }])
  }

  const hasFilters = filters.length > 0

  return (
    <Box
      bg="editorGray.50"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="editorGray.200"
      p="5"
      mt="2"
    >
      <Text fontSize="sm" fontWeight="bold" color="editorGray.800">
        Locked asset filters
      </Text>
      <Text
        fontSize="xs"
        color="editorBattleshipGrey.400"
        mt="1"
        lineHeight="tall"
      >
        These Lucene filters are applied when resolving this variable. The CSV
        column value narrows the match further.
      </Text>

      {/* Empty state */}
      {!hasFilters && (
        <Text
          fontSize="sm"
          fontStyle="italic"
          color="editorBattleshipGrey.400"
          mt="4"
        >
          No locked filters — asset is matched by CSV value only.
        </Text>
      )}

      {/* Filter rows */}
      {hasFilters && (
        <Flex direction="column" gap="2" mt="4">
          {filters.map((filter, idx) => (
            <Flex key={`filter-${idx}`} gap="2" align="center">
              <Select
                value={filter.field}
                onChange={(e) => updateFilter(idx, { field: e.target.value })}
                fontSize="sm"
                flex={1}
                bg="white"
                placeholder="— select field —"
              >
                {fieldOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
              <Select
                value={filter.op}
                onChange={(e) => updateFilter(idx, { op: e.target.value })}
                fontSize="sm"
                w="80px"
                flexShrink={0}
                bg="white"
              >
                {OPERATOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <Input
                value={filter.value}
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                placeholder="value"
                fontSize="sm"
                flex={1}
                bg="white"
              />
              <IconButton
                aria-label="Remove filter"
                icon={<Icon as={PiX} boxSize={4} />}
                variant="ghost"
                size="sm"
                color="editorBattleshipGrey.400"
                onClick={() => removeFilter(idx)}
                _hover={{ color: "red.500" }}
              />
            </Flex>
          ))}
        </Flex>
      )}

      <Button
        leftIcon={<PiPlus />}
        variant="link"
        size="sm"
        mt="3"
        onClick={addFilter}
        color="blue.500"
        fontWeight="medium"
        _hover={{ textDecoration: "none", color: "blue.600" }}
      >
        Add filter
      </Button>

      {/* Preview bar */}
      {filters.some((f) => f.field && f.value) && (
        <Box
          mt="4"
          bg="editorGray.800"
          borderRadius="md"
          px="4"
          py="2.5"
          overflow="hidden"
        >
          <Flex align="center" gap="3">
            <Text
              fontSize="xs"
              fontWeight="bold"
              color="editorBattleshipGrey.300"
              textTransform="uppercase"
              letterSpacing="wider"
              flexShrink={0}
            >
              Preview
            </Text>
            <Text
              fontSize="sm"
              fontFamily="mono"
              color="white"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {filters
                .filter((f) => f.field && f.value)
                .map((f) => `${f.field}="${f.value}"`)
                .join(" AND ")}
            </Text>
          </Flex>
        </Box>
      )}
    </Box>
  )
}
