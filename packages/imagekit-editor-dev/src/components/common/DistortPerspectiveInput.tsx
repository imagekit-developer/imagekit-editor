import {
  Box,
  HStack,
  VStack,
  Icon,
  Text,
  Input,
  InputGroup,

  useColorModeValue,
  InputLeftAddon,
  FormLabel,
} from "@chakra-ui/react";
import type * as React from "react";
import { useState, useEffect } from "react";
import { RxArrowTopLeft } from "@react-icons/all-files/rx/RxArrowTopLeft";
import { RxArrowTopRight } from "@react-icons/all-files/rx/RxArrowTopRight";
import { RxArrowBottomRight } from "@react-icons/all-files/rx/RxArrowBottomRight";
import { RxArrowBottomLeft } from "@react-icons/all-files/rx/RxArrowBottomLeft";
import { FieldErrors } from "react-hook-form";

type DistorPerspectiveFieldProps = {
  name: string;
  id?: string;
  onChange: (value: PerspectiveObject) => void;
  errors?: FieldErrors<Record<string, unknown>>;
  value?: PerspectiveObject;
};

export type PerspectiveObject = {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  x3: string;
  y3: string;
  x4: string;
  y4: string;
};

export const DistortPerspectiveInput: React.FC<DistorPerspectiveFieldProps> = ({
  id,
  onChange,
  errors,
  name: propertyName,
  value,
}) => {
  const [perspective, setPerspective] = useState<PerspectiveObject>(value ?? {
    x1: "",
    y1: "",
    x2: "",
    y2: "",
    x3: "",
    y3: "",
    x4: "",
    y4: "",
  });
  const errorRed = useColorModeValue("red.500", "red.300");
  const leftAccessoryBackground = useColorModeValue("gray.100", "gray.700");

  function handleFieldChange(fieldName: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.trim();
      setPerspective((prev) => ({
        ...prev,
        [fieldName]: val?.toUpperCase(),
      }));
    };
  }

  useEffect(() => {
    onChange(perspective);
  }, [perspective]);

  return (
    <VStack as="fieldset" id={id} role="group" spacing={3} alignItems="stretch">
      {[
        {
          label: "Top left",
          name: "topLeft",
          icon: RxArrowTopLeft,
          x: "x1",
          y: "y1",
        },
        {
          label: "Top right",
          name: "topRight",
          icon: RxArrowTopRight,
          x: "x2",
          y: "y2",
        },
        {
          label: "Bottom right",
          name: "bottomRight",
          icon: RxArrowBottomRight,
          x: "x3",
          y: "y3",
        },
        {
          label: "Bottom left",
          name: "bottomLeft",
          icon: RxArrowBottomLeft,
          x: "x4",
          y: "y4",
        },
      ].map(({ label, name, icon, x, y }) => (
        <VStack alignItems="stretch" key={name} spacing={1}>
          <HStack spacing={1}>
            <Box
              padding="0.2em"
              border="1px"
              borderColor="gray.300"
              borderRadius="md"
              background={leftAccessoryBackground}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={icon} color="gray.500" />
            </Box>
            <FormLabel htmlFor={name} fontSize="sm">
              {label} corner coordinates
            </FormLabel>
          </HStack>
          <HStack alignItems="flex-start">
            <VStack spacing={1} alignItems="flex-start">
              <InputGroup>
                <InputLeftAddon
                  children={x.toUpperCase()}
                  fontSize="sm"
                />
                <Input
                  fontSize="sm"
                  value={perspective[x as keyof PerspectiveObject] ?? ""}
                  isInvalid={!!errors?.[propertyName]?.[x]}
                  onChange={handleFieldChange(x)}
                />
              </InputGroup>
              <Text fontSize="xs" color={errorRed}>
                {errors?.[propertyName]?.[x]?.message}
              </Text>
            </VStack>

            <VStack spacing={1}>
              <InputGroup>
                <InputLeftAddon
                  children={y.toUpperCase()}
                  fontSize="sm"
                />
                <Input
                  fontSize="sm"
                  value={perspective[y as keyof PerspectiveObject] ?? ""}
                  isInvalid={!!errors?.[propertyName]?.[y]}
                  onChange={handleFieldChange(y)}
                />
              </InputGroup>
              <Text fontSize="xs" color={errorRed}>
                {errors?.[propertyName]?.[y]?.message}
              </Text>
            </VStack>
          </HStack>
        </VStack>
      ))}
    </VStack>
  );
};

export default DistortPerspectiveInput;
