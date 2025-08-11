import { Center, Flex, Spinner } from "@chakra-ui/react"
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
    _internalState,
  } = useEditorStore()

  const isCollapsed = _internalState.isToolbarCollapsed

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
          <RetryableImage
            src={currentImage}
            maxH={`calc(100vh - 2*var(--chakra-space-16) - ${
              isCollapsed ? "var(--chakra-space-12)" : "var(--chakra-space-44)"
            } - 2*var(--chakra-space-4))`}
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
          />
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
