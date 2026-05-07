import { Center, Flex, Icon, Spinner, Text } from "@chakra-ui/react"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import type { FC } from "react"
import { useEditorStore } from "../../store"
import RetryableImage from "../RetryableImage"
import { Toolbar } from "../toolbar"

interface ListViewProps {
  onAddImage?: () => void
}

export const ListView: FC<ListViewProps> = ({ onAddImage }) => {
  const {
    currentImage,
    setCurrentImage,
    imageList,
    originalImageList,
    signingImages,
    setImageDimensions,
    _internalState,
  } = useEditorStore()

  const isEmpty = imageList.length === 0

  return (
    <>
      <Flex
        flex="1 0 0"
        padding={8}
        overflow="auto"
        justifyContent="center"
        alignItems="flex-start"
        position="relative"
      >
        <Flex
          flex="1 0 0"
          direction="column"
          alignItems="center"
          justifyContent="center"
          height="full"
          width="full"
        >
          {isEmpty ? (
            <Flex
              direction="column"
              alignItems="center"
              justifyContent="center"
              gap={3}
              color="gray.500"
              cursor={onAddImage ? "pointer" : "default"}
              onClick={onAddImage}
              padding={10}
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="gray.300"
              borderRadius="md"
              bg="gray.50"
              _hover={onAddImage ? { bg: "gray.100" } : undefined}
              transition="background 0.2s"
            >
              <Icon as={PiPlus} boxSize={10} />
              <Text fontSize="md" fontWeight="medium">
                No image to preview
              </Text>
              <Text fontSize="sm">
                {onAddImage
                  ? "Add an image to preview your template."
                  : "Provide an image to preview this template."}
              </Text>
            </Flex>
          ) : (
            <RetryableImage
              src={currentImage}
              maxH={`calc(100vh - 2*var(--chakra-space-16) - var(--chakra-space-44) - 2*var(--chakra-space-4))`}
              maxW={
                "calc(100vw - 2*var(--chakra-space-96) - 2*var(--chakra-space-4))"
              }
              fallback={
                <Center h="full" w="full">
                  <Spinner />
                </Center>
              }
              isLoading={(() => {
                const idx = imageList.findIndex((img) => img === currentImage)
                if (idx === -1) return false
                const originalUrl = originalImageList[idx]?.url
                return originalUrl ? signingImages[originalUrl] : false
              })()}
              onLoad={(event) => {
                console.log(event)
                if (!currentImage) return
                const idx = imageList.findIndex((img) => img === currentImage)
                if (idx === -1) return
                // biome-ignore lint/style/noNonNullAssertion: <required here>
                setImageDimensions(originalImageList[idx]!.url, {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }}
            />
          )}
        </Flex>
      </Flex>
      <Toolbar
        onAddImage={onAddImage}
        onSelectImage={(imageSrc: string) => {
          setCurrentImage(imageSrc)
        }}
      />
    </>
  )
}
