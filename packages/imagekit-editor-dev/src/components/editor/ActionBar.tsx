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
import { PiGridFour } from "@react-icons/all-files/pi/PiGridFour"
import { PiImageSquare } from "@react-icons/all-files/pi/PiImageSquare"
import { PiListBullets } from "@react-icons/all-files/pi/PiListBullets"
import { type FC, useMemo } from "react"
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
  const {
    currentImage,
    imageList,
    originalImageList,
    showOriginal,
    setShowOriginal,
    _internalState,
  } = useEditorStore()
  const overlayMode = _internalState.overlayMode

  const imageDimensions = useMemo(() => {
    const idx = imageList.findIndex((img) => img === currentImage)
    if (idx === -1) return null
    return originalImageList[idx].imageDimensions
  }, [currentImage, imageList, originalImageList])

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
        {!overlayMode && (
          <Button
            variant="ghost"
            size="md"
            fontWeight="normal"
            leftIcon={<Icon boxSize={4} as={PiImageSquare} />}
            _hover={{ bg: "gray.100" }}
            onClick={() => setShowOriginal(!showOriginal)}
          >
            {showOriginal ? "Show Transformed" : "Show Original"}
          </Button>
        )}

        {!overlayMode && viewMode === "list" && imageDimensions && (
          <>
            <Divider
              orientation="vertical"
              h="6"
              borderColor="editorBattleshipGrey.200"
            />
            <Text
              fontSize="md"
              fontWeight="medium"
              whiteSpace="nowrap"
              paddingX="4"
            >
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
            rightIcon={<Icon boxSize={5} as={ExternalLinkIcon} />}
            variant="ghost"
            size="md"
            fontWeight="normal"
            _hover={{ bg: "gray.100" }}
            onClick={() => window.open(currentImage, "_blank")}
          >
            Open image in new tab
          </Button>
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
            isDisabled={overlayMode}
            visibility={overlayMode ? "hidden" : "visible"}
          />
        </Tooltip>
      </HStack>
    </Box>
  )
}
