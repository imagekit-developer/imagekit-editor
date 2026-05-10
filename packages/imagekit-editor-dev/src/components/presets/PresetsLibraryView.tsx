import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { relativeTime } from "human-date"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePresetStorage } from "../../context/PresetStorageContext"
import type { PresetLayerType, PresetRecord } from "../../storage/presetTypes"

interface Props {
  onClose(): void
}

const LAYER_TABS: { key: PresetLayerType; label: string }[] = [
  { key: "layers-text", label: "Text" },
  { key: "layers-image", label: "Image" },
]

function formatRelativeTime(ts: number): string {
  if (Math.abs(Date.now() - ts) < 10 * 1000) return "Just now"
  return relativeTime(new Date(ts))
}

/**
 * Browse / manage view for presets. Two tabs (Text / Image) and per-row
 * delete. Apply is intentionally not available from here in v1 — presets are
 * applied from inside an open layer config sidebar.
 */
export function PresetsLibraryView({ onClose }: Props) {
  const provider = usePresetStorage()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<PresetLayerType>("layers-text")
  const [presets, setPresets] = useState<PresetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const currentUserId = useMemo(() => {
    if (!provider) return null
    const session = provider.getCurrentUserSession() as
      | { userId?: string }
      | null
      | undefined
    return session?.userId ?? null
  }, [provider])

  const fetchPresets = useCallback(async () => {
    if (!provider) return
    setLoading(true)
    try {
      const list = await provider.listPresets()
      setPresets(list)
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  const filtered = useMemo(
    () =>
      presets
        .filter((p) => p.layerType === activeTab)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [presets, activeTab],
  )

  const handleDelete = useCallback(
    async (preset: PresetRecord) => {
      if (!provider?.deletePreset) return
      setDeletingId(preset.id)
      try {
        await provider.deletePreset(preset.id)
        setPresets((prev) => prev.filter((p) => p.id !== preset.id))
        toast({
          title: "Preset deleted",
          status: "success",
          duration: 2000,
          isClosable: true,
        })
      } catch (err) {
        toast({
          title: "Could not delete preset",
          description: err instanceof Error ? err.message : String(err),
          status: "error",
          duration: 4000,
          isClosable: true,
        })
      } finally {
        setDeletingId(null)
      }
    },
    [provider, toast],
  )

  if (!provider) {
    return (
      <Flex p={6} direction="column" gap={4}>
        <Text fontSize="md" fontWeight="semibold">
          Presets
        </Text>
        <Text fontSize="sm" color="gray.600">
          Preset storage is not configured.
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction="column" h="full" minH={0}>
      <HStack px={6} py={3} justify="space-between">
        <Text fontSize="md" fontWeight="semibold">
          Presets
        </Text>
        <IconButton
          aria-label="Close presets"
          variant="ghost"
          size="sm"
          icon={<Icon as={PiX} />}
          onClick={onClose}
        />
      </HStack>
      <Tabs
        index={LAYER_TABS.findIndex((t) => t.key === activeTab)}
        onChange={(i) => setActiveTab(LAYER_TABS[i].key)}
        size="sm"
        colorScheme="blue"
      >
        <TabList px={6}>
          {LAYER_TABS.map((t) => (
            <Tab key={t.key} fontSize="sm">
              {t.label}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {LAYER_TABS.map((t) => (
            <TabPanel key={t.key} px={6} py={4}>
              {loading ? (
                <Flex justify="center" py={8}>
                  <Spinner size="md" />
                </Flex>
              ) : filtered.length === 0 ? (
                <VStack py={8} spacing={2} color="gray.500">
                  <Text fontSize="sm">
                    No {t.label.toLowerCase()} presets yet.
                  </Text>
                  <Text fontSize="xs">
                    Open a {t.label.toLowerCase()} layer in the editor and use
                    “Save as preset” to create one.
                  </Text>
                </VStack>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {filtered.map((preset) => {
                    const canDelete =
                      !!provider.deletePreset &&
                      (currentUserId === null ||
                        preset.createdBy.userId === currentUserId)
                    return (
                      <HStack
                        key={preset.id}
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        align="center"
                      >
                        <Avatar
                          name={preset.createdBy.name || preset.createdBy.email}
                          size="xs"
                        />
                        <Box flex="1 1 0" minW={0}>
                          <HStack spacing={2}>
                            <Text fontSize="sm" fontWeight="medium" isTruncated>
                              {preset.name}
                            </Text>
                            <Badge
                              size="xs"
                              variant="subtle"
                              colorScheme={preset.isPrivate ? "gray" : "blue"}
                            >
                              <HStack spacing={1}>
                                <Icon
                                  as={preset.isPrivate ? PiLock : PiGlobe}
                                  boxSize={3}
                                />
                                <Text fontSize="2xs">
                                  {preset.isPrivate ? "Private" : "Shared"}
                                </Text>
                              </HStack>
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {preset.createdBy.name || preset.createdBy.email}
                            {" · "}
                            {formatRelativeTime(preset.updatedAt)}
                          </Text>
                        </Box>
                        {canDelete ? (
                          <Tooltip label="Delete preset">
                            <IconButton
                              aria-label="Delete preset"
                              size="xs"
                              variant="ghost"
                              icon={<Icon as={PiTrash} />}
                              isLoading={deletingId === preset.id}
                              onClick={() => handleDelete(preset)}
                            />
                          </Tooltip>
                        ) : null}
                      </HStack>
                    )
                  })}
                </VStack>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
      <Flex
        mt="auto"
        px={6}
        py={3}
        borderTopWidth="1px"
        borderTopColor="gray.100"
        justify="flex-end"
      >
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </Flex>
    </Flex>
  )
}
