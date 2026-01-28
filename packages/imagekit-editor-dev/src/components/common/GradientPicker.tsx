import {
  Flex,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  FormLabel,
  Box,
} from "@chakra-ui/react";
import { memo, useEffect, useState, useMemo } from "react";
import ColorPicker, { useColorPicker } from "react-best-gradient-color-picker";
import { useDebounce } from "../../hooks/useDebounce";
import AnchorField from "./AnchorField";
import RadioCardField from "./RadioCardField";
import { TbAngle } from "@react-icons/all-files/tb/TbAngle";
import { BsArrowsMove } from "@react-icons/all-files/bs/BsArrowsMove";

export type GradientPickerState = {
  from: string;
  to: string;
  direction: number | string;
  stopPoint: number;
};

type DirectionMode = "direction" | "degrees";

function rgbaToHex(rgba: string): string {
  const parts = rgba.match(/[\d.]+/g)?.map(Number) ?? [];

  if (parts.length < 3) return "#000000";

  const [r, g, b, a] = parts;

  const clamp8 = (v: number) => Math.max(0, Math.min(255, v));

  const rgbHex = [r, g, b]
    .map(clamp8)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");

  if (a === undefined) {
    return `#${rgbHex}`;
  }
  const alphaDec = a > 1 ? a / 100 : a;
  const alphaHex = Math.round(alphaDec * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `#${rgbHex}${alphaHex}`;
}

const GradientPickerField = ({
  fieldName,
  setValue,
  value,
}: {
  fieldName: string;
  setValue: (name: string, value: GradientPickerState | string) => void;
  value?: GradientPickerState | null;
}) => {
  function getLinearGradientString(value: GradientPickerState): string {
    let direction = "";
    if (typeof value.direction === "number") {
      direction = `${value.direction}deg`;
    } else {
      direction = `to ${value.direction.split("_").join(" ")}`;
    }
    return `linear-gradient(${direction}, ${value.from} 0%, ${value.to} ${value.stopPoint}%)`;
  }

  const [localValue, setLocalValue] = useState<GradientPickerState>(
    value ?? {
      from: "#FFFFFFFF",
      to: "#00000000",
      direction: "bottom",
      stopPoint: 100,
    },
  );
  const [directionMode, setDirectionMode] =
    useState<DirectionMode>("direction");

  const [gradient, setGradient] = useState<string>(
    getLinearGradientString(localValue),
  );

  const { getGradientObject } = useColorPicker(gradient, setGradient);

  function getAngleValue(): number {
    if (typeof localValue.direction === "number") {
      return localValue.direction;
    }
    const direction = localValue.direction as string;
    const directionMap: Record<string, number> = {
      top: 0,
      top_right: 45,
      right: 90,
      bottom_right: 135,
      bottom: 180,
      bottom_left: 225,
      left: 270,
      top_left: 315,
    };
    return directionMap[direction] || 180;
  }

  function getDirectionValue(): string {
    if (typeof localValue.direction === "string") {
      return localValue.direction;
    }
    const angle = localValue.direction as number;
    const nearestAngle = Math.round(angle / 45) * 45;
    const angleMap: Record<number, string> = {
      0: "top",
      45: "top_right",
      90: "right",
      135: "bottom_right",
      180: "bottom",
      225: "bottom_left",
      270: "left",
      315: "top_left",
    };
    return angleMap[nearestAngle] || "bottom";
  }

  const debouncedValue = useDebounce<GradientPickerState>(localValue, 500);

  function handleGradientChange(gradientVal: string) {
    const gradientObj = getGradientObject(gradientVal);
    console.log("Gradient Object:", gradientObj);
    console.log("Gradient String:", gradientVal);

    if (!gradientObj || !gradientObj.isGradient) return;

    const { colors } = gradientObj;
    if (colors.length !== 2) return;
    if (colors[0].left !== 0) return;
    setGradient(gradientVal);

    const fromColor = rgbaToHex(colors[0].value).toUpperCase();
    const toColor = rgbaToHex(colors[1].value).toUpperCase();
    const stopPoint = colors[1].left;
    console.log({ stopPoint, fromColor, toColor });

    if (
      fromColor !== localValue.from ||
      toColor !== localValue.to ||
      stopPoint !== localValue.stopPoint
    ) {
      setLocalValue({
        ...localValue,
        from: fromColor,
        to: toColor,
        stopPoint: stopPoint,
      });
    }
  }

  function applyGradientInputChanges(newValue: GradientPickerState) {
    const gradientString = getLinearGradientString(newValue);
    setGradient(gradientString);
    setLocalValue(newValue);
  }

  useEffect(() => {
    setValue(fieldName, debouncedValue);
  }, [debouncedValue, fieldName, setValue]);

  return (
    <Flex direction="column" gap="2">
      <Popover
        placement="auto"
        closeOnBlur={true}
        strategy="fixed"
        gutter={2}
        lazyBehavior="unmount"
      >
        <PopoverTrigger>
          <Flex
            width="20"
            height="20"
            align="center"
            justify="center"
            bg={gradient}
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="4px"
            cursor="pointer"
          />
        </PopoverTrigger>
        <PopoverContent p="2" width="auto" zIndex={1400}>
          <PopoverBody p="0">
            <ColorPicker
              value={gradient}
              onChange={handleGradientChange}
              disableDarkMode
              hideGradientAngle
              hideGradientType
              hideColorTypeBtns
              hideInputType
              hideAdvancedSliders
              hideColorGuide
            />
          </PopoverBody>
        </PopoverContent>
      </Popover>

      <Box>
        <FormLabel htmlFor="from_color" fontSize="sm">
          From Color
        </FormLabel>
        <Input
          size="md"
          value={localValue.from}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue.match(/^#[0-9A-Fa-f]{0,8}$/)) {
              applyGradientInputChanges({ ...localValue, from: newValue });
            } else if (newValue === "") {
              applyGradientInputChanges({ ...localValue, from: "" });
            }
          }}
          borderColor="gray.200"
          placeholder="#FFFFFF"
          fontFamily="mono"
          borderRadius="4px"
        />
      </Box>

      <Box>
        <FormLabel htmlFor="to_color" fontSize="sm">
          To Color
        </FormLabel>
        <Input
          size="md"
          value={localValue.to}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue.match(/^#[0-9A-Fa-f]{0,8}$/)) {
              applyGradientInputChanges({ ...localValue, to: newValue });
            } else if (newValue === "") {
              applyGradientInputChanges({ ...localValue, to: "" });
            }
          }}
          borderColor="gray.200"
          placeholder="#FFFFFF"
          fontFamily="mono"
          borderRadius="4px"
        />
      </Box>

      <Box>
        <FormLabel htmlFor="linear_direction" fontSize="sm">
          Linear Direction
        </FormLabel>
        <Box marginBottom="2" marginTop="2">
          <RadioCardField
            options={[
              { label: "Direction", value: "direction", icon: BsArrowsMove },
              { label: "Degrees", value: "degrees", icon: TbAngle },
            ]}
            value={directionMode}
            onChange={(val) => {
              setDirectionMode((val || "direction") as DirectionMode);
              const newDirection =
                val === "direction" ? getDirectionValue() : getAngleValue();
              applyGradientInputChanges({
                ...localValue,
                direction: newDirection,
              });
            }}
          />
        </Box>
        {directionMode === "direction" ? (
          <AnchorField
            value={getDirectionValue()}
            onChange={(val) => {
              applyGradientInputChanges({ ...localValue, direction: val });
            }}
            positions={[
              "top",
              "bottom",
              "left",
              "right",
              "top_left",
              "top_right",
              "bottom_left",
              "bottom_right",
            ]}
          />
        ) : (
          <Input
            size="md"
            value={getAngleValue()}
            type="number"
            min={0}
            max={359}
            onChange={(e) => {
              const newValue = e.target.value;
              const intVal = newValue === "" ? 0 : Number(newValue);
              if (intVal < 0 || intVal > 359) return;
              applyGradientInputChanges({ ...localValue, direction: intVal });
            }}
            borderColor="gray.200"
            placeholder="#FFFFFF"
            fontFamily="mono"
            borderRadius="4px"
          />
        )}
      </Box>

      <Box>
        <FormLabel htmlFor="stop_point" fontSize="sm">
          Stop Point (%)
        </FormLabel>
        <Input
          size="md"
          value={localValue.stopPoint}
          type="number"
          min={1}
          max={100}
          onChange={(e) => {
            const newValue = e.target.value;
            const intVal = newValue === "" ? 1 : Number(newValue);
            if (intVal < 1 || intVal > 100) return;
            applyGradientInputChanges({
              ...localValue,
              stopPoint: intVal,
            });
          }}
          borderColor="gray.200"
          placeholder="#FFFFFF"
          fontFamily="mono"
          borderRadius="4px"
        />
      </Box>
    </Flex>
  );
};

export default memo(GradientPickerField);
