import {Flex, Tooltip, useRadio, useRadioGroup} from "@chakra-ui/react";
import {useMemo} from "react";

type Props = {
  color: string;
} & ReturnType<ReturnType<typeof useRadioGroup>["getRadioProps"]>;

export const SwatchButton = (incomingProps: Props) => {
  const {color, ...props} = incomingProps;

  const {getInputProps, getCheckboxProps} = useRadio(props);

  const input = getInputProps();
  const radio = getCheckboxProps();

  const transparentBackgroundProps = useMemo(() => {
    if (color === "transparent") {
      return {
        backgroundImage: `linear-gradient(45deg, blackAlpha.200 25%, transparent 25%), linear-gradient(135deg, blackAlpha.200 25%, transparent 25%),linear-gradient(45deg, transparent 75%, blackAlpha.200 75%), linear-gradient(135deg, transparent 75%, blackAlpha.200 75%),`,
        backgroundSize: "0.25rem 0.25rem",
        backgroundPosition: "0 0, 0.125rem 0, 0.125rem -0.125rem, 0 0.125rem",
      };
    }

    return {};
  }, [color]);

  return (
    <>
      <input {...input} />
      <Tooltip label={color} aria-label={color}>
        <Flex
          w="10"
          h="10"
          bg={color}
          border="1px"
          borderRadius="md"
          borderColor="platinum"
          cursor="pointer"
          _checked={{
            borderColor: "blue.500",
            outline: "var(--chakra-space-0-5) solid var(--chakra-colors-blue-500)",
          }}
          _hover={{
            borderColor: "blue.500",
            outline: "var(--chakra-space-0-5) solid var(--chakra-colors-blue-500)",
          }}
          {...transparentBackgroundProps}
          {...radio}
        />
      </Tooltip>
    </>
  );
};
