import {
  Box,
  Center,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiX } from "@react-icons/all-files/pi/PiX"
import type { FC } from "react"
import { useEditorStore } from "../../store"
import Hover from "../common/Hover"
import RetryableImage from "../RetryableImage"

interface GridViewProps {
  imageSize: number
  onAddImage?: () => void
}

export const GridView: FC<GridViewProps> = ({ imageSize, onAddImage }) => {
  const { currentImage, setCurrentImage, imageList, isSigning, removeImage } =
    useEditorStore()
  return (
    <Flex
      flex="1"
      padding={8}
      overflowY="scroll"
      justifyContent="center"
      alignItems="flex-start"
      position="relative"
    >
      <Box width="full">
        <Flex flexWrap="wrap" gap={4} justifyContent="flex-start" width="full">
          <Flex
            width={`${imageSize}px`}
            height={`${imageSize}px`}
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="gray.300"
            borderRadius="md"
            justifyContent="center"
            alignItems="center"
            cursor="pointer"
            transition="all 0.2s"
            bg="gray.50"
            onClick={onAddImage}
            _hover={{ bg: "gray.100", transform: "scale(1.02)" }}
            mb={2}
          >
            <Flex direction="column" alignItems="center">
              <Icon as={PiPlus} boxSize={8} color="gray.500" />
              <Text mt={2} fontSize="md" color="gray.500">
                Add New Image
              </Text>
            </Flex>
          </Flex>

          {imageList.map((imageSrc) => (
            <Hover display="block" key={imageSrc}>
              {(isHovered) => (
                <Box
                  key={imageSrc}
                  position="relative"
                  cursor="pointer"
                  onClick={() => setCurrentImage(imageSrc)}
                  borderWidth={imageSrc === currentImage ? "2px" : "1px"}
                  borderColor={
                    imageSrc === currentImage ? "blue.500" : "gray.200"
                  }
                  borderStyle="solid"
                  borderRadius="md"
                  transition="all 0.2s"
                  _hover={{ transform: "scale(1.02)", boxShadow: "md" }}
                  width={`${imageSize}px`}
                  height={`${imageSize}px`}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="white"
                >
                  {isHovered && (
                    <IconButton
                      variant="unstyled"
                      position="absolute"
                      minW="6"
                      h="6"
                      top={0}
                      right={0}
                      zIndex={2}
                      transition="opacity 0.2s"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      borderRadius="full"
                      bg="white"
                      border="1px solid"
                      borderColor="editorBattleshipGrey.100"
                      transform="translateY(-40%) translateX(40%)"
                      isLoading={isSigning}
                      isDisabled={imageList.length === 1}
                      _disabled={{
                        background: "editorBattleshipGrey.100",
                        cursor: "not-allowed",
                        color: "editorBattleshipGrey.400",
                        "&:hover": {
                          background:
                            "var(--chakra-colors-editorBattleshipGrey-100) !important",
                          cursor: "not-allowed",
                          color:
                            "var(--chakra-colors-editorBattleshipGrey-400) !important",
                        },
                      }}
                      boxShadow="md"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeImage(imageSrc)
                      }}
                      aria-label="Remove image"
                      icon={<Icon as={PiX} size="14px" />}
                    />
                  )}

                  <RetryableImage
                    showRetryButton={false}
                    compactError
                    src={imageSrc}
                    alt={`Image`}
                    height={`${imageSize}px`}
                    width="auto"
                    minWidth={`${imageSize}px`}
                    objectFit="contain"
                    borderRadius="md"
                    borderWidth={currentImage === imageSrc ? "2px" : "1px"}
                    borderStyle="solid"
                    borderColor={
                      currentImage === imageSrc
                        ? "editorBlue.300"
                        : "editorBattleshipGrey.100"
                    }
                    fallback={
                      <Center h={`${imageSize}px`} w={`${imageSize}px`}>
                        <Spinner />
                      </Center>
                    }
                    isLoading={isSigning}
                  />
                </Box>
              )}
            </Hover>
          ))}
        </Flex>
      </Box>
    </Flex>
  )
}
