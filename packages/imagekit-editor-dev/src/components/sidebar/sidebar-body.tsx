import { Flex, type FlexProps } from "@chakra-ui/react"

interface SidebarBodyProps extends FlexProps {}

export const SidebarBody = (
  props: React.PropsWithChildren<SidebarBodyProps>,
) => {
  const { children, ...rest } = props

  return (
    <Flex {...rest} direction="column" overflowY="auto" minH="0" flex="1 1 0">
      {children}
    </Flex>
  )
}
