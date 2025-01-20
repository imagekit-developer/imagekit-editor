import {Box, Flex, Input, Slider, SliderFilledTrack, SliderThumb, SliderTrack} from "@chakra-ui/react";
import {useMemo} from "react";
import {SET_RESIZE_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {ResizeMode, Tools} from "../../../utils/constants";

export const PercentageResize = () => {
  const [{tool, imageDimensions}, dispatch] = useEditorContext();
  const {options} = tool;
  const resizeOptions = options[Tools.RESIZE];

  const width = useMemo(
    () => Math.round((imageDimensions?.width ?? 0) * (resizeOptions.percentage ?? 1)),
    [resizeOptions.percentage, imageDimensions],
  );
  const height = useMemo(
    () => Math.round((imageDimensions?.height ?? 0) * (resizeOptions.percentage ?? 1)),
    [resizeOptions.percentage, imageDimensions],
  );

  return (
    <>
      <Flex gap="4">
        <Slider
          flex="4"
          value={(resizeOptions.percentage ?? 1) * 100}
          onChange={(e) => {
            dispatch({
              type: SET_RESIZE_OPTIONS,
              payload: {
                mode: ResizeMode.PERCENTAGE,
                percentage: e / 100,
                width: undefined,
                height: undefined,
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
          name="percentage"
          flex="1"
          value={(resizeOptions.percentage ?? 1) * 100}
          onChange={(e) => {
            dispatch({
              type: SET_RESIZE_OPTIONS,
              payload: {
                mode: ResizeMode.PERCENTAGE,
                percentage: Number(e.target.value) / 100,
                width: undefined,
                height: undefined,
              },
            });
          }}
        />
      </Flex>

      <Box background="antiFlashWhite" px="4" py="2" borderRadius="md" mt="4">
        Image size is {(resizeOptions.percentage ?? 1) * 100}% of the original image - {width}px x {height}px
      </Box>
    </>
  );
};
