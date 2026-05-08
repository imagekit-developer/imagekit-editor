import {
  Box,
  Divider,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spacer,
  Text,
  useDisclosure,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiCaretRight } from "@react-icons/all-files/pi/PiCaretRight"
import { PiCheck } from "@react-icons/all-files/pi/PiCheck"
import { PiGear } from "@react-icons/all-files/pi/PiGear"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiStack } from "@react-icons/all-files/pi/PiStack"
import { PiX } from "@react-icons/all-files/pi/PiX"
import React, { useEffect, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import ikLightIconRounded from "../../static/ik-light-icon_rounded.svg"
import { applyTemplateStorageAccessFailure } from "../../storage/templateAccessError"
import type { TemplateRecord } from "../../storage/types"
import {
  type FileElement,
  type RequiredMetadata,
  useEditorStore,
} from "../../store"
import { chakraAny } from "../../utils"
import { NavbarItem } from "./NavbarItem"
import { PresetsModal } from "./PresetsModal"
import { SettingsModal } from "./SettingsModal"
import { TemplateNameInput } from "./TemplateNameInput"
import { TemplateStatus } from "./TemplateStatus"
import { TemplatesDropdown } from "./TemplatesDropdown"
import { VariablesModal } from "./VariablesModal"

interface ExportOptionButton<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  type: "button"
  label: string
  icon?: React.ReactElement
  isVisible: boolean | ((images: string[], currentImage?: string) => boolean)
  onClick: (
    images: { url: string; file: FileElement<Metadata> }[],
    currentImage?: { url: string; file: FileElement<Metadata> },
  ) => void
}

interface ExportOptionMenu<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  type: "menu"
  label: string
  icon?: React.ReactElement
  isVisible: boolean | ((images: string[], currentImage?: string) => boolean)
  options: Array<Omit<ExportOptionButton<Metadata>, "type">>
}

export interface HeaderProps<
  Metadata extends RequiredMetadata = RequiredMetadata,
> {
  onClose: () => void
  exportOptions?: Array<
    ExportOptionButton<Metadata> | ExportOptionMenu<Metadata>
  >
  onViewAllTemplates?: () => void
}

