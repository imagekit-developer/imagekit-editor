import {Grid, GridItem, Heading, useRadioGroup} from "@chakra-ui/react";
import {ScaleMode, ScaleModeHeadings, ScaleModeIcons} from "../../../utils/constants";
import {RadioButton} from "../../common/RadioButton";

export const ScaleOptions = () => {
  const {getRadioProps} = useRadioGroup({
    defaultValue: ScaleMode.FILL_SCREEN,
  });

  return (
    <>
      <Heading as="span" size="sm" fontWeight="medium">
        Scale
      </Heading>
      <Grid gap="2" w="full" templateColumns="repeat(2, 1fr)">
        {[ScaleMode.FILL_SCREEN, ScaleMode.FIT_SCREEN, ScaleMode.STRETCH, ScaleMode.CUSTOM].map((value) => {
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
