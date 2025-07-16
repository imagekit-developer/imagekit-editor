import { Button, Divider, Flex, Icon, Spacer, Text } from "@chakra-ui/react"
import { PiImageSquare } from "@react-icons/all-files/pi/PiImageSquare"
import { PiImagesSquare } from "@react-icons/all-files/pi/PiImagesSquare"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { useMemo } from "react"
import { useEditorStore } from "../../store"

interface HeaderProps {
  onClose: () => void
}

export const Header = ({ onClose }: HeaderProps) => {
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
      h="4.125rem"
      alignItems="center"
      flexDirection="row"
      px="1rem"
      borderBottomWidth="1px"
      borderBottomColor="appBattleshipGrey.100"
      gap="4"
      flexShrink={0}
    >
      <Icon
        boxSize={"5"}
        as={imageList.length === 1 ? PiImageSquare : PiImagesSquare}
      />
      <Text>{headerText}</Text>
      <Spacer />
      <Divider orientation="vertical" borderColor="appBattleshipGrey.100" />
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
