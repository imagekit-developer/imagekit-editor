import {
  Button,
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
import { PiImageSquare } from "@react-icons/all-files/pi/PiImageSquare"
import { PiImagesSquare } from "@react-icons/all-files/pi/PiImagesSquare"
import { PiX } from "@react-icons/all-files/pi/PiX"
import React, { useMemo } from "react"
import {
  type FileElement,
  type RequiredMetadata,
  useEditorStore,
} from "../../store"

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
}

export const Header = ({ onClose, exportOptions }: HeaderProps) => {
  const { imageList, originalImageList, currentImage } = useEditorStore()

  const headerText = useMemo(() => {
    if (imageList.length === 1) {
      return decodeURIComponent(
        currentImage?.split("/").pop()?.split("?")?.[0] || "",
      )
    }
    return `${imageList.length} Images`
  }, [imageList, currentImage])

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
      <Icon
        boxSize={"5"}
        mr="4"
        as={imageList.length === 1 ? PiImageSquare : PiImagesSquare}
      />
      <Text>{headerText}</Text>
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
