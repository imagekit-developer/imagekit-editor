import {
  Box,
  Center,
  Flex,
  IconButton,
  Image,
  Spinner,
  useColorModeValue,
} from "@chakra-ui/react"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiX } from "@react-icons/all-files/pi/PiX"
import type { FC } from "react"
import { useEditorStore } from "../../store"
import Hover from "../common/Hover"

interface ToolbarProps {
  onAddImage?: () => void
  onSelectImage?: (imageSrc: string) => void
}

export const Toolbar: FC<ToolbarProps> = ({ onAddImage, onSelectImage }) => {
  const { currentImage, imageList, setCurrentImage, removeImage } =
    useEditorStore()
  const borderColor = useColorModeValue("blue.400", "blue.600")

  return (
    <Flex
      width="full"
      py="3"
      h={24}
      borderTop="1px"
      borderColor="gray.200"
      justifyContent="center"
      alignItems="center"
      bg="white"
    >
      <Flex
        position="sticky"
        left={0}
        top={0}
        height="full"
        alignItems="center"
        justifyContent="center"
        bg="white"
        px={4}
        zIndex={11}
      >
        <IconButton
          aria-label="Add new image"
          icon={<PiPlus />}
          rounded="full"
          onClick={onAddImage}
          flexShrink={0}
          size="md"
          colorScheme="blue"
        />
      </Flex>

      <Box
        flex={1}
        overflowX="auto"
        overflowY="hidden"
        py={3}
        display="block"
        whiteSpace="nowrap"
      >
        <Flex
          display="inline-flex"
          gap={3}
          pl={2}
          pr={4}
          minWidth="min-content"
        >
          {imageList.map((imageSrc) => {
            return (
              <Hover display="block" key={imageSrc}>
                {(isHovered) => (
                  <Box
                    position="relative"
                    cursor="pointer"
                    onClick={() => {
                      if (onSelectImage) {
                        onSelectImage(imageSrc)
                      } else {
                        setCurrentImage(imageSrc)
                      }
                    }}
                    opacity={currentImage === imageSrc || isHovered ? 1 : 0.7}
                    transition="all 0.2s"
                    borderRadius="md"
                    overflow="hidden"
                    h={16}
                    w={20}
                  >
                    {isHovered && (
                      <Box
                        position="absolute"
                        top={1}
                        right={1}
                        zIndex={2}
                        opacity={1}
                        transition="opacity 0.2s"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="full"
                        bg="rgba(0, 0, 0, 0.6)"
                        p={0.5}
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(imageSrc)
                        }}
                        aria-label="Remove image"
                      >
                        <PiX color="white" size="14px" />
                      </Box>
                    )}
                    <Image
                      src={imageSrc}
                      alt={`Imag`}
                      height={16}
                      width="auto"
                      minWidth={20}
                      objectFit="cover"
                      borderRadius="md"
                      border="2px solid"
                      fallback={
                        <Center h="full" w="full">
                          <Spinner />
                        </Center>
                      }
                      borderColor={
                        currentImage === imageSrc ? borderColor : "transparent"
                      }
                    />
                  </Box>
                )}
              </Hover>
            )
          })}
        </Flex>
      </Box>
    </Flex>
  )
}
