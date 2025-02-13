import {Flex, FormControl, FormLabel, Grid, GridItem, Heading, Input, useRadioGroup} from "@chakra-ui/react";
import {SET_BACKGROUND_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {Tools} from "../../../utils/constants";
import {SwatchButton} from "../../common/SwatchButton";

const colors = [
  "transparent",
  "#FFFFFF",
  "#000000",
  "#ee2288",
  "#c011dd",
  "#7722ee",
  "#2233ff",
  "#0099ff",
  "#22bbaa",
  "#33bb44",
];

export const SolidColorSubMenu = () => {
  const [{tool}, dispatch] = useEditorContext();
  const backgroundConfig = tool.options[Tools.BACKGROUND];

  const {getRadioProps, value, setValue} = useRadioGroup({
    defaultValue: "transparent",
    value: backgroundConfig.solidColor || "transparent",
    onChange: (value) => {
      console.log(value);
      dispatch({
        type: SET_BACKGROUND_OPTIONS,
        payload: {
          solidColor: value === "transparent" ? undefined : value,
          aiPrompt: undefined,
        },
      });
    },
  });
  return (
    <>
      <Heading as="span" size="sm" fontWeight="medium">
        Default Colors
      </Heading>
      <Grid gap="2" w="full" templateColumns="repeat(6, 1fr)">
        {colors.map((value) => {
          const radio = getRadioProps({value});
          return (
            <GridItem as="label" flex="1" key={`scale-${value}`}>
              <SwatchButton color={value} {...radio} />
            </GridItem>
          );
        })}
      </Grid>
      <Flex direction="row" gap="2">
        <FormControl>
          <FormLabel fontSize="0.75rem" color="slategray">
            Enter hex code
          </FormLabel>
          <Input
            value={colors.map((v) => v.toLowerCase()).includes((value as string).toLowerCase()) ? "" : value}
            placeholder="#000000"
            onChange={(e) => {
              console.log(e);
              let colorIndex = colors.findIndex((v) => v.toLowerCase() === e.target.value.toLowerCase());

              console.log(colorIndex, e.target.value);

              if (colorIndex === -1) {
                setValue(e.target.value);
              } else {
                setValue(colors[colorIndex]);
              }
            }}
          />
        </FormControl>
      </Flex>
    </>
  );
};
