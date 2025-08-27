import { Flex, type FlexProps } from "@chakra-ui/react"
import type { PropsWithChildren } from "react"

interface SidebarRootProps extends FlexProps {}

export const SidebarRoot: React.FC<PropsWithChildren<SidebarRootProps>> = ({
  children,
  ...rest
}) => {
  return (
    <Flex
      width="96"
      height="full"
      direction="column"
      bg="white"
      borderRight="1px"
      borderRightColor="editorBattleshipGrey.100"
      flexShrink={0}
      {...rest}
    >
      {children}
    </Flex>
  )
}
