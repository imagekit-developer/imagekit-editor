import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spacer,
  useRadioGroup,
} from "@chakra-ui/react";
import {IoIosArrowDown} from "@react-icons/all-files/io/IoIosArrowDown";
import {REDO, SET_TOOL, SET_ZOOM, UNDO} from "../../actions";
import {useEditorContext} from "../../context";
import {IKRedo} from "../../icons/IKRedo";
import {IKUndo} from "../../icons/IKUndo";
import {ToolHeadings, ToolIcons, Tools} from "../../utils/constants";
import {ToolbarButton} from "../common/ToolbarButton";

export const Toolbar = () => {
  const [{zoomLevel, tool, history}, dispatch] = useEditorContext();

  const {getRadioProps} = useRadioGroup({
    defaultValue: "NO_TOOL",
    value: tool.value ?? "NO_TOOL",
    onChange: (value) => {
      dispatch({
        type: SET_TOOL,
        payload: value as Tools,
      });
    },
  });

  return (
    <Flex
      h="14"
      flexDirection="row"
      justifyContent="center"
      alignItems="center"
      px="6"
      py="1px"
      borderBottom={"1px"}
      borderBottomColor={"platinum"}
      gap="4"
      w="full"
      flexShrink={0}
    >
      <Flex gap="4">
        {[
          Tools.CROP,
          Tools.RESIZE,
          Tools.ADJUST,
          Tools.BACKGROUND,
          // Tools.AI_EDITOR,
          Tools.AI_IMAGE_EXTENDER,
          Tools.AI_RETOUCH,
          Tools.AI_UPSCALER,
        ].map((t) => {
          const radio = getRadioProps({value: t});
          return (
            <Box as="label">
              <ToolbarButton key={`toolbar-${t}`} title={ToolHeadings[t]} icon={ToolIcons[t]} {...radio} />
            </Box>
          );
        })}
      </Flex>
      <Spacer />
      <ButtonGroup isAttached variant="outline" size="sm" borderColor="aurometalsaurus">
        <IconButton
          icon={<Icon boxSize={"5"} color="aurometalsaurus" as={IKUndo} />}
          aria-label="Undo"
          isDisabled={history.head === 0}
          onClick={() => {
            dispatch({
              type: UNDO,
            });
          }}
        />
        <IconButton
          icon={<Icon boxSize={"5"} color="aurometalsaurus" as={IKRedo} />}
          aria-label="Redo"
          isDisabled={history.head === history.stack.length - 1}
          onClick={() => {
            dispatch({
              type: REDO,
            });
          }}
        />
      </ButtonGroup>
      <Menu isLazy offset={[0, 10]}>
        <MenuButton
          as={Button}
          rightIcon={<Icon as={IoIosArrowDown} />}
          variant="outline"
          size="sm"
          isDisabled={tool.value === Tools.CROP || tool.value === Tools.AI_UPSCALER}
        >
          {Number(zoomLevel.value * 100).toFixed(0)}%
        </MenuButton>
        {tool.value != Tools.CROP && (
          <MenuList>
            <MenuItem
              isDisabled={zoomLevel.defaultValues.indexOf(zoomLevel.value) === zoomLevel.defaultValues.length - 1}
              onClick={() => {
                const nearestZoom = zoomLevel.defaultValues.find((z) => z > zoomLevel.value);

                if (nearestZoom) {
                  dispatch({
                    type: SET_ZOOM,
                    payload: {
                      value: nearestZoom,
                      isAbsoluteZoom: true,
                    },
                  });
                }
              }}
              command="⌘+"
            >
              Zoom in
            </MenuItem>
            <MenuItem
              disabled={zoomLevel.defaultValues.indexOf(zoomLevel.value) === 0}
              onClick={() => {
                const nearestZoom = zoomLevel.defaultValues.reverse().find((z) => z < zoomLevel.value);

                if (nearestZoom) {
                  dispatch({
                    type: SET_ZOOM,
                    payload: {
                      value: nearestZoom,
                      isAbsoluteZoom: true,
                    },
                  });
                }

                zoomLevel.defaultValues.reverse();
              }}
              command="⌘-"
            >
              Zoom out
            </MenuItem>
            <MenuDivider />
            {zoomLevel.defaultValues.map((z) => (
              <MenuItem
                onClick={() => {
                  dispatch({type: SET_ZOOM, payload: {value: z, isAbsoluteZoom: true}});
                }}
              >
                {z * 100}%
              </MenuItem>
            ))}
          </MenuList>
        )}
      </Menu>
    </Flex>
  );
};
