import {chakra, Flex, Icon, useRadio, useRadioGroup} from "@chakra-ui/react";
import {IconType} from "@react-icons/all-files";

type Props = {
  title: string;
  icon: IconType;
} & ReturnType<ReturnType<typeof useRadioGroup>["getRadioProps"]>;

export const ToolbarButton = (incomingProps: Props) => {
  const {title, icon, ...props} = incomingProps;

  const {getInputProps, getCheckboxProps} = useRadio(props);

  const input = getInputProps();
  const radio = getCheckboxProps();

  return (
    <>
      <input {...input} />
      <Flex
        {...radio}
        role="button"
        display="inline-flex"
        appearance="none"
        alignItems="center"
        justifyContent="center"
        userSelect="none"
        position="relative"
        whiteSpace="nowrap"
        verticalAlign="middle"
        outline="2px solid transparent"
        outlineOffset="2px"
        lineHeight="1.2"
        fontWeight="semibold"
        transitionProperty="common"
        transitionDuration="normal"
        height="8.376"
        minW="8.376"
        px="3.5"
        color="gray.800"
        fontSize="0.875rem"
        borderRadius="full"
        cursor="pointer"
        _active={{
          bg: "gray.200",
        }}
        _hover={{
          bg: "gray.100",
        }}
        _focusVisible={{
          boxShadow: "outline",
        }}
        _checked={{
          bg: "crayola",
          color: "white",
          _hover: {
            bg: "aliceblue",
            color: "gray.800",
          },
        }}
      >
        <chakra.span display="inline-flex" alignSelf="center" flexShrink={0} marginInlineEnd="0.5rem">
          <Icon as={icon} />
        </chakra.span>
        {title}
      </Flex>
    </>
  );
};
