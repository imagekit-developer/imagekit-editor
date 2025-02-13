import {Button, Flex, Heading, Icon, IconButton, Spacer} from "@chakra-ui/react";
import {PiXBold} from "@react-icons/all-files/pi/PiXBold";
import {motion} from "framer-motion";
import {useMemo} from "react";
import {COMMIT_CHANGE, DISCARD_CHANGE} from "../../actions";
import {useEditorContext} from "../../context";
import {ToolHeadings, ToolIcons, Tools} from "../../utils/constants";
import {AdjustTool} from "./AdjustTool";
import {AIImageExtenderTool} from "./AIImageExtenderTool";
import {AIRetouchTool} from "./AIRetouchTool";
import {AIUpscalerTool} from "./AIUpscalerTool";
import {Backgroundtool} from "./Backgroundtool";
import {CropTool} from "./CropTool";
import {ResizeTool} from "./ResizeTool";

export const Sidebar = () => {
  const [{tool}, dispatch] = useEditorContext();

  const SelectedTool = useMemo(() => {
    switch (tool.value) {
      case Tools.CROP:
        return <CropTool />;
      case Tools.RESIZE:
        return <ResizeTool />;
      case Tools.ADJUST:
        return <AdjustTool />;
      case Tools.BACKGROUND:
        return <Backgroundtool />;
      // case Tools.AI_EDITOR:
      case Tools.AI_IMAGE_EXTENDER:
        return <AIImageExtenderTool />;
      case Tools.AI_RETOUCH:
        return <AIRetouchTool />;
      case Tools.AI_UPSCALER:
        return <AIUpscalerTool />;
      default:
        return null;
    }
  }, [tool]);

  return (
    <Flex
      as={motion.aside}
      maxW="362px"
      maxH="calc(100vh - 112px)"
      borderRight="1px"
      borderRightColor="platinum"
      initial="hidden"
      direction="column"
      animate={SelectedTool ? "visible" : "hidden"}
      variants={{
        hidden: {minWidth: "0px"},
        visible: {minWidth: "362px"},
      }}
      position="relative"
    >
      {SelectedTool && tool.value ? (
        <>
          <Flex
            flexDirection="row"
            pl="6"
            pr="4"
            py="4"
            w="full"
            gap="3"
            alignItems="center"
            borderBottom="1px"
            borderBottomColor="platinum"
          >
            <Flex boxSize="8.376" alignItems="center" justifyContent="center" color="aurometalsaurus">
              <Icon as={ToolIcons[tool.value]} boxSize="5" />
            </Flex>
            <Heading as="span" size="md" fontWeight="bold" fontSize="sm">
              {ToolHeadings[tool.value]}
            </Heading>
            <Spacer />
            <IconButton
              aria-label="Close Tool"
              icon={<Icon as={PiXBold} boxSize="3.5" />}
              onClick={() => {
                dispatch({
                  type: DISCARD_CHANGE,
                });
              }}
              color="aurometalsaurus"
              variant={"ghost"}
              size="sm"
            />
          </Flex>
          <Flex direction="column" p="6" overflowY="auto" flex="1">
            {SelectedTool}
          </Flex>
          <Flex
            w="full"
            gap="2"
            alignItems={"center"}
            justifyContent={"center"}
            p="6"
            borderTop="1px"
            borderTopColor="platinum"
          >
            <Button
              flex="1"
              variant="outline"
              colorScheme="blue"
              onClick={() => {
                dispatch({
                  type: DISCARD_CHANGE,
                });
              }}
            >
              Cancel
            </Button>
            <Button
              flex="1"
              variant="solid"
              colorScheme="blue"
              onClick={() => {
                dispatch({
                  type: COMMIT_CHANGE,
                });
              }}
            >
              Apply
            </Button>
          </Flex>
        </>
      ) : null}
    </Flex>
  );
};
