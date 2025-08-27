import { Box, Flex } from "@chakra-ui/react"

interface EditorWrapperProps {
  children: React.ReactNode
}

export function EditorWrapper({ children }: EditorWrapperProps) {
  return (
    <Box
      position="fixed"
      zIndex="modal"
      height="100vh"
      width="100vw"
      top={0}
      left={0}
      id="ik-editor"
      fontSize="16px"
    >
      <Flex
        position="absolute"
        top={0}
        left={0}
        bottom={0}
        right={0}
        height="100vh"
        width="full"
        margin={0}
        backgroundColor="white"
        color="black"
        userSelect="none"
        direction="column"
      >
        {children}
      </Flex>
    </Box>
  )
}
