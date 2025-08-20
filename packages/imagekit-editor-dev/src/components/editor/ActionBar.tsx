import { ExternalLinkIcon } from "@chakra-ui/icons"
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
import { PiCopy } from "@react-icons/all-files/pi/PiCopy"
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
  const { currentImage, showOriginal, setShowOriginal } = useEditorStore()

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
      h="16"
      bg="white"
      borderBottom="1px"
      borderColor="editorBattleshipGrey.100"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
    >
      <HStack spacing={2} flex="1" minW={0} mr={8}>
        <Button
          variant="ghost"
          size="md"
          fontWeight="medium"
          leftIcon={<Icon boxSize={4} as={PiImageSquare} />}
          onClick={() => setShowOriginal(!showOriginal)}
        >
          {showOriginal ? "Show Transformed" : "Show Original"}
        </Button>

        {imageDimensions && (
          <>
            <Divider
              orientation="vertical"
              h="6"
              borderColor="editorBattleshipGrey.200"
            />
            <Text fontSize="md" fontWeight="medium" whiteSpace="nowrap">
              Dimensions:{" "}
              <Text as="span" fontWeight="normal">
                {imageDimensions.width} x {imageDimensions.height}
              </Text>
            </Text>
          </>
        )}

        <Divider
          orientation="vertical"
          h="6"
          borderColor="editorBattleshipGrey.200"
        />

        <Flex flex="1" minW={0} flexDirection="row" gap="2">
          <Button
            aria-label="Open in new tab"
            rightIcon={<Icon boxSize={6} as={ExternalLinkIcon} />}
            variant="ghost"
            size="md"
            fontWeight="medium"
            onClick={() => window.open(currentImage, "_blank")}
          >
            Open image in new tab
          </Button>
          <Tooltip label="Copy URL to clipboard" placement="top">
            <IconButton
              aria-label="Copy URL to clipboard"
              icon={<Icon boxSize={6} as={PiCopy} />}
              size="md"
              variant="ghost"
              onClick={async () => {
                if (currentImage) {
                  try {
                    await navigator.clipboard.writeText(currentImage)
                  } catch (err) {
                    console.error("Failed to copy URL:", err)
                  }
                }
              }}
            />
          </Tooltip>
        </Flex>
      </HStack>

      <HStack spacing={2} flexShrink={0}>
        {viewMode === "grid" && (
          <>
            <Flex alignItems="center" gap={2} width="150px">
              <Icon as={PiImageSquare} boxSize={4} />
              <Slider
                aria-label="Image size slider"
                defaultValue={gridImageSize}
                min={200}
                max={600}
                step={80}
                onChange={(val: number) => setGridImageSize(val)}
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Icon as={PiImageSquare} boxSize={6} />
            </Flex>
            <Divider
              orientation="vertical"
              h="6"
              borderColor="editorBattleshipGrey.200"
            />
          </>
        )}

        <Tooltip
          label={`Switch to ${viewMode === "grid" ? "List" : "Grid"} view`}
          placement="top"
        >
          <IconButton
            size="md"
            variant="ghost"
            aria-label="Toggle view"
            icon={
              <Icon
                boxSize={6}
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
