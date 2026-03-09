import {
  Flex,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from "@chakra-ui/react"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { memo, useEffect, useState } from "react"
import ColorPicker, {
  type ColorPickerProps,
} from "react-best-gradient-color-picker"
import { useDebounce } from "../../hooks/useDebounce"

const ColorPickerField = ({
  fieldName,
  value,
  setValue,
  fieldProps,
  isClearable,
}: {
  fieldName: string
  value: string
  setValue: (name: string, value: string) => void
  fieldProps?: ColorPickerProps
  isClearable?: boolean
}) => {
  const [localValue, setLocalValue] = useState<string>(value)

  /**
   * @note: This parsing behavior is not a bug, it has been mimicked to match the downstream service
   * logic i.e. parseInt(hexAlpha, 10) / 100, which parses the hex digits as decimal, stopping at
   * non-digit characters.
   */
  const parseAlphaLikeDownstream = (hexAlpha: string): number => {
    const parsed = parseInt(hexAlpha, 10)
    return Number.isNaN(parsed) ? 0 : parsed / 100
  }

  /**
   * Helper function to convert alpha back to hex format that will parse correctly downstream.
   * We need to find a hex value that, when parsed as decimal by downstream, gives us the desired alpha.
   *
   * For example:
   * - If alpha is 0.99, we want downstream to get 99, so we need "99" in hex
   * - If alpha is 0.5, we want downstream to get 50, so we need "50" in hex
   */
  const alphaToHexForDownstream = (alpha: number): string => {
    const targetDecimal = Math.round(alpha * 100)
    const clampedDecimal = Math.max(0, Math.min(99, targetDecimal))
    return clampedDecimal.toString().padStart(2, "0")
  }

  // Convert a color from downstream format to standard format for the color picker
  const convertDownstreamToStandard = (color: string): string => {
    if (!color || !color?.startsWith("#") || color?.length !== 9) {
      return color
    }

    const rgb = color.slice(1, 7)
    const alphaHex = color.slice(7, 9)
    const parsedAlpha = parseAlphaLikeDownstream(alphaHex)

    // Convert to standard 0-255 range
    const standardAlphaInt = Math.round(parsedAlpha * 255)
    const standardAlphaHex = standardAlphaInt.toString(16).padStart(2, "0")

    return `#${rgb}${standardAlphaHex}`
  }

  // Get the preview color that shows what downstream will actually render
  const getPreviewColor = (color: string): string => {
    if (!color || !color?.startsWith("#")) {
      return color
    }

    if (color.length === 9) {
      // Has alpha channel - convert using downstream logic
      return convertDownstreamToStandard(color)
    }

    return color
  }

  const handleColorChange = (color: string) => {
    const parts = color.match(/[\d.]+/g)?.map(Number) ?? []

    if (parts.length < 3) return

    const [r, g, b, a] = parts

    const clamp8 = (v: number) => Math.max(0, Math.min(255, v))

    const rgbHex = [r, g, b]
      .map(clamp8)
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")

    if (fieldProps?.hideOpacity === true || a === undefined) {
      setLocalValue(`#${rgbHex}`)
    } else {
      const alphaDec = a > 1 ? a / 100 : a
      const alphaHex = alphaToHexForDownstream(alphaDec)
      setLocalValue(`#${rgbHex}${alphaHex}`)
    }
  }

  const debouncedValue = useDebounce<string>(localValue, 500)

  useEffect(() => {
    setValue(fieldName, debouncedValue)
  }, [debouncedValue, fieldName, setValue])

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleClear = () => {
    setLocalValue("")
    setValue(fieldName, "")
  }

  return (
    <Flex direction="column" gap="2">
      <Flex>
        <InputGroup width="calc(100% - var(--chakra-space-10))">
          <Input
            size="md"
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value
              if (newValue.match(/^#[0-9A-Fa-f]{0,8}$/)) {
                setLocalValue(newValue)
              } else if (newValue === "") {
                setLocalValue("")
              }
            }}
            borderColor="gray.200"
            placeholder="#FFFFFF"
            fontFamily="mono"
            borderRadius="4px"
            borderRightRadius="0"
            pr={isClearable && localValue ? "8" : undefined}
          />
          {isClearable && localValue && (
            <InputRightElement>
              <IconButton
                aria-label="Clear color"
                icon={<Icon as={PiX} boxSize="3" />}
                size="xs"
                variant="ghost"
                onClick={handleClear}
                tabIndex={-1}
              />
            </InputRightElement>
          )}
        </InputGroup>
        <Popover
          placement="auto"
          closeOnBlur={true}
          strategy="fixed"
          gutter={2}
          lazyBehavior="unmount"
        >
          <PopoverTrigger>
            <Flex
              width="10"
              height="10"
              align="center"
              justify="center"
              bg={getPreviewColor(localValue)}
              borderWidth="1px"
              borderColor="gray.200"
              borderLeft="0"
              borderRightRadius="4px"
              cursor="pointer"
            />
          </PopoverTrigger>
          <PopoverContent p="2" width="auto" zIndex={1400}>
            <PopoverBody p="0">
              <ColorPicker
                value={convertDownstreamToStandard(localValue)}
                onChange={handleColorChange}
                disableDarkMode
                hideGradientType
                hideGradientAngle
                hideGradientControls
                hideGradientStop
                hideColorTypeBtns
                hideInputType
                hideInputs
                hideAdvancedSliders
                hideColorGuide
                // @ts-expect-error - fieldProps may include props not declared in ColorPickerProps, but they are intentionally forwarded
                {...fieldProps}
              />
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
    </Flex>
  )
}

export default memo(ColorPickerField)
