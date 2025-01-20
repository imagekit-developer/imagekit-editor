import {Box, Flex, Portal} from "@chakra-ui/react";
import {Canvas} from "../Canvas";
import {Header} from "../Header";
import {Sidebar} from "../Sidebar";
import {Toolbar} from "../Toolbar";

interface EditorProps {
  portalContainerRef?: React.RefObject<HTMLDivElement | null>;
  onClose(): void;
  exportActions: Array<{
    label: string;
    onClick(url: string): void;
  }>;
}

const Editor = (props: EditorProps) => {
  const {portalContainerRef, onClose, exportActions} = props;

  return (
    <Portal containerRef={portalContainerRef}>
      <Box id="editor" position="fixed" top="0" left="0" width="100vw" height="100vh" zIndex="1000" background="white">
        <Flex
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          height="full"
          width="full"
          margin="0"
          background="white"
          color="black"
          flexDirection="column"
          overflow="hidden"
          userSelect="none"
        >
          <Header onClose={onClose} exportActions={exportActions} />
          <Toolbar />
          <Flex h="full" w="full">
            <Sidebar />
            <Canvas />
          </Flex>
        </Flex>
      </Box>
    </Portal>
  );
};

export default Editor;
