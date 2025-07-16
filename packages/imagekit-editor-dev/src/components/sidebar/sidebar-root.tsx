import { Flex } from "@chakra-ui/react"
import type { PropsWithChildren } from "react"

type SidebarRootProps = {}

export const SidebarRoot: React.FC<PropsWithChildren<SidebarRootProps>> = ({
  children,
}) => {
  return (
    <Flex
      width="72"
      height="full"
      direction="column"
      bg="white"
      borderRight="1px"
      borderRightColor="editorBattleshipGrey.100"
    >
      {children}
    </Flex>
  )
}
