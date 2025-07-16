import { Flex, type FlexProps } from "@chakra-ui/react"
import type { PropsWithChildren } from "react"

interface SidebarFooterProps extends FlexProps {}

export const SidebarFooter = (props: PropsWithChildren<SidebarFooterProps>) => {
  const { children, ...rest } = props

  return (
    <Flex
      {...rest}
      direction="column"
      p={2}
      borderTop="1px"
      borderTopColor="gray.200"
      mt="auto"
      bg="white"
    >
      {children}
    </Flex>
  )
}