export const Header = ({
  onClose,
  exportOptions,
  onViewAllTemplates,
}: HeaderProps): React.ReactElement => {
  const FlexAny = chakraAny(Flex)
  const DividerAny = chakraAny(Divider)
  const MenuButtonAny = chakraAny(MenuButton)
  const MenuListAny = chakraAny(MenuList)
  const MenuItemAny = chakraAny(MenuItem)
  const BoxAny = chakraAny(Box)
  const TextAny = chakraAny(Text)
  const PopoverContentAny = chakraAny(PopoverContent)
  const PopoverBodyAny = chakraAny(PopoverBody)

  const { imageList, originalImageList, currentImage } = useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const templateIsPrivate = useEditorStore((s) => s.templateIsPrivate)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const templateName = useEditorStore((s) => s.templateName)
  const templatePresets = useEditorStore((s) => s.templatePresets)
  const activeTemplatePresetId = useEditorStore((s) => s.activeTemplatePresetId)
  const setActiveTemplatePresetId = useEditorStore(
    (s) => s.setActiveTemplatePresetId,
  )
  const provider = useTemplateStorage()

  const [activeRecord, setActiveRecord] = useState<TemplateRecord | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isVariablesOpen, setIsVariablesOpen] = useState(false)
  const [isPresetsOpen, setIsPresetsOpen] = useState(false)
  const presetDd = useDisclosure()

  // Fetch the active template record whenever templateId changes or after a save.
  // biome-ignore lint/correctness/useExhaustiveDependencies: syncStatus intentionally triggers a refetch after saves
  useEffect(() => {
    let cancelled = false

    if (!provider || !templateId) {
      setActiveRecord(null)
      return
    }

    provider
      .getTemplate(templateId)
      .then((record) => {
        if (cancelled) return
        setActiveRecord(record ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        const { denyTemplateStorageAccessAndReset } = useEditorStore.getState()
        applyTemplateStorageAccessFailure(err, {
          denyTemplateStorageAccessAndReset,
        })
        setActiveRecord(null)
      })

    return () => {
      cancelled = true
    }
  }, [provider, templateId, syncStatus])

  const visibleExportOptions =
    exportOptions?.filter((exportOption) =>
      typeof exportOption.isVisible === "boolean"
        ? exportOption.isVisible
        : exportOption.isVisible(imageList, currentImage),
    ) ?? []

  const activePreset = activeTemplatePresetId
    ? (templatePresets.find((p) => p.id === activeTemplatePresetId) ?? null)
    : null

  const headerRowHeight = 12

  return (
    <FlexAny
      as="header"
      width="full"
      alignItems="stretch"
      flexDirection="column"
      borderBottomWidth="1px"
      borderBottomColor="editorBattleshipGrey.100"
      flexShrink={0}
    >
      {/* Row 1: App bar (templates + status + global actions) */}
      <FlexAny
        alignItems="center"
        px="1rem"
        paddingRight="0"
        h={headerRowHeight}
        bg="editorGray.50"
        gap="2"
        borderBottomWidth="1px"
        borderBottomColor="editorBattleshipGrey.100"
      >
        <BoxAny
          as="img"
          src={ikLightIconRounded}
          alt="ImageKit"
          width="22px"
          height="22px"
          flexShrink={0}
          borderRadius="5px"
        />
        <DividerAny
          orientation="vertical"
          borderColor="editorBattleshipGrey.200"
          height="50%"
        />

        {provider ? (
          <FlexAny alignItems="center">
            <TemplatesDropdown onViewAllTemplates={onViewAllTemplates} />
          </FlexAny>
        ) : null}

        {provider && templateId ? (
          <>
            <Icon
              as={PiCaretRight}
              boxSize={4}
              color="editorBattleshipGrey.500"
              mx="1"
            />
            <FlexAny
              alignItems="center"
              gap="2"
              px="4"
              py="2"
              borderRadius="md"
              _hover={{ bg: "gray.100" }}
              transition="background-color 0.15s"
            >
              <Icon
                as={
                  // Prefer the editor store for the active template visibility; it updates immediately after save.
                  templateIsPrivate !== null
                    ? templateIsPrivate === false
                      ? PiGlobe
                      : PiLock
                    : activeRecord?.isPrivate === false
                      ? PiGlobe
                      : PiLock
                }
                boxSize={5}
                color="editorBattleshipGrey.500"
                flexShrink={0}
              />
              <TemplateNameInput />
            </FlexAny>

            <DividerAny
              orientation="vertical"
              borderColor="editorBattleshipGrey.200"
              height="50%"
              mx="2"
            />

            <TemplateStatus />
          </>
        ) : (
          <FlexAny ml="2">
            <TemplateStatus />
          </FlexAny>
        )}

        <Spacer />

        {visibleExportOptions.map((exportOption, exportOptionIndex) => (
          <React.Fragment key={`export-option-${exportOption.label}`}>
            {exportOption.type === "button" ? (
              <NavbarItem
                key={`export-button-${exportOption.label}`}
                icon={exportOption.icon}
                label={exportOption.label}
                onClick={() => {
                  const images = imageList.map((image, index) => ({
                    url: image,
                    file: originalImageList[index],
                  }))
                  const cImage = images.find(
                    (image) => image.url === currentImage,
                  )
                  exportOption.onClick(images, {
                    // biome-ignore lint/style/noNonNullAssertion: <required here>
                    url: cImage!.url,
                    // biome-ignore lint/style/noNonNullAssertion: <required here>
                    file: cImage!.file,
                  })
                }}
              />
            ) : (
              <Menu
                key={`export-menu-${exportOption.label}`}
                placement="bottom-end"
                strategy="fixed"
              >
                <MenuButtonAny
                  as={NavbarItem}
                  icon={exportOption.icon}
                  label={exportOption.label}
                >
                  {exportOption.label}
                </MenuButtonAny>
                <MenuListAny>
                  {exportOption.options
                    .filter((option) =>
                      typeof option.isVisible === "boolean"
                        ? option.isVisible
                        : option.isVisible(imageList, currentImage),
                    )
                    .map((option) => (
                      <MenuItemAny
                        key={`export-menu-option-${option.label}`}
                        onClick={() => {
                          const images = imageList.map((image, index) => ({
                            url: image,
                            file: originalImageList[index],
                          }))
                          const cImage = images.find(
                            (image) => image.url === currentImage,
                          )
                          option.onClick(images, {
                            // biome-ignore lint/style/noNonNullAssertion: <required here>
                            url: cImage!.url,
                            // biome-ignore lint/style/noNonNullAssertion: <required here>
                            file: cImage!.file,
                          })
                        }}
                      >
                        {option.label}
                      </MenuItemAny>
                    ))}
                </MenuListAny>
              </Menu>
            )}
            {exportOptionIndex < visibleExportOptions.length - 1 ? (
              <DividerAny
                orientation="vertical"
                borderColor="editorBattleshipGrey.200"
                height="50%"
              />
            ) : null}
          </React.Fragment>
        ))}

        <DividerAny
          orientation="vertical"
          borderColor="editorBattleshipGrey.200"
          height="50%"
        />
        <NavbarItem
          icon={<Icon boxSize={"5"} as={PiX} />}
          label="Close"
          onClick={onClose}
        />
      </FlexAny>

      {/* Row 2: Template context bar (name + settings + variables/presets/preset pill) */}
      {provider ? (
        <FlexAny
          alignItems="center"
          px="1rem"
          paddingRight="0"
          h={headerRowHeight + 2}
          bg="white"
          gap="2"
        >
          <NavbarItem
            label="Settings"
            icon={<Icon as={PiGear} boxSize={4} />}
            onClick={() => {
              if (!templateId) return
              setIsSettingsOpen(true)
            }}
            disabled={!templateId}
            _disabled={{
              cursor: "not-allowed",
              opacity: 0.5,
            }}
          />

          <DividerAny
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="50%"
          />

          <NavbarItem
            label="Variables"
            icon={<PiBracketsCurly />}
            onClick={() => {
              if (!templateId) return
              setIsVariablesOpen(true)
            }}
            disabled={!templateId}
            _disabled={{
              cursor: "not-allowed",
              opacity: 0.5,
            }}
          />

          <DividerAny
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="50%"
          />

          <NavbarItem
            label="Presets"
            icon={<PiStack />}
            onClick={() => {
              if (!templateId) return
              setIsPresetsOpen(true)
            }}
            disabled={!templateId}
            _disabled={{
              cursor: "not-allowed",
              opacity: 0.5,
            }}
          />

          <DividerAny
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="50%"
          />

          <Popover
            placement="bottom-start"
            isLazy
            isOpen={presetDd.isOpen}
            onOpen={presetDd.onOpen}
            onClose={presetDd.onClose}
          >
            <PopoverTrigger>
              <BoxAny
                as="button"
                type="button"
                display="inline-flex"
                alignItems="center"
                gap="2"
                borderRadius="full"
                px="4"
                py="2"
                mx="2"
                fontSize="sm"
                fontWeight="medium"
                bg={activePreset ? "green.50" : "editorGray.100"}
                color={activePreset ? "green.700" : "editorBattleshipGrey.700"}
                borderWidth="1px"
                borderColor={
                  activePreset ? "green.200" : "editorBattleshipGrey.200"
                }
                cursor={!templateId ? "not-allowed" : "pointer"}
                userSelect="none"
                disabled={!templateId}
                opacity={!templateId ? 0.5 : undefined}
                pointerEvents={!templateId ? "none" : "auto"}
                _hover={!templateId ? undefined : { opacity: 0.9 }}
                _focus={{ outline: "none", boxShadow: "none" }}
                _focusVisible={{ outline: "none", boxShadow: "none" }}
                aria-label="Select active preset"
              >
                <BoxAny
                  width="6px"
                  height="6px"
                  borderRadius="full"
                  bg={activePreset ? "green.500" : "editorBattleshipGrey.300"}
                  flexShrink={0}
                />
                <TextAny lineHeight="1">
                  {activePreset?.name ?? "No preset"}
                </TextAny>
                <Icon as={PiCaretDown} boxSize={4} opacity={0.7} />
              </BoxAny>
            </PopoverTrigger>
            <PopoverContentAny
              width="260px"
              shadow="lg"
              p="0"
              overflow="hidden"
              borderWidth="1px"
              borderColor="editorGray.300"
              borderRadius="xl"
            >
              <PopoverBodyAny p="0">
                <BoxAny
                  px="4"
                  py="2.5"
                  fontSize="xs"
                  fontWeight="semibold"
                  color="editorGray.500"
                  textTransform="uppercase"
                  letterSpacing="0.04em"
                  bg="editorGray.50"
                  borderBottomWidth="1px"
                  borderColor="editorGray.300"
                >
                  Preview preset
                </BoxAny>

                <BoxAny maxH="260px" overflowY="auto">
                  <BoxAny
                    as="button"
                    type="button"
                    width="full"
                    textAlign="left"
                    px="4"
                    py="3"
                    display="flex"
                    alignItems="center"
                    gap="3"
                    bg={
                      activeTemplatePresetId == null
                        ? "editorGray.100"
                        : "white"
                    }
                    _hover={{ bg: "editorGray.50" }}
                    onClick={() => {
                      setActiveTemplatePresetId(null)
                      presetDd.onClose()
                    }}
                  >
                    <BoxAny
                      width="18px"
                      display="flex"
                      justifyContent="center"
                      opacity={activeTemplatePresetId == null ? 1 : 0}
                    >
                      <Icon as={PiCheck} boxSize={4} color="editorGray.700" />
                    </BoxAny>
                    <TextAny fontSize="sm" color="editorGray.800" flex="1">
                      No preset
                    </TextAny>
                  </BoxAny>

                  {templatePresets.map((p) => (
                    <BoxAny
                      key={p.id}
                      as="button"
                      type="button"
                      width="full"
                      textAlign="left"
                      px="4"
                      py="3"
                      display="flex"
                      alignItems="center"
                      gap="3"
                      bg={
                        p.id === activeTemplatePresetId ? "green.50" : "white"
                      }
                      _hover={{ bg: "editorGray.50" }}
                      onClick={() => {
                        setActiveTemplatePresetId(p.id)
                        presetDd.onClose()
                      }}
                    >
                      <BoxAny
                        width="18px"
                        display="flex"
                        justifyContent="center"
                        opacity={p.id === activeTemplatePresetId ? 1 : 0}
                      >
                        <Icon as={PiCheck} boxSize={4} color="green.600" />
                      </BoxAny>
                      <TextAny
                        fontSize="sm"
                        color={
                          p.id === activeTemplatePresetId
                            ? "green.700"
                            : "editorGray.800"
                        }
                        flex="1"
                        isTruncated
                      >
                        {p.name}
                      </TextAny>
                    </BoxAny>
                  ))}
                </BoxAny>

                <BoxAny
                  px="4"
                  py="3"
                  borderTopWidth="1px"
                  borderColor="editorGray.300"
                  bg="white"
                >
                  <BoxAny
                    as="button"
                    type="button"
                    display="inline-flex"
                    alignItems="center"
                    gap="2"
                    fontSize="sm"
                    color="editorGray.700"
                    _hover={{ color: "editorGray.900" }}
                    onClick={() => {
                      presetDd.onClose()
                      setIsPresetsOpen(true)
                    }}
                  >
                    <Icon as={PiStack} boxSize={4} />
                    Manage presets
                  </BoxAny>
                </BoxAny>
              </PopoverBodyAny>
            </PopoverContentAny>
          </Popover>

          <Spacer />
        </FlexAny>
      ) : null}

      {isSettingsOpen && activeRecord && (
        <SettingsModal
          key={activeRecord.id}
          data={activeRecord}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={(updated) => {
            setActiveRecord(updated)
            useEditorStore.getState().hydrateTemplateMetadata({
              templateId: updated.id,
              templateName: updated.name,
              templateIsPrivate: updated.isPrivate,
            })
          }}
          onDeleteRequested={async (id) => {
            if (!provider?.deleteTemplate) return
            await provider.deleteTemplate(id)
            useEditorStore.getState().resetToNewTemplate()
          }}
        />
      )}

      {isVariablesOpen && (
        <VariablesModal
          onClose={() => {
            setIsVariablesOpen(false)
          }}
        />
      )}

      {isPresetsOpen && (
        <PresetsModal
          onClose={() => {
            setIsPresetsOpen(false)
          }}
        />
      )}
    </FlexAny>
  )
}
