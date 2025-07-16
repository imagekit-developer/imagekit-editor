import { Box, Flex, Icon, Image, Text } from "@chakra-ui/react"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import type { FC } from "react"
import { useEditorStore } from "../../store"

interface GridViewProps {
  imageSize: number
  onAddImage?: () => void
}

export const GridView: FC<GridViewProps> = ({ imageSize, onAddImage }) => {
  const { currentImage, setCurrentImage, imageList } = useEditorStore()
  return (
    <Flex
      flex="1"
      padding={8}
      overflow="auto"
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
              <Text mt={2} fontSize="sm" color="gray.500">
                Add New Image
              </Text>
            </Flex>
          </Flex>

          {imageList.map((imageSrc, index) => (
            <Box
              key={imageSrc}
              position="relative"
              cursor="pointer"
              onClick={() => setCurrentImage(imageSrc)}
              borderWidth={imageSrc === currentImage ? "2px" : "1px"}
              borderColor={imageSrc === currentImage ? "blue.500" : "gray.200"}
              borderStyle="solid"
              borderRadius="md"
              overflow="hidden"
              transition="all 0.2s"
              _hover={{ transform: "scale(1.02)", boxShadow: "md" }}
              width={`${imageSize}px`}
              height={`${imageSize}px`}
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="white"
            >
              <Image
                src={imageSrc}
                maxWidth="100%"
                maxHeight="100%"
                objectFit="contain"
                alt={`Image ${index + 1}`}
              />
            </Box>
          ))}
        </Flex>
      </Box>
    </Flex>
  )
}
