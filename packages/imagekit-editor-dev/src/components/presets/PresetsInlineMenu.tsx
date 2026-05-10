import {
  Button,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
} from "@chakra-ui/react"
import { PiBookmarksSimple } from "@react-icons/all-files/pi/PiBookmarksSimple"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { useCallback, useEffect, useState } from "react"
import { usePresetStorage } from "../../context/PresetStorageContext"
import type { PresetLayerType, PresetRecord } from "../../storage/presetTypes"

interface Props {
  layerType: PresetLayerType
  onPickPreset: (preset: PresetRecord) => void
  onClickSave: () => void
  onClickManage?: () => void
  /**
   * Increment this from the parent after saving a new preset to force the
   * inline list to refresh.
   */
  refreshKey?: number
}

/**
 * Inline menu rendered at the top of the layer config sidebar for
 * `layers-text` / `layers-image`. Lists presets for the current layer type
 * and exposes "Save as preset" / "Manage…".
 *
 * Renders nothing if no `PresetStorageProvider` is wired through context.
 */
export function PresetsInlineMenu({
  layerType,
  onPickPreset,
  onClickSave,
  onClickManage,
  refreshKey,
}: Props) {
  const provider = usePresetStorage()
  const [presets, setPresets] = useState<PresetRecord[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [opened, setOpened] = useState(false)

  const fetchPresets = useCallback(async () => {
    if (!provider) return
    setLoading(true)
    try {
      const list = await provider.listPresets(layerType)
      setPresets(list)
    } catch {
      setPresets([])
    } finally {
      setLoading(false)
    }
  }, [provider, layerType])

  // Refresh when opened, when the layer type changes, or when the parent
  // requests a refresh (e.g. after saving a new preset).
  useEffect(() => {
    if (opened) fetchPresets()
  }, [opened, fetchPresets])

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear cached list when the layer type or refresh signal changes
  useEffect(() => {
    setPresets(null)
  }, [layerType, refreshKey])

  if (!provider) return null

  return (
    <HStack px="4" pt="3" pb="0" gap="2" borderBottomWidth="0" align="center">
      <Menu
        isLazy
        placement="bottom-start"
        onOpen={() => setOpened(true)}
        onClose={() => setOpened(false)}
      >
        <MenuButton
          as={Button}
          size="xs"
          variant="outline"
          leftIcon={<Icon as={PiBookmarksSimple} />}
          rightIcon={<Icon as={PiCaretDown} />}
        >
          Presets
        </MenuButton>
        <MenuList maxH="320px" overflowY="auto" minW="240px">
          {loading ? (
            <HStack px={3} py={2} spacing={2}>
              <Spinner size="xs" />
              <Text fontSize="sm" color="gray.500">
                Loading…
              </Text>
            </HStack>
          ) : presets && presets.length > 0 ? (
            presets.map((preset) => (
              <MenuItem
                key={preset.id}
                fontSize="sm"
                onClick={() => onPickPreset(preset)}
              >
                {preset.name}
              </MenuItem>
            ))
          ) : (
            <Text px={3} py={2} fontSize="sm" color="gray.500">
              No presets yet
            </Text>
          )}
          {onClickManage ? (
            <>
              <MenuDivider />
              <MenuItem fontSize="sm" onClick={onClickManage}>
                Manage presets…
              </MenuItem>
            </>
          ) : null}
        </MenuList>
      </Menu>
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<Icon as={PiPlus} />}
        onClick={onClickSave}
      >
        Save as preset
      </Button>
    </HStack>
  )
}
