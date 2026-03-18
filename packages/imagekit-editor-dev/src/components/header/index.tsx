import {
  Button,
  Divider,
  Flex,
  Icon,
  IconButton,
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
  const provider = useTemplateStorage()

  const [isPrivate, setIsPrivate] = useState<boolean | null>(null)

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
            borderColor="editorBattleshipGrey.100"
          />
          <IconButton
            aria-label="Settings"
            icon={<Icon as={PiGear} boxSize={6} />}
            variant="ghost"
            height="full"
            width="20"
            borderRadius="0"
            size="md"
            color="editorBattleshipGrey.500"
          />
          <Divider
            orientation="vertical"
            borderColor="editorBattleshipGrey.100"
          />
          <Flex alignItems="center" height="full">
            <TemplatesDropdown onViewAllTemplates={onViewAllTemplates} />
          </Flex>
          <Divider
            orientation="vertical"
            borderColor="editorBattleshipGrey.100"
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
            <Divider
              orientation="vertical"
              borderColor="editorBattleshipGrey.100"
            />
            {exportOption.type === "button" ? (
              <Button
                key={`export-button-${exportOption.label}`}
                leftIcon={exportOption.icon}
                aria-label={exportOption.label}
                variant="ghost"
                fontWeight="normal"
                height="full"
                borderRadius="0"
                px="8"
                size="sm"
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
              >
                {exportOption.label}
              </Button>
            ) : (
              <Menu key={`export-menu-${exportOption.label}`}>
                <MenuButton
                  as={Button}
                  leftIcon={exportOption.icon}
                  aria-label={exportOption.label}
                  variant="ghost"
                  fontWeight="normal"
                  height="full"
                  borderRadius="0"
                  px="8"
                  size="sm"
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
      <Divider orientation="vertical" borderColor="editorBattleshipGrey.100" />
      <Button
        leftIcon={<Icon boxSize={"5"} as={PiX} />}
        aria-label="Close Button"
        onClick={onClose}
        variant="ghost"
        fontWeight="normal"
        height="full"
        borderRadius="0"
        px="8"
        size="sm"
      >
        Close
      </Button>
    </Flex>
  )
}
