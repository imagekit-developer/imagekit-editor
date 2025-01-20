import {Flex, Grid, GridItem, Heading, useRadioGroup} from "@chakra-ui/react";
import {SET_CROP} from "../../../actions";
import {useEditorContext} from "../../../context";
import {CropMode, CropModeHeadings, CropModeIcons, CropModeSubtitles, Tools} from "../../../utils/constants";
import {RadioCard} from "../../common/RadioCard";

export const CropTool = () => {
  const [{tool}, dispatch] = useEditorContext();
  const cropConfig = tool.options[Tools.CROP];

  const {getRadioProps} = useRadioGroup({
    defaultValue: CropMode.FREEFORM,
    value: cropConfig.mode,
    onChange: (value) => {
      dispatch({
        type: SET_CROP,
        payload: {
          mode: value as CropMode,
        },
      });
    },
  });

  return (
    <>
      <Flex direction="column" gap="4">
        <Heading as="span" size="sm" fontWeight="medium">
          Crop aspect ratios
        </Heading>
        <Grid gap="1" templateColumns="repeat(3, 1fr)">
          {[
            CropMode.FREEFORM,
            CropMode.SQUARE,
            CropMode.WIDESCREEN,
            CropMode.IPHONE,
            CropMode.LANDSCAPE,
            CropMode.PRESENTATION,
            CropMode.PORTRAIT,
          ].map((value) => {
            const radio = getRadioProps({value});
            return (
              <GridItem as="label" key={`crop-${value}`}>
                <RadioCard
                  title={CropModeHeadings[value]}
                  subtitle={CropModeSubtitles[value]}
                  icon={CropModeIcons[value]}
                  {...radio}
                />
              </GridItem>
            );
          })}
        </Grid>
        {/* <Divider />
        <Heading as="span" size="sm" fontWeight="medium">
          Rotate
        </Heading>
        <Flex gap="2">
          <IconButton
            aria-label="Rotate counter-clockwise"
            icon={<Icon as={FiRotateCcw} />}
            size="sm"
            variant="outline"
            color="aurometalsaurus"
            onClick={() => {
              dispatch({
                type: SET_ROTATION,
                payload: (cropConfig.rotation - 90 + 360) % 360,
              });
            }}
          />
          <IconButton
            aria-label="Rotate clockwise"
            icon={<Icon as={FiRotateCw} />}
            size="sm"
            variant="outline"
            color="aurometalsaurus"
            onClick={() => {
              dispatch({
                type: SET_ROTATION,
                payload: (cropConfig.rotation + 90 + 360) % 360,
              });
            }}
          />
        </Flex> */}
      </Flex>
    </>
  );
};
