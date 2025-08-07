import { Flex, type FlexProps } from "@chakra-ui/react"

interface SidebarHeaderProps extends FlexProps {}

export const SidebarHeader = (
  props: React.PropsWithChildren<SidebarHeaderProps>,
) => {
  const { children, ...rest } = props

  return (
    <Flex
      h="16"
      py="4"
      px="4"
      gap="2"
      alignItems="center"
      borderBottom="1px"
      borderBottomColor="editorBattleshipGrey.100"
      {...rest}
    >
      {children}
    </Flex>
  )
}
