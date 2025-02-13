import {Grid, GridItem, Heading, useRadioGroup} from "@chakra-ui/react";
import {SET_RESIZE_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {ScaleMode, ScaleModeHeadings, ScaleModeIcons, Tools} from "../../../utils/constants";
import {RadioButton} from "../../common/RadioButton";

export const ScaleOptions = () => {
  const [{tool}, dispatch] = useEditorContext();
  const resizeOptions = tool.options[Tools.RESIZE];

  const {getRadioProps} = useRadioGroup({
    value: resizeOptions.scale,
    onChange: (value) => {
      dispatch({
        type: SET_RESIZE_OPTIONS,
        payload: {
          scale: value as ScaleMode,
        },
      });
    },
  });

  return (
    <>
      <Heading as="span" size="sm" fontWeight="medium">
        Scale
      </Heading>
      <Grid gap="2" w="full" templateColumns="repeat(2, 1fr)">
        {[ScaleMode.FILL_SCREEN, ScaleMode.FIT_SCREEN, ScaleMode.STRETCH].map((value) => {
          const radio = getRadioProps({value});
          return (
            <GridItem as="label" flex="1" key={`scale-${value}`}>
              <RadioButton title={ScaleModeHeadings[value]} icon={ScaleModeIcons[value]} {...radio} />
            </GridItem>
          );
        })}
      </Grid>
    </>
  );
};
