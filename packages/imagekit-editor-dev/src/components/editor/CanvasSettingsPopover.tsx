import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
} from "@chakra-ui/react"
import { type FC, useEffect, useState } from "react"
import ColorPicker from "react-best-gradient-color-picker"
import { type CanvasConfig, useEditorStore } from "../../store"

/**
 * Canvas dimensions are constrained to ImageKit's documented limits.
 * https://docs.imagekit.io/features/image-transformations/resize-crop-and-other-common-transformations
 */
const MIN_DIM = 1
const MAX_DIM = 12000

/** Default fully opaque white when bg is unset. */
const DEFAULT_BG = "FFFFFFFF"

/**
 * Convert any picker color string ("rgba(r, g, b, a)" or "rgb(r, g, b)") into
 * an 8-digit RRGGBBAA hex (no leading `#`). The 8-digit form is what ImageKit
 * accepts via the `bg` transformation parameter and it also encodes alpha so
 * users can pick semi-transparent canvas backgrounds.
 */
function rgbaStringToHex8(input: string): string | null {
  const parts = input.match(/[\d.]+/g)?.map(Number)
  if (!parts || parts.length < 3) return null
  const [r, g, b, a = 1] = parts
  const clamp8 = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const alpha = a > 1 ? a / 100 : a
  const alpha8 = clamp8(alpha * 255)
  return [r, g, b]
    .map(clamp8)
    .concat(alpha8)
    .map((v) => v.toString(16).padStart(2, "0").toUpperCase())
    .join("")
}

/** 8-digit hex (no `#`) → `#RRGGBBAA` for the picker input. */
function hex8ToPickerHex(hex8: string): string {
  const trimmed = hex8.replace(/^#/, "")
  if (trimmed.length === 6) return `#${trimmed.toUpperCase()}FF`
  if (trimmed.length === 8) return `#${trimmed.toUpperCase()}`
  return "#FFFFFFFF"
}

/** Pad a 6-digit hex up to 8-digit with full alpha for storage normalization. */
function normalizeStoredBg(input: string): string {
  const v = input.replace(/^#/, "").toUpperCase()
  if (/^[0-9A-F]{6}$/.test(v)) return `${v}FF`
  if (/^[0-9A-F]{8}$/.test(v)) return v
  return DEFAULT_BG
}

interface Props {
  canvas: CanvasConfig
}

export const CanvasSettingsPopover: FC<Props> = ({ canvas }) => {
  const setCanvas = useEditorStore((s) => s.setCanvas)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [width, setWidth] = useState<number>(canvas.width)
  const [height, setHeight] = useState<number>(canvas.height)
  const [bg, setBg] = useState<string>(
    normalizeStoredBg(canvas.background ?? DEFAULT_BG),
  )

  // Re-sync local state when the popover opens or external canvas changes
  // (e.g. switching templates) so we always edit the live values.
  useEffect(() => {
    setWidth(canvas.width)
    setHeight(canvas.height)
    setBg(normalizeStoredBg(canvas.background ?? DEFAULT_BG))
  }, [canvas.width, canvas.height, canvas.background])

  const apply = () => {
    setCanvas({
      width: Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(width))),
      height: Math.max(MIN_DIM, Math.min(MAX_DIM, Math.round(height))),
      background: normalizeStoredBg(bg),
    })
    onClose()
  }

  return (
    <Popover
      placement="bottom-start"
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      closeOnBlur={false}
      gutter={4}
    >
      <PopoverTrigger>
        <Button
          variant="ghost"
          size="md"
          fontWeight="normal"
          _hover={{ bg: "gray.100" }}
          leftIcon={
            <Box
              w="4"
              h="4"
              borderRadius="sm"
              borderWidth="1px"
              borderColor="gray.300"
              bg={`#${normalizeStoredBg(canvas.background ?? DEFAULT_BG)}`}
            />
          }
        >
          Canvas: {canvas.width} × {canvas.height}
        </Button>
      </PopoverTrigger>
      <PopoverContent width="320px" zIndex={1400}>
        <PopoverArrow />
        <PopoverBody p="4">
          <Flex direction="column" gap="4">
            <Text fontSize="sm" fontWeight="semibold">
              Canvas settings
            </Text>

            <HStack spacing="3" align="flex-end">
              <Flex direction="column" flex="1">
                <Text fontSize="xs" color="gray.600" mb="1">
                  Width
                </Text>
                <NumberInput
                  size="sm"
                  min={MIN_DIM}
                  max={MAX_DIM}
                  value={width}
                  onChange={(_, v) => {
                    if (!Number.isNaN(v)) setWidth(v)
                  }}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Flex>
              <Flex direction="column" flex="1">
                <Text fontSize="xs" color="gray.600" mb="1">
                  Height
                </Text>
                <NumberInput
                  size="sm"
                  min={MIN_DIM}
                  max={MAX_DIM}
                  value={height}
                  onChange={(_, v) => {
                    if (!Number.isNaN(v)) setHeight(v)
                  }}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Flex>
            </HStack>

            <Flex direction="column">
              <Text fontSize="xs" color="gray.600" mb="1">
                Background (RRGGBBAA)
              </Text>
              <InputGroup size="sm">
                <InputLeftAddon>#</InputLeftAddon>
                <Input
                  fontFamily="mono"
                  value={bg}
                  placeholder="FFFFFFFF"
                  onChange={(e) => {
                    const v = e.target.value.replace(/^#/, "").toUpperCase()
                    if (/^[0-9A-F]{0,8}$/.test(v)) setBg(v)
                  }}
                />
              </InputGroup>
              <Box mt="3">
                <ColorPicker
                  value={hex8ToPickerHex(bg)}
                  onChange={(c: string) => {
                    const next = rgbaStringToHex8(c)
                    if (next) setBg(next)
                  }}
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
                  hidePresets
                  hideEyeDrop
                />
              </Box>
            </Flex>

            <HStack justify="flex-end">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" colorScheme="blue" onClick={apply}>
                Apply
              </Button>
            </HStack>
          </Flex>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
