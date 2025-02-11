import {
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Radio,
  RadioGroup,
  Text,
} from "@chakra-ui/react";
import {useMemo} from "react";
import {SET_AI_UPSCALER_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {Tools} from "../../../utils/constants";
import {InfoButton} from "../../common/InfoButton";

const inputImageResolutionLimit = 1_048_576; // 1 MP
const outputImageResolutionLimit = 16_084_992; // 16 MP

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const AIUpscalerTool = () => {
  const [{tool, imageDimensions}, dispatch] = useEditorContext();
  const aiUpscalerConfig = tool.options[Tools.AI_UPSCALER];

  const width = useMemo(
    () => aiUpscalerConfig.originalImageDimensions?.width ?? imageDimensions?.width ?? 0,
    [aiUpscalerConfig.originalImageDimensions?.width, imageDimensions?.width],
  );

  const height = useMemo(
    () => aiUpscalerConfig.originalImageDimensions?.height ?? imageDimensions?.height ?? 0,
    [aiUpscalerConfig.originalImageDimensions?.height, imageDimensions?.height],
  );

  const imageResolution = useMemo(() => width * height, [width, height]);

  return (
    <>
      <Flex direction="column" gap="6">
        <FormControl as={Flex} direction="column" gap="3">
          <Flex justifyContent={"space-between"} alignItems={"center"}>
            <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="upscaling-factor" margin="0">
              Set Upscaling Factor
              <InfoButton
                label="AI Upscaler Documentation"
                url="https://imagekit.io/docs/ai-transformations#upscale-e-upscale"
              />
            </Heading>
          </Flex>
          <RadioGroup
            name="upscaling-factor"
            value={aiUpscalerConfig.upscalingFactor}
            onChange={(e) => {
              dispatch({type: SET_AI_UPSCALER_OPTIONS, payload: {upscalingFactor: e}});
            }}
          >
            <Flex justifyContent={"space-between"} alignItems={"center"}>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 1.5 > outputImageResolutionLimit
                }
                value="1.5"
              >
                1.5x
              </Radio>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 2 > outputImageResolutionLimit
                }
                value="2"
              >
                2x
              </Radio>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 3 > outputImageResolutionLimit
                }
                value="3"
              >
                3x
              </Radio>
              <Radio
                isDisabled={
                  imageResolution > inputImageResolutionLimit || imageResolution * 4 > outputImageResolutionLimit
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
          <Heading as={FormLabel} size="sm" fontWeight="medium" margin="0">
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
          <Heading as={FormLabel} size="sm" fontWeight="medium" margin="0">
            Upscaled Resolution
          </Heading>
          <Text>
            {aiUpscalerConfig.upscalingFactor
              ? `${aiUpscalerConfig.scaledImageDimensions?.width} x ${aiUpscalerConfig.scaledImageDimensions?.height}`
              : "-"}
          </Text>
        </FormControl>
      </Flex>
    </>
  );
};
