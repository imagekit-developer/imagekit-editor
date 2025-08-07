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
import { useMemo } from "react"
import { useEditorStore } from "../../store"

interface HeaderProps {
  onClose: () => void
  exportOptions?:
    | {
        label: string
        icon?: React.ReactElement
        onClick: (images: string[]) => void
      }
    | {
        label: string
        icon?: React.ReactElement
        options: Array<{
          label: string
          isVisible: boolean | ((images: string[]) => boolean)
          onClick: (images: string[]) => void
        }>
      }
}

export const Header = ({ onClose, exportOptions }: HeaderProps) => {
  const { imageList } = useEditorStore()

  const headerText = useMemo(() => {
    if (imageList.length === 1) {
      return imageList[0].split("/").pop()
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
      {exportOptions && (
        <>
          <Divider
            orientation="vertical"
            borderColor="editorBattleshipGrey.100"
          />
          {"options" in exportOptions ? (
            <Menu>
              <MenuButton>
                <Button
                  leftIcon={exportOptions.icon}
                  aria-label={exportOptions.label}
                  variant="ghost"
                  fontWeight="normal"
                  size="sm"
                >
                  {exportOptions.label}
                </Button>
              </MenuButton>
              <MenuList>
                {exportOptions.options
                  .filter((option) =>
                    typeof option.isVisible === "boolean"
                      ? option.isVisible
                      : option.isVisible(imageList),
                  )
                  .map((option) => (
                    <MenuItem
                      key={option.label}
                      onClick={() => option.onClick(imageList)}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
              </MenuList>
            </Menu>
          ) : (
            <Button
              leftIcon={exportOptions.icon}
              aria-label={exportOptions.label}
              onClick={() => exportOptions.onClick(imageList)}
              variant="ghost"
              fontWeight="normal"
              size="sm"
            >
              {exportOptions.label}
            </Button>
          )}
        </>
      )}
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
