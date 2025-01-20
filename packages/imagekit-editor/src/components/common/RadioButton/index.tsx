import {Flex, Icon, Text, useRadio, useRadioGroup} from "@chakra-ui/react";
import {IconType} from "@react-icons/all-files";

type Props = {
  title: string;
  icon: IconType;
} & ReturnType<ReturnType<typeof useRadioGroup>["getRadioProps"]>;

export const RadioButton = (incomingProps: Props) => {
  const {title, icon, ...props} = incomingProps;

  const {getInputProps, getCheckboxProps} = useRadio(props);

  const input = getInputProps();
  const radio = getCheckboxProps();

  return (
    <>
      <input {...input} />
      <Flex
        {...radio}
        direction="row"
        h="9"
        w="full"
        maxW="48"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        fontSize="0.75rem"
        borderRadius="md"
        border="1px"
        borderColor="platinum"
        _checked={{
          background: "aliceblue",
          borderColor: "lavender",
          borderRadius: "md",
          color: "crayola",
          "*": {
            color: "crayola",
          },
        }}
        _hover={{
          background: "aliceblue",
          borderColor: "lavender",
          borderRadius: "md",
          color: "crayola",
          "*": {
            color: "crayola",
          },
        }}
      >
        <Icon as={icon} boxSize="5" mr="2" color="slategray" />
        <Text>{title}</Text>
      </Flex>
    </>
  );
};
