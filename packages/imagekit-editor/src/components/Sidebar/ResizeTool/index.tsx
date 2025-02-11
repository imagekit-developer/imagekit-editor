import {Checkbox, Divider, Flex, FormControl, FormLabel, Heading, Input} from "@chakra-ui/react";
import {SET_RESIZE_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {ResizeMode, ScaleMode, Tools} from "../../../utils/constants";
import {Select, SelectButton, SelectList, SelectOption} from "../../common/Select";
import {BackgroundOptions} from "./BackgroundOptions";
import {PercentageResize} from "./PercentageResize";
import {ScaleOptions} from "./ScaleOptions";

const Options = {
  [ResizeMode.CUSTOM_SIZE]: "Custom size",
  [ResizeMode.PERCENTAGE]: "Percentage",
  [ResizeMode.INSTAGRAM]: "Instagram",
  [ResizeMode.FACEBOOK]: "Facebook",
  [ResizeMode.LINKEDIN]: "LinkedIn",
  [ResizeMode.TWITTER]: "X (Twitter)",
  [ResizeMode.YOUTUBE]: "YouTube",
  [ResizeMode.PINTEREST]: "Pinterest",
  [ResizeMode.SNAPCHAT]: "Snapchat",
};

export const ResizeTool = () => {
  const [{tool, imageDimensions}, dispatch] = useEditorContext();
  const resizeOptions = tool.options[Tools.RESIZE];

  return (
    <>
      <Flex direction="column" gap="2">
        <Flex direction="column" gap="6">
          <Heading as="span" size="sm" fontWeight="medium">
            Resize options
          </Heading>
          <Select
            name="resizeMode"
            matchWidth
            value={resizeOptions.mode}
            onChange={(e) => {
              if (e === ResizeMode.PERCENTAGE) {
                dispatch({
                  type: SET_RESIZE_OPTIONS,
                  payload: {
                    mode: e as ResizeMode,
                    height: undefined,
                    width: undefined,
                    percentage: 1,
                    maintainAspectRatio: true,
                    scale: undefined,
                    backgroundColor: undefined,
                  },
                });
              } else {
                dispatch({
                  type: SET_RESIZE_OPTIONS,
                  payload: {
                    mode: e as ResizeMode,
                    height: imageDimensions?.height,
                    width: imageDimensions?.width,
                    percentage: undefined,
                    maintainAspectRatio: true,
                    scale: undefined,
                    backgroundColor: undefined,
                  },
                });
              }
            }}
            renderValue={(_value) => {
              const value = _value[0] as ResizeMode;
              return Options[value];
            }}
          >
            <SelectButton />
            <SelectList zIndex={1000}>
              <SelectOption value={ResizeMode.CUSTOM_SIZE}>Custom size</SelectOption>
              <SelectOption value={ResizeMode.PERCENTAGE}>Percentage</SelectOption>
              {/* <MenuDivider />
              <SelectOption value={ResizeMode.INSTAGRAM}>Instagram</SelectOption>
              <SelectOption value={ResizeMode.FACEBOOK}>Facebook</SelectOption>
              <SelectOption value={ResizeMode.LINKEDIN}>LinkedIn</SelectOption>
              <SelectOption value={ResizeMode.TWITTER}>X (Twitter)</SelectOption>
              <SelectOption value={ResizeMode.YOUTUBE}>YouTube</SelectOption>
              <SelectOption value={ResizeMode.PINTEREST}>Pinterest</SelectOption>
              <SelectOption value={ResizeMode.SNAPCHAT}>Snapchat</SelectOption> */}
            </SelectList>
          </Select>
          {resizeOptions.mode === ResizeMode.CUSTOM_SIZE ? (
            <>
              <Flex direction="row" gap="2">
                <FormControl>
                  <FormLabel fontSize="0.75rem" color="slategray">
                    Width (in px)
                  </FormLabel>
                  <Input
                    min={0}
                    max={imageDimensions?.width}
                    type="number"
                    name="width"
                    value={resizeOptions.width ?? imageDimensions?.width}
                    onChange={(e) => {
                      if (!imageDimensions) return;
                      if (parseInt(e.target.value) >= imageDimensions?.width) {
                        dispatch({
                          type: SET_RESIZE_OPTIONS,
                          payload: {
                            mode: ResizeMode.CUSTOM_SIZE,
                            width: imageDimensions?.width,
                            height: imageDimensions?.height,
                            percentage: undefined,
                          },
                        });

                        return;
                      }
                      let aspectRatio = 1;
                      if (imageDimensions) {
                        aspectRatio = imageDimensions.height / imageDimensions.width;
                      }

                      if (resizeOptions.maintainAspectRatio) {
                        dispatch({
                          type: SET_RESIZE_OPTIONS,
                          payload: {
                            mode: ResizeMode.CUSTOM_SIZE,
                            width: Math.round(parseInt(e.target.value)),
                            height: Math.round(parseInt(e.target.value) * aspectRatio),
                            percentage: undefined,
                          },
                        });
                      } else {
                        dispatch({
                          type: SET_RESIZE_OPTIONS,
                          payload: {
                            mode: ResizeMode.CUSTOM_SIZE,
                            width: parseInt(e.target.value),
                            percentage: undefined,
                          },
                        });
                      }
                    }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="0.75rem" color="slategray">
                    Height (in px)
                  </FormLabel>
                  <Input
                    min={0}
                    max={imageDimensions?.height}
                    type="number"
                    name="height"
                    value={resizeOptions.height ?? imageDimensions?.height}
                    onChange={(e) => {
                      if (!imageDimensions) return;
                      if (parseInt(e.target.value) >= imageDimensions?.height) {
                        dispatch({
                          type: SET_RESIZE_OPTIONS,
                          payload: {
                            mode: ResizeMode.CUSTOM_SIZE,
                            width: imageDimensions?.width,
                            height: imageDimensions?.height,
                            percentage: undefined,
                          },
                        });

                        return;
                      }
                      let aspectRatio = 1;
                      if (imageDimensions) {
                        aspectRatio = imageDimensions.height / imageDimensions.width;
                      }

                      if (resizeOptions.maintainAspectRatio) {
                        dispatch({
                          type: SET_RESIZE_OPTIONS,
                          payload: {
                            mode: ResizeMode.CUSTOM_SIZE,
                            width: Math.round(parseInt(e.target.value) / aspectRatio),
                            height: Math.round(parseInt(e.target.value)),
                            percentage: undefined,
                          },
                        });
                      } else {
                        dispatch({
                          type: SET_RESIZE_OPTIONS,
                          payload: {
                            mode: ResizeMode.CUSTOM_SIZE,
                            height: parseInt(e.target.value),
                            percentage: undefined,
                          },
                        });
                      }
                    }}
                  />
                </FormControl>
              </Flex>
              <FormControl>
                <Checkbox
                  colorScheme="blue"
                  size="md"
                  isChecked={resizeOptions.maintainAspectRatio}
                  onChange={(e) => {
                    dispatch({
                      type: SET_RESIZE_OPTIONS,
                      payload: {
                        maintainAspectRatio: e.target.checked,
                        scale: ScaleMode.FILL_SCREEN,
                        backgroundColor: undefined,
                      },
                    });
                  }}
                >
                  Maintain aspect ratio
                </Checkbox>
              </FormControl>
            </>
          ) : null}
          {resizeOptions.mode === ResizeMode.PERCENTAGE ? (
            <>
              <Flex direction="column" gap="2">
                <Heading as="span" size="sm" fontWeight="medium">
                  Size
                </Heading>
                <PercentageResize />
              </Flex>
            </>
          ) : null}
          {!resizeOptions.maintainAspectRatio && resizeOptions.mode !== ResizeMode.PERCENTAGE ? (
            <>
              <Divider />
              <ScaleOptions />
              <Divider />
              <BackgroundOptions />
            </>
          ) : null}
        </Flex>
      </Flex>
    </>
  );
};
