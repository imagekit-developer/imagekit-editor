import {
  Flex,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
} from "@chakra-ui/react"
import { memo, useEffect, useState } from "react"
import ColorPicker from "react-best-gradient-color-picker"
import { useDebounce } from "../../hooks/useDebounce"

const ColorPickerField = ({
  fieldName,
  value,
  setValue,
}: {
  fieldName: string
  value: string
  setValue: (name: string, value: string) => void
}) => {
  const [localValue, setLocalValue] = useState<string>(value || "#FFFFFF")

  const handleColorChange = (color: string) => {
    const parts = color.match(/[\d.]+/g)?.map(Number) ?? []

    if (parts.length < 3) return

    const [r, g, b, a] = parts

    const clamp8 = (v: number) => Math.max(0, Math.min(255, v))

    const rgbHex = [r, g, b]
      .map(clamp8)
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")

    if (a === undefined) {
      setLocalValue(`#${rgbHex}`)
    } else {
      const alphaDec = a > 1 ? a / 100 : a
      const alphaInt = clamp8(Math.round(alphaDec * 255))
      setLocalValue(`#${rgbHex}${alphaInt.toString(16).padStart(2, "0")}`)
    }
  }

  const debouncedValue = useDebounce<string>(localValue, 500)

  useEffect(() => {
    setValue(fieldName, debouncedValue)
  }, [debouncedValue, fieldName, setValue])

  return (
    <Flex direction="column" gap="2">
      <Flex>
        <Input
          size="sm"
          value={localValue || "#FFFFFF"}
          onChange={(e) => {
            const newValue = e.target.value
            if (newValue.match(/^#[0-9A-Fa-f]{0,8}$/) || newValue === "") {
              setLocalValue(newValue || "#FFFFFF")
            }
          }}
          borderColor="gray.200"
          placeholder="#FFFFFF"
          fontFamily="mono"
          borderRightRadius="0"
          width="calc(100% - 32px)"
        />
        <Popover
          placement="auto"
          closeOnBlur={true}
          strategy="fixed"
          gutter={2}
          lazyBehavior="unmount"
        >
          <PopoverTrigger>
            <Flex
              width="32px"
              height="32px"
              align="center"
              justify="center"
              bg={localValue || "#FFFFFF"}
              borderWidth="1px"
              borderColor="gray.200"
              borderLeft="0"
              borderRightRadius="md"
              cursor="pointer"
            />
          </PopoverTrigger>
          <PopoverContent p="2" width="auto" zIndex={1400}>
            <PopoverBody p="0">
              <ColorPicker
                value={localValue || "#FFFFFF"}
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
              />
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
    </Flex>
  )
}

export default memo(ColorPickerField)
