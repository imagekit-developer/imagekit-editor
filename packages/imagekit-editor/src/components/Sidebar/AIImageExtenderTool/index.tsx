import {Flex, FormControl, FormLabel, Grid, GridItem, Heading, Icon, Input, useRadioGroup} from "@chakra-ui/react";
import {PiLink} from "@react-icons/all-files/pi/PiLink";
import {SET_AI_IMAGE_EXTENDER_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {AIImageExtenderOptions, Tools} from "../../../utils/constants";
import {RadioCard} from "../../common/RadioCard";
import {Select, SelectButton, SelectList} from "../../common/Select";

export const AIImageExtenderTool = () => {
  const [{tool, imageDimensions}, dispatch] = useEditorContext();
  const aiImageExtenderConfig = tool.options[Tools.AI_IMAGE_EXTENDER];

  const {getRadioProps} = useRadioGroup({
    value: aiImageExtenderConfig.aspectRatio,
    onChange: (value) => {
      dispatch({
        type: SET_AI_IMAGE_EXTENDER_OPTIONS,
        payload: {
          aspectRatio: value,
        },
      });
    },
  });

  return (
    <>
      <Flex direction="column" gap="4">
        <Heading as="span" size="sm" fontWeight="medium">
          Select size
        </Heading>

        <Select
          name="country"
          matchWidth
          value={aiImageExtenderConfig.sizeCategory}
          options={AIImageExtenderOptions.map((option) => ({
            value: option.category,
            label: option.category,
          }))}
          onChange={(e) => {
            dispatch({
              type: SET_AI_IMAGE_EXTENDER_OPTIONS,
              payload: {sizeCategory: e, aspectRatio: undefined},
            });
          }}
        >
          <SelectButton />
          <SelectList />
        </Select>
        <Grid gap="1" templateColumns="repeat(3, 1fr)">
          {AIImageExtenderOptions.find((x) => x.category === aiImageExtenderConfig.sizeCategory)?.items.map((value) => {
            const radio = getRadioProps({value: value.label});
            return (
              <GridItem as="label" key={`extend-${aiImageExtenderConfig.sizeCategory}-${value.value}`}>
                <RadioCard title={value.name} subtitle={value.label} icon={value.icon} {...radio} />
              </GridItem>
            );
          })}
        </Grid>

        <Flex direction="column" gap="3">
          <Heading as="span" size="sm" fontWeight="medium">
            Custom Size
          </Heading>
          <Flex gap="3" alignItems="center">
            <FormControl as={Flex} direction="column" gap="2">
              <FormLabel htmlFor="width" fontSize="x-small" margin="0" color="slategray">
                Width (in px)
              </FormLabel>
              <Input
                type="number"
                id="width"
                size="sm"
                value={aiImageExtenderConfig.customSize?.width}
                onChange={(e) => {
                  dispatch({
                    type: SET_AI_IMAGE_EXTENDER_OPTIONS,
                    payload: {
                      customSize: {
                        ...aiImageExtenderConfig.customSize,
                        width: parseInt(e.target.value),
                      },
                    },
                  });
                }}
              />
            </FormControl>
            <Icon as={PiLink} boxSize={5} color="slategray" />
            <FormControl as={Flex} direction="column" gap="2">
              <FormLabel htmlFor="height" fontSize="x-small" margin="0" color="slategray">
                Height (in px)
              </FormLabel>
              <Input
                type="number"
                id="height"
                size="sm"
                value={aiImageExtenderConfig.customSize?.height}
                onChange={(e) => {
                  dispatch({
                    type: SET_AI_IMAGE_EXTENDER_OPTIONS,
                    payload: {
                      customSize: {
                        ...aiImageExtenderConfig.customSize,
                        height: parseInt(e.target.value),
                      },
                    },
                  });
                }}
              />
            </FormControl>
          </Flex>
        </Flex>

        {/* <FormControl as={Flex} direction="column" gap="3">
          <Flex justifyContent={"space-between"} alignItems={"center"}>
            <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="grayscale" margin="0">
              Set Upscaling Factor
              <InfoButton
                label="Remove Background Documentation"
                url="https://imagekit.io/docs/ai-transformations#upscale-e-upscale"
              />
            </Heading>
          </Flex>
          <RadioGroup
            value={aiUpscalerConfig.upscalingFactor}
            onChange={(e) => {
              dispatch({type: SET_AI_UPSCALER_OPTIONS, payload: {upscalingFactor: e}});
            }}
          >
            <Flex justifyContent={"space-between"} alignItems={"center"}>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 1.5 < outputImageResolutionLimit
                }
                value="1.5"
              >
                1.5x
              </Radio>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 2 < outputImageResolutionLimit
                }
                value="2"
              >
                2x
              </Radio>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 3 < outputImageResolutionLimit
                }
                value="3"
              >
                3x
              </Radio>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 4 < outputImageResolutionLimit
                }
                value="4"
              >
                4x
              </Radio>
            </Flex>
          </RadioGroup>
          <FormHelperText>Images with resolution greater than 1 MP cannot be upscaled.</FormHelperText>
        </FormControl>
        <Divider />
        <FormControl as={Flex} direction="column" gap="2">
          <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="grayscale" margin="0">
            Original Resolution
          </Heading>
          <Text>
            {aiUpscalerConfig.originalImageDimensions?.width ?? imageDimensions?.width} x{" "}
            {aiUpscalerConfig.originalImageDimensions?.height ?? imageDimensions?.height} (
            {numberFormatter.format(imageResolution / 1_000_000)} MP)
          </Text>
        </FormControl>
        <Divider />
        <FormControl as={Flex} direction="column" gap="2">
          <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="grayscale" margin="0">
            Upscaled Resolution
          </Heading>
          <Text>
            {aiUpscalerConfig.upscalingFactor
              ? `${aiUpscalerConfig.scaledImageDimensions?.width} x ${aiUpscalerConfig.scaledImageDimensions?.height}`
              : "-"}
          </Text>
        </FormControl> */}
      </Flex>
    </>
  );
};
