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
import {
  type FileElement,
  type RequiredMetadata,
  useEditorStore,
} from "../../store"
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
}: HeaderProps) => {
  const { imageList, originalImageList, currentImage } = useEditorStore()
  const templateId = useEditorStore((s) => s.templateId)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const provider = useTemplateStorage()

  const [isPrivate, setIsPrivate] = useState<boolean | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!provider || !templateId) {
      setIsPrivate(null)
      return
    }

    provider
      .getTemplate(templateId)
      .then((record) => {
        if (cancelled) return
        setIsPrivate(record ? record.isPrivate : null)
      })
      .catch(() => {
        if (cancelled) return
        setIsPrivate(null)
      })

    return () => {
      cancelled = true
    }
  }, [provider, templateId])

  // Refetch template visibility when it's saved
  useEffect(() => {
    let cancelled = false

    if (!provider || !templateId || syncStatus !== "saved") {
      return
    }

    provider
      .getTemplate(templateId)
      .then((record) => {
        if (cancelled) return
        setIsPrivate(record ? record.isPrivate : null)
      })
      .catch(() => {
        if (cancelled) return
        setIsPrivate(null)
      })

    return () => {
      cancelled = true
    }
  }, [provider, templateId, syncStatus])

  return (
    <Flex
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
          <Flex alignItems="center" gap="2" px="4" height="full" ml="-4">
            {templateId && (
              <Icon
                as={isPrivate === false ? PiGlobe : PiLock}
                boxSize={5}
                color="editorBattleshipGrey.500"
              />
            )}
            <TemplateNameInput />
          </Flex>
          <Divider
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
          <Divider
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="40%"
          />
          <Flex alignItems="center">
            <TemplatesDropdown onViewAllTemplates={onViewAllTemplates} />
          </Flex>
          <Divider
            orientation="vertical"
            borderColor="editorBattleshipGrey.200"
            height="40%"
          />
        </>
      ) : null}
      <Flex ml="6">
        <TemplateStatus />
      </Flex>
      <Spacer />
      {exportOptions
        ?.filter((exportOption) =>
          typeof exportOption.isVisible === "boolean"
            ? exportOption.isVisible
            : exportOption.isVisible(imageList, currentImage),
        )
        .map((exportOption) => (
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
              <Menu key={`export-menu-${exportOption.label}`}>
                <MenuButton
                  as={NavbarItem}
                  icon={exportOption.icon}
                  label={exportOption.label}
                >
                  {exportOption.label}
                </MenuButton>
                <MenuList>
                  {exportOption.options
                    .filter((option) =>
                      typeof option.isVisible === "boolean"
                        ? option.isVisible
                        : option.isVisible(imageList, currentImage),
                    )
                    .map((option) => (
                      <MenuItem
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
                      </MenuItem>
                    ))}
                </MenuList>
              </Menu>
            )}
          </React.Fragment>
        ))}
      <Divider
        orientation="vertical"
        borderColor="editorBattleshipGrey.200"
        height="40%"
      />
      <NavbarItem
        icon={<Icon boxSize={"5"} as={PiX} />}
        label="Close"
        onClick={onClose}
      />
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </Flex>
  )
}
