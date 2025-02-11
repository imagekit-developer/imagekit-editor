import {
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
} from "@chakra-ui/react";
import {SET_ADJUST_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {Tools} from "../../../utils/constants";
import {InfoButton} from "../../common/InfoButton";

export const AdjustTool = () => {
  const [{tool}, dispatch] = useEditorContext();
  const adjustConfig = tool.options[Tools.ADJUST];

  return (
    <>
      <Flex direction="column" gap="6">
        <FormControl>
          <Flex justifyContent={"space-between"} alignItems={"center"}>
            <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="grayscale" margin="0">
              Grayscale Filter
              <InfoButton
                label="Grayscale Documentation"
                url="https://imagekit.io/docs/effects-and-enhancements#grayscale---e-grayscale"
              />
            </Heading>
            <Switch
              id="grayscale"
              name="grayscale"
              isChecked={adjustConfig.grayscale}
              onChange={(value) => {
                dispatch({
                  type: SET_ADJUST_OPTIONS,
                  payload: {
                    grayscale: value.target.checked,
                  },
                });
              }}
            />
          </Flex>
        </FormControl>
        <Divider />
        <FormControl>
          <Flex justifyContent={"space-between"} alignItems={"center"}>
            <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="auto-contrast" margin="0">
              Contrast stretch
              <InfoButton
                label="Contrast stretch Documentation"
                url="https://imagekit.io/docs/effects-and-enhancements#contrast-stretch---e-contrast"
              />
            </Heading>
            <Switch
              id="auto-contrast"
              isChecked={adjustConfig.contrastStretch}
              onChange={(value) => {
                dispatch({
                  type: SET_ADJUST_OPTIONS,
                  payload: {
                    contrastStretch: value.target.checked,
                  },
                });
              }}
            />
          </Flex>
          <FormHelperText fontSize="x-small">
            Automatically enhance the contrast of the image by using the full intensity values that a particular image
            format allows
          </FormHelperText>
        </FormControl>
        <Divider />
        <FormControl>
          <Flex direction="column" gap="2">
            <Heading as={FormLabel} size="sm" fontWeight="medium" margin="0">
              Sharpness
              <InfoButton
                label="Sharpness Documentation"
                url="https://imagekit.io/docs/effects-and-enhancements#sharpen---e-sharpen"
              />
            </Heading>
            <Flex gap="4">
              <Slider
                flex="6"
                min={0}
                max={100}
                step={1}
                value={adjustConfig.sharpness ?? 0}
                onChange={(value) => {
                  dispatch({
                    type: SET_ADJUST_OPTIONS,
                    payload: {
                      sharpness: value,
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
                name="sharpness"
                flex="1"
                min={0}
                max={100}
                value={adjustConfig.sharpness ?? 0}
                onChange={(event) => {
                  dispatch({
                    type: SET_ADJUST_OPTIONS,
                    payload: {
                      sharpness: parseInt(event.target.value),
                    },
                  });
                }}
              />
            </Flex>
          </Flex>
        </FormControl>
        <Divider />
        <FormControl>
          <Flex direction="column" gap="2">
            <Heading as={FormLabel} size="sm" fontWeight="medium" margin="0" mb="2">
              Unsharpen Mask
              <InfoButton
                label="Unsharpen Mask Documentation"
                url="https://imagekit.io/docs/effects-and-enhancements#unsharp-mask---e-usm"
              />
            </Heading>
            <Flex gap="4">
              <Slider
                flex="6"
                min={0}
                max={100}
                step={1}
                value={adjustConfig.unsharpenMask ?? 0}
                onChange={(value) => {
                  dispatch({
                    type: SET_ADJUST_OPTIONS,
                    payload: {
                      unsharpenMask: value,
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
                name="unsharpen-mask"
                flex="1"
                min={0}
                max={100}
                value={adjustConfig.unsharpenMask ?? 0}
                onChange={(event) => {
                  dispatch({
                    type: SET_ADJUST_OPTIONS,
                    payload: {
                      unsharpenMask: parseInt(event.target.value),
                    },
                  });
                }}
              />
            </Flex>
          </Flex>
        </FormControl>
      </Flex>
    </>
  );
};
