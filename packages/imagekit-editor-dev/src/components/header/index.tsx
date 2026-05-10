import {
  Box,
  Divider,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  Text,
} from "@chakra-ui/react"
import { PiBracketsCurly } from "@react-icons/all-files/pi/PiBracketsCurly"
import { PiCaretRight } from "@react-icons/all-files/pi/PiCaretRight"
import { PiDownloadSimple } from "@react-icons/all-files/pi/PiDownloadSimple"
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
import { ActivePresetDropdown } from "./ActivePresetDropdown"
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

  const { imageList, originalImageList, currentImage } = useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const templateIsPrivate = useEditorStore((s) => s.templateIsPrivate)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const templateName = useEditorStore((s) => s.templateName)
  const templateVariables = useEditorStore((s) => s.templateVariables)
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

  const handleDownloadCsv = () => {
    if (!templateVariables.length) return
    const escapeLocal = (v: string) =>
      v.includes(",") || v.includes('"') || v.includes("\n")
        ? `"${v.replace(/"/g, '""')}"`
        : v
    const headers = [
      "",
      ...templateVariables.map((v) => escapeLocal(v.name)),
    ].join(",")
    const defaultRow = [
      "Default Value for Sample",
      ...templateVariables.map((v) => escapeLocal(v.defaultValue)),
    ].join(",")
    const blob = new Blob([[headers, defaultRow].join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      templateName ? `${templateName}-variables.csv` : "variables.csv",
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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

        {provider ? (
          <>
            {templateId && (
              <Icon
                as={PiCaretRight}
                boxSize={4}
                color="editorBattleshipGrey.500"
                mx="1"
              />
            )}
            <FlexAny
              alignItems="center"
              gap="2"
              px="4"
              py="2"
              borderRadius="md"
              _hover={{ bg: "gray.100" }}
              transition="background-color 0.15s"
            >
              {templateId && (
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
              )}
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

          <ActivePresetDropdown
            disabled={!templateId}
            presets={templatePresets}
            activePresetId={activeTemplatePresetId}
            activePresetName={activePreset?.name ?? "No preset"}
            onSelectPresetId={(next) => setActiveTemplatePresetId(next)}
            onManagePresets={() => setIsPresetsOpen(true)}
          />

          <Spacer />

          <DividerAny
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="50%"
          />

          <NavbarItem
            label="Download CSV"
            icon={<PiDownloadSimple />}
            onClick={handleDownloadCsv}
            disabled={!templateId || !templateVariables.length}
            _disabled={{
              cursor: "not-allowed",
              opacity: 0.5,
            }}
          />
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
