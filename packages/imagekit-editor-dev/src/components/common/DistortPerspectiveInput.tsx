import {
  Box,
  Flex,
  HStack,
  VStack,
  Icon,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  useColorModeValue,
  Tooltip,
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
        [fieldName]: val,
      }));
    };
  }

  useEffect(() => {
    onChange(perspective);
  }, [perspective]);

  return (
    <VStack as="fieldset" id={id} role="group" spacing={2} alignItems="stretch">
      <HStack spacing={0}>
        <InputGroup flex="1.52">
          <InputLeftElement
            pointerEvents="none"
            background={leftAccessoryBackground}
            borderLeftRadius="md"
          >
            <Icon as={RxArrowTopLeft} color="gray.500" />
          </InputLeftElement>
          <Input
            fontSize="sm"
            type="number"
            value={perspective.x1 ?? ""}
            placeholder="X1"
            isInvalid={!!errors?.[propertyName]?.x1}
            onChange={handleFieldChange("x1")}
            borderRightRadius={0}
          />
        </InputGroup>
        <Input
          fontSize="sm"
          type="number"
          value={perspective.y1 ?? ""}
          placeholder="Y1"
          flex="1"
          isInvalid={!!errors?.[propertyName]?.y1}
          onChange={handleFieldChange("y1")}
          borderLeftRadius={0}
          borderLeft={0}
          paddingInlineStart="0.1em"
        />
        <Text fontSize="xs" color={errorRed}>
          {[
            errors?.[propertyName]?.x1?.message,
            errors?.[propertyName]?.y1?.message,
          ]
            .filter(Boolean)
            .join(". ")}
        </Text>
      </HStack>

      <HStack spacing={0}>
        <InputGroup flex="1.52">
          <InputLeftElement
            pointerEvents="none"
            background={leftAccessoryBackground}
            borderLeftRadius="md"
          >
            <Icon as={RxArrowTopRight} color="gray.500" />
          </InputLeftElement>
          <Input
            fontSize="sm"
            type="number"
            value={perspective.x2 ?? ""}
            placeholder="X2"
            isInvalid={!!errors?.[propertyName]?.x2}
            onChange={handleFieldChange("x2")}
            borderRightRadius={0}
          />
        </InputGroup>
        <Input
          fontSize="sm"
          type="number"
          value={perspective.y2 ?? ""}
          placeholder="Y2"
          flex="1"
          isInvalid={!!errors?.[propertyName]?.y2}
          onChange={handleFieldChange("y2")}
          borderLeftRadius={0}
          borderLeft={0}
          paddingInlineStart="0.1em"
        />
        <Text fontSize="xs" color={errorRed}>
          {[
            errors?.[propertyName]?.x2?.message,
            errors?.[propertyName]?.y2?.message,
          ]
            .filter(Boolean)
            .join(". ")}
        </Text>
      </HStack>

      <HStack spacing={0}>
        <InputGroup flex="1.52">
          <InputLeftElement
            pointerEvents="none"
            background={leftAccessoryBackground}
            borderLeftRadius="md"
          >
            <Icon as={RxArrowBottomRight} color="gray.500" />
          </InputLeftElement>
          <Input
            fontSize="sm"
            type="number"
            value={perspective.x3 ?? ""}
            placeholder="X3"
            isInvalid={!!errors?.[propertyName]?.x3}
            onChange={handleFieldChange("x3")}
            borderRightRadius={0}
          />
        </InputGroup>
        <Input
          fontSize="sm"
          type="number"
          value={perspective.y3 ?? ""}
          placeholder="Y3"
          flex="1"
          isInvalid={!!errors?.[propertyName]?.y3}
          onChange={handleFieldChange("y3")}
          borderLeftRadius={0}
          borderLeft={0}
          paddingInlineStart="0.1em"
        />
        <Text fontSize="xs" color={errorRed}>
          {[
            errors?.[propertyName]?.x3?.message,
            errors?.[propertyName]?.y3?.message,
          ]
            .filter(Boolean)
            .join(". ")}
        </Text>
      </HStack>

      <HStack spacing={0}>
        <InputGroup flex="1.52">
          <InputLeftElement
            pointerEvents="none"
            background={leftAccessoryBackground}
            borderLeftRadius="md"
          >
            <Icon as={RxArrowBottomLeft} color="gray.500" />
          </InputLeftElement>
          <Input
            fontSize="sm"
            type="number"
            value={perspective.x4 ?? ""}
            placeholder="X4"
            isInvalid={!!errors?.[propertyName]?.x4}
            onChange={handleFieldChange("x4")}
            borderRightRadius={0}
          />
        </InputGroup>
        <Input
          fontSize="sm"
          type="number"
          value={perspective.y4 ?? ""}
          placeholder="Y4"
          flex="1"
          isInvalid={!!errors?.[propertyName]?.y4}
          onChange={handleFieldChange("y4")}
          borderLeftRadius={0}
          borderLeft={0}
          paddingInlineStart="0.1em"
        />
        <Text fontSize="xs" color={errorRed}>
          {[
            errors?.[propertyName]?.x4?.message,
            errors?.[propertyName]?.y4?.message,
          ]
            .filter(Boolean)
            .join(". ")}
        </Text>
      </HStack>
    </VStack>
  );
};

export default DistortPerspectiveInput;
