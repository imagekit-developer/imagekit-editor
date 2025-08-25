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
import { useEditorStore } from "../../store"

interface ExportOptionButton {
  type: "button"
  label: string
  icon?: React.ReactElement
  isVisible: boolean | ((images: string[]) => boolean)
  onClick: (images: string[]) => void
}

interface ExportOptionMenu {
  type: "menu"
  label: string
  icon?: React.ReactElement
  isVisible: boolean | ((images: string[]) => boolean)
  options: Array<Omit<ExportOptionButton, "type">>
}

export interface HeaderProps {
  onClose: () => void
  exportOptions?: Array<ExportOptionButton | ExportOptionMenu>
}

export const Header = ({ onClose, exportOptions }: HeaderProps) => {
  const { imageList } = useEditorStore()

  const headerText = useMemo(() => {
    if (imageList.length === 1) {
      return decodeURIComponent(
        imageList[0].split("/").pop()?.split("?")?.[0] || "",
      )
    }
    return `${imageList.length} Images`
  }, [imageList])

  return (
    <Flex
      as="header"
      width="full"
      h="16"
      alignItems="center"
      flexDirection="row"
      px="1rem"
      borderBottomWidth="1px"
      borderBottomColor="editorBattleshipGrey.100"
      gap="4"
      flexShrink={0}
    >
      <Icon
        boxSize={"5"}
        as={imageList.length === 1 ? PiImageSquare : PiImagesSquare}
      />
      <Text>{headerText}</Text>
      <Spacer />
      {exportOptions
        ?.filter((exportOption) =>
          typeof exportOption.isVisible === "boolean"
            ? exportOption.isVisible
            : exportOption.isVisible(imageList),
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
                size="sm"
                onClick={() => exportOption.onClick(imageList)}
              >
                {exportOption.label}
              </Button>
            ) : (
              <Menu key={`export-menu-${exportOption.label}`}>
                <MenuButton>
                  <Button
                    leftIcon={exportOption.icon}
                    aria-label={exportOption.label}
                    variant="ghost"
                    fontWeight="normal"
                    size="sm"
                  >
                    {exportOption.label}
                  </Button>
                </MenuButton>
                <MenuList>
                  {exportOption.options
                    .filter((option) =>
                      typeof option.isVisible === "boolean"
                        ? option.isVisible
                        : option.isVisible(imageList),
                    )
                    .map((option) => (
                      <MenuItem
                        key={`export-menu-option-${option.label}`}
                        onClick={() => option.onClick(imageList)}
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
        size="sm"
      >
        Close
      </Button>
    </Flex>
  )
}
