import {
  Box,
  Button,
  Flex,
  Icon,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Text,
  useDisclosure,
} from "@chakra-ui/react"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiSquaresFourLight } from "@react-icons/all-files/pi/PiSquaresFourLight"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"
import { chakraAny, formatTemplateNameForUI } from "../../utils"

const PopoverContentAny = chakraAny(PopoverContent)
const PopoverBodyAny = chakraAny(PopoverBody)
const BoxAny = chakraAny(Box)
const TextAny = chakraAny(Text)
const FlexAny = chakraAny(Flex)
const ButtonAny = chakraAny(Button)
const IconAny = chakraAny(Icon)
const SpinnerAny = chakraAny(Spinner)

export interface OverlayDropdownProps {
  /** Called when the user clicks "Add new" in the dropdown. */
  onAddNew?: () => void
}

export const OverlayDropdown: React.FC<OverlayDropdownProps> = ({
  onAddNew,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const provider = useTemplateStorage()
  const {
    _setOverlayMode,
    _setSidebarState,
    _setSelectedTransformationKey,
    _setTransformationToEdit,
    loadTemplate,
    hydrateTemplateMetadata,
    resetToNewTemplate,
  } = useEditorStore()
  const syncStatus = useEditorStore((s) => s.syncStatus)

  const [overlays, setOverlays] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOverlays = useCallback(async () => {
    if (!provider) return
    setLoading(true)
    try {
      const list = await provider.listTemplates()
      setOverlays(list.filter((t) => t.kind === "overlay"))
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    if (isOpen) fetchOverlays()
  }, [isOpen, fetchOverlays])

  useEffect(() => {
    // Refresh after a successful save so a freshly saved overlay shows up.
    if (syncStatus === "saved" && isOpen) fetchOverlays()
  }, [syncStatus, isOpen, fetchOverlays])

  const handleAddNew = () => {
    onClose()
    // Start a fresh overlay: clear any previously loaded overlay/template
    // (transformations + template metadata) so the preview/sidebar are blank.
    resetToNewTemplate()
    _setOverlayMode(true)
    _setSelectedTransformationKey(null)
    _setTransformationToEdit(null)
    _setSidebarState("type")
    onAddNew?.()
  }

  const handleSelectOverlay = (record: TemplateRecord) => {
    // Open the saved overlay: switch to overlay mode and load its single layer
    // as the current transformation stack so the preview renders the overlay.
    loadTemplate(record.transformations)
    hydrateTemplateMetadata({
      templateId: record.id,
      templateName: record.name,
      templateIsPrivate: record.isPrivate,
    })
    _setOverlayMode(true)
    _setSelectedTransformationKey(null)
    _setTransformationToEdit(null)
    _setSidebarState("none")
    onClose()
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      placement="bottom-start"
      isLazy
    >
      <PopoverTrigger>
        <BoxAny
          as="button"
          display="inline-flex"
          alignItems="center"
          gap="2"
          cursor="pointer"
          borderRadius="md"
          paddingX="4"
          paddingY="2"
          height="10"
          _hover={{ bg: "gray.100" }}
          transition="background-color 0.15s"
          aria-label="Open overlays dropdown"
        >
          <Icon
            as={PiSquaresFourLight}
            boxSize={5}
            color="editorBattleshipGrey.600"
          />
          <TextAny
            fontSize="sm"
            fontWeight="medium"
            color="editorBattleshipGrey.700"
          >
            Overlays
          </TextAny>
          <Icon
            as={PiCaretDown}
            boxSize={4}
            color="editorBattleshipGrey.600"
          />
        </BoxAny>
      </PopoverTrigger>
      <PopoverContentAny
        width="md"
        shadow="lg"
        p="0"
        overflow="hidden"
        borderWidth="0"
        outline="none"
        _focus={{
          boxShadow: "lg",
          outline: "none",
          borderColor: "transparent",
        }}
      >
        <PopoverBodyAny p="0">
          <FlexAny
            px="4"
            py="3"
            gap="3"
            alignItems="center"
            justifyContent="space-between"
            borderBottomWidth="1px"
            borderColor="editorGray.300"
          >
            <TextAny
              fontSize="sm"
              fontWeight="medium"
              color="editorBattleshipGrey.700"
            >
              Overlays
            </TextAny>
            <ButtonAny
              size="sm"
              variant="ghost"
              leftIcon={<IconAny as={PiPlus} boxSize={4} />}
              px="4"
              flexShrink={0}
              fontWeight="normal"
              onClick={handleAddNew}
            >
              Add new
            </ButtonAny>
          </FlexAny>
          {loading ? (
            <FlexAny
              px="4"
              py="8"
              justifyContent="center"
              alignItems="center"
            >
              <SpinnerAny size="sm" color="editorBattleshipGrey.500" />
            </FlexAny>
          ) : overlays.length === 0 ? (
            <FlexAny
              px="4"
              py="8"
              justifyContent="center"
              alignItems="center"
            >
              <TextAny fontSize="sm" color="editorBattleshipGrey.500">
                No overlays yet
              </TextAny>
            </FlexAny>
          ) : (
            <BoxAny maxH="80" overflowY="auto" py="1">
              {overlays.map((record) => (
                <FlexAny
                  key={record.id}
                  px="4"
                  py="2"
                  cursor="pointer"
                  alignItems="center"
                  gap="3"
                  bg="transparent"
                  _hover={{ bg: "editorGray.100" }}
                  onClick={() => handleSelectOverlay(record)}
                  data-testid={`overlays-dropdown-row-${record.id}`}
                >
                  <TextAny
                    flex="1"
                    minW={0}
                    fontSize="sm"
                    fontWeight="medium"
                    isTruncated
                    color="editorBattleshipGrey.800"
                  >
                    {formatTemplateNameForUI(record.name)}
                  </TextAny>
                </FlexAny>
              ))}
            </BoxAny>
          )}
        </PopoverBodyAny>
      </PopoverContentAny>
    </Popover>
  )
}
