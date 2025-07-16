import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { PiGridFour } from "@react-icons/all-files/pi/PiGridFour"
import { PiImageSquare } from "@react-icons/all-files/pi/PiImageSquare"
import { PiListBullets } from "@react-icons/all-files/pi/PiListBullets"
import { type FC, useEffect, useState } from "react"
import { useEditorStore } from "../../store"

interface ActionBarProps {
  viewMode: "list" | "grid"
  setViewMode: (mode: "list" | "grid") => void
  gridImageSize: number
  setGridImageSize: (size: number) => void
}

export const ActionBar: FC<ActionBarProps> = ({
  viewMode,
  setViewMode,
  gridImageSize,
  setGridImageSize,
}) => {
  const { currentImage } = useEditorStore()

  const [imageDimensions, setImageDimensions] = useState<{
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    if (currentImage) {
      const img = new Image()
      img.onload = () => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }
      img.src = currentImage
    }
  }, [currentImage])

  return (
    <Box
      width="full"
      py="2"
      px="4"
      h="12"
      bg="white"
      borderBottom="1px"
      borderColor="appBattleshipGrey.100"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
    >
      <HStack spacing={4}>
        <Button
          variant="ghost"
          size="xs"
          fontWeight="medium"
          leftIcon={<Icon boxSize={4} as={PiImageSquare} />}
          onClick={() => {
            alert("TODO")
          }}
        >
          Show Original
        </Button>

        <Divider
          orientation="vertical"
          h="4"
          borderColor="appBattleshipGrey.200"
        />
        {imageDimensions && (
          <Text fontSize="xs" fontWeight="medium">
            Dimensions:{" "}
            <Text as="span" fontWeight="normal">
              {imageDimensions.width} x {imageDimensions.height}
            </Text>
          </Text>
        )}
      </HStack>

      <HStack spacing={4}>
        {viewMode === "grid" && (
          <>
            <Flex alignItems="center" gap={2} width="150px">
              <Icon as={PiImageSquare} boxSize={3} />
              <Slider
                aria-label="Image size slider"
                defaultValue={gridImageSize}
                min={120}
                max={420}
                step={80}
                onChange={(val: number) => setGridImageSize(val)}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Icon as={PiImageSquare} boxSize={4} />
            </Flex>
            <Divider
              orientation="vertical"
              h="4"
              borderColor="appBattleshipGrey.200"
            />
          </>
        )}

        <Tooltip
          label={`Switch to ${viewMode === "grid" ? "List" : "Grid"} view`}
          placement="top"
        >
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Show Original"
            icon={
              <Icon
                boxSize={4}
                as={viewMode === "grid" ? PiListBullets : PiGridFour}
              />
            }
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          />
        </Tooltip>
      </HStack>
    </Box>
  )
}
