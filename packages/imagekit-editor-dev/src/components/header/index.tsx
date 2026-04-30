import {
  Divider,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
} from "@chakra-ui/react"
import { PiGear } from "@react-icons/all-files/pi/PiGear"
import { PiGlobe } from "@react-icons/all-files/pi/PiGlobe"
import { PiLock } from "@react-icons/all-files/pi/PiLock"
import { PiX } from "@react-icons/all-files/pi/PiX"
import React, { useEffect, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { applyTemplateStorageAccessFailure } from "../../storage/templateAccessError"
import type { TemplateRecord } from "../../storage/types"
import {
  type FileElement,
  type RequiredMetadata,
  useEditorStore,
} from "../../store"
import { chakraAny } from "../../utils"
import { NavbarItem } from "./NavbarItem"
import { SettingsModal } from "./SettingsModal"
import { TemplateNameInput } from "./TemplateNameInput"
import { TemplateStatus } from "./TemplateStatus"
import { TemplatesDropdown } from "./TemplatesDropdown"

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

  const { imageList, originalImageList, currentImage } = useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const templateIsPrivate = useEditorStore((s) => s.templateIsPrivate)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const provider = useTemplateStorage()

  const [activeRecord, setActiveRecord] = useState<TemplateRecord | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
        const { denyTemplateStorageAccess } = useEditorStore.getState()
        applyTemplateStorageAccessFailure(err, { denyTemplateStorageAccess })
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

  return (
    <FlexAny
      as="header"
      width="full"
      h="16"
      alignItems="center"
      flexDirection="row"
      px="1rem"
      paddingRight="0"
      borderBottomWidth="1px"
      borderBottomColor="editorBattleshipGrey.100"
      flexShrink={0}
    >
      {provider ? (
        <>
          <FlexAny alignItems="center" gap="2" px="4" height="full" ml="-4">
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
              />
            )}
            <TemplateNameInput />
          </FlexAny>
          <DividerAny
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="40%"
          />
          <NavbarItem
            label="Settings"
            icon={<PiGear />}
            variant="icon"
            onClick={() => setIsSettingsOpen(true)}
          />
          <DividerAny
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="40%"
          />
          <FlexAny alignItems="center">
            <TemplatesDropdown onViewAllTemplates={onViewAllTemplates} />
          </FlexAny>
          <DividerAny
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="40%"
          />
        </>
      ) : null}
      <FlexAny ml="6">
        <TemplateStatus />
      </FlexAny>
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
              height="40%"
            />
          ) : null}
        </React.Fragment>
      ))}
      <DividerAny
        orientation="vertical"
        borderColor="editorBattleshipGrey.200"
        height="40%"
      />
      <NavbarItem
        icon={<Icon boxSize={"5"} as={PiX} />}
        label="Close"
        onClick={onClose}
      />
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
          onDeleted={() => {
            useEditorStore.getState().resetToNewTemplate()
          }}
        />
      )}
    </FlexAny>
  )
}
