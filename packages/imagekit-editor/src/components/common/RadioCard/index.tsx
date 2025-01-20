import {Flex, Icon, Text, useRadio, useRadioGroup} from "@chakra-ui/react";
import {IconType} from "@react-icons/all-files";

type Props = {
  title: string;
  subtitle: string;
  icon: IconType;
} & ReturnType<ReturnType<typeof useRadioGroup>["getRadioProps"]>;

export const RadioCard = (incomingProps: Props) => {
  const {title, subtitle, icon, ...props} = incomingProps;

  const {getInputProps, getCheckboxProps} = useRadio(props);

  const input = getInputProps();
  const radio = getCheckboxProps();

  return (
    <>
      <input {...input} />
      <Flex
        {...radio}
        direction="column"
        h="24"
        w="24"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        fontSize="0.75rem"
        _checked={{
          background: "aliceblue",
          border: "1px solid",
          borderColor: "lavender",
          borderRadius: "md",
          color: "crayola",
          "*": {
            color: "crayola",
          },
        }}
        _hover={{
          background: "aliceblue",
          border: "1px solid",
          borderColor: "lavender",
          borderRadius: "md",
          color: "crayola",
          "*": {
            color: "crayola",
          },
        }}
      >
        <Icon as={icon} boxSize="8" mb="2" color="slategray" />
        <Text>{title}</Text>
        <Text color="slategray">{subtitle}</Text>
      </Flex>
    </>
  );
};
