import {
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  IconButton,
  Image,
  Input,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Spacer,
  Switch,
  Text,
} from "@chakra-ui/react";
import {PiArrowLeft} from "@react-icons/all-files/pi/PiArrowLeft";
import {PiXBold} from "@react-icons/all-files/pi/PiXBold";
import {useMemo, useState} from "react";
import {DISCARD_CHANGE, SET_BACKGROUND_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {Tools} from "../../../utils/constants";
import {InfoButton} from "../../common/InfoButton";
import {AIBackgroundSubMenu} from "./AIBackgroundSubMenu";
import {SolidColorSubMenu} from "./SolidColorSubMenu";

export const Backgroundtool = () => {
  const [{tool}, dispatch] = useEditorContext();
  const backgroundConfig = tool.options[Tools.BACKGROUND];

  const [tabState, setTabState] = useState<"Solid Color" | "Image" | "AI Background" | null>(null);

  const tab = useMemo(() => {
    switch (tabState) {
      case "Solid Color":
        return <SolidColorSubMenu />;
      case "AI Background":
        return <AIBackgroundSubMenu />;
      default:
        return null;
    }
  }, [tabState]);

  return (
    <>
      <Flex direction="column" gap="6">
        <FormControl>
          <Flex justifyContent={"space-between"} alignItems={"center"}>
            <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="remove-background" margin="0">
              Remove Background
              <InfoButton
                label="Remove Background Documentation"
                url="https://imagekit.io/docs/ai-transformations#background-removal-e-removedotbg"
              />
            </Heading>
            <Switch
              name="remove-background"
              isChecked={backgroundConfig.removeBackground}
              onChange={(value) => {
                dispatch({
                  type: SET_BACKGROUND_OPTIONS,
                  payload: {
                    removeBackground: value.target.checked,
                  },
                });
              }}
            />
          </Flex>
        </FormControl>
        {backgroundConfig.removeBackground ? (
          <>
            <Divider />
            <Flex justifyContent={"space-between"} alignItems={"center"}>
              <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="change-background" margin="0">
                Change Background
              </Heading>
            </Flex>
            <Flex justifyContent={"space-between"} alignItems={"center"} gap="4">
              <Flex
                as={Button}
                variant="ghost"
                paddingY="2"
                paddingX="2"
                height="auto"
                direction="column"
                gap="2"
                onClick={() => {
                  setTabState("Solid Color");
                }}
              >
                <Image
                  src={"https://ik.imagekit.io/n8ym6wilmq/ai-editor/solid-color-bg.png?updatedAt=1736883047201"}
                  alt="Background Image"
                />
                <Text fontSize="sm" textAlign="center">
                  Solid Color
                </Text>
              </Flex>
              <Flex
                as={Button}
                variant="ghost"
                paddingY="2"
                paddingX="2"
                height="auto"
                direction="column"
                gap="2"
                onClick={() => {
                  setTabState("AI Background");
                }}
              >
                <Image
                  src={"https://ik.imagekit.io/n8ym6wilmq/ai-editor/ai-bg.png?updatedAt=1736883047201"}
                  alt="Background Image"
                />
                <Text fontSize="sm" textAlign="center">
                  AI Background
                </Text>
              </Flex>
            </Flex>
            <Divider />
            <FormControl>
              <Flex justifyContent={"space-between"} alignItems={"center"}>
                <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="shadow" margin="0">
                  Object Shadow
                  <InfoButton
                    label="Object Shadow Documentation"
                    url="https://imagekit.io/docs/ai-transformations#ai-drop-shadow-e-dropshadow"
                  />
                </Heading>
                <Switch
                  id="shadow"
                  name="shadow"
                  isChecked={backgroundConfig.shadow?.enabled}
                  onChange={(value) => {
                    dispatch({
                      type: SET_BACKGROUND_OPTIONS,
                      payload: {
                        shadow: {
                          enabled: value.target.checked,
                        },
                      },
                    });
                  }}
                />
              </Flex>
            </FormControl>
            {backgroundConfig.shadow?.enabled ? (
              <>
                <FormControl>
                  <Heading as={FormLabel} size="xs" fontSize="small" fontWeight="medium" htmlFor="azimuth" margin="0">
                    Azimuth
                  </Heading>
                  <Flex gap="4">
                    <Slider
                      name="azimuth"
                      flex="4"
                      value={backgroundConfig.shadow?.azimuth}
                      min={0}
                      max={360}
                      step={1}
                      onChange={(value) => {
                        dispatch({
                          type: SET_BACKGROUND_OPTIONS,
                          payload: {
                            shadow: {
                              azimuth: value,
                            },
                          },
                        });
                      }}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Input
                      type="number"
                      name="azimuth"
                      flex="1"
                      min={0}
                      max={360}
                      step={1}
                      value={backgroundConfig.shadow?.azimuth}
                      onChange={(event) => {
                        dispatch({
                          type: SET_BACKGROUND_OPTIONS,
                          payload: {
                            shadow: {
                              azimuth: parseInt(event.target.value),
                            },
                          },
                        });
                      }}
                    />
                  </Flex>
                </FormControl>
                <FormControl>
                  <Heading as={FormLabel} size="xs" fontSize="small" fontWeight="medium" htmlFor="elevation" margin="0">
                    Elevation
                  </Heading>
                  <Flex gap="4">
                    <Slider
                      name="elevation"
                      flex="4"
                      min={0}
                      max={360}
                      step={1}
                      onChange={(value) => {
                        dispatch({
                          type: SET_BACKGROUND_OPTIONS,
                          payload: {
                            shadow: {
                              elevation: value,
                            },
                          },
                        });
                      }}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Input
                      type="number"
                      name="elevation"
                      flex="1"
                      min={0}
                      max={360}
                      step={1}
                      value={backgroundConfig.shadow?.elevation}
                      onChange={(event) => {
                        dispatch({
                          type: SET_BACKGROUND_OPTIONS,
                          payload: {
                            shadow: {
                              elevation: parseInt(event.target.value),
                            },
                          },
                        });
                      }}
                    />
                  </Flex>
                </FormControl>
                <FormControl>
                  <Heading
                    as={FormLabel}
                    size="xs"
                    fontSize="small"
                    fontWeight="medium"
                    htmlFor="saturation"
                    margin="0"
                  >
                    Saturation
                  </Heading>
                  <Flex gap="4">
                    <Slider
                      name="saturation"
                      flex="4"
                      min={0}
                      max={100}
                      step={1}
                      onChange={(value) => {
                        dispatch({
                          type: SET_BACKGROUND_OPTIONS,
                          payload: {
                            shadow: {
                              saturation: value,
                            },
                          },
                        });
                      }}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Input
                      type="number"
                      name="saturation"
                      flex="1"
                      min={0}
                      max={100}
                      step={1}
                      value={backgroundConfig.shadow?.saturation}
                      onChange={(event) => {
                        dispatch({
                          type: SET_BACKGROUND_OPTIONS,
                          payload: {
                            shadow: {
                              saturation: parseInt(event.target.value),
                            },
                          },
                        });
                      }}
                    />
                  </Flex>
                </FormControl>
              </>
            ) : null}
          </>
        ) : null}
      </Flex>
      {tabState ? (
        <Flex
          zIndex="1"
          direction="column"
          background="white"
          position={"absolute"}
          top="0"
          right="0"
          left="0"
          bottom="calc(2 * var(--chakra-space-6) + var(--chakra-sizes-10))"
        >
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
            <IconButton
              aria-label="Close Tool"
              icon={<Icon as={PiArrowLeft} boxSize="3.5" />}
              onClick={() => {
                setTabState(null);
              }}
              color="aurometalsaurus"
              variant="outline"
              size="sm"
            />
            <Heading as="span" size="md" fontWeight="bold" fontSize="sm">
              {tabState}
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
            <Flex direction="column" gap="6">
              {tab}
            </Flex>
          </Flex>
        </Flex>
      ) : null}
    </>
  );
};
