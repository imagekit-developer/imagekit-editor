import { Center, Flex, Spinner } from "@chakra-ui/react"
import type { FC } from "react"
import { useEditorStore } from "../../store"
import RetryableImage from "../RetryableImage"
import { Toolbar } from "../toolbar"
import { UrlPreviewStrip } from "./UrlPreviewStrip"

interface ListViewProps {
  onAddImage?: () => void
}

export const ListView: FC<ListViewProps> = ({ onAddImage }) => {
  const {
    currentImage,
    currentPrimitiveImage,
    setCurrentImage,
    imageList,
    originalImageList,
    signingImages,
    setImageDimensions,
    templateVariables,
    userPrefs,
    _internalState,
  } = useEditorStore()

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
        </Flex>
      </Flex>
      {userPrefs.showUrlPreviewStrip &&
      currentImage &&
      currentPrimitiveImage ? (
        <UrlPreviewStrip
          primitiveUrl={currentPrimitiveImage}
          finalUrl={currentImage}
          templateVariables={templateVariables}
        />
      ) : null}
      <Toolbar
        onAddImage={onAddImage}
        onSelectImage={(imageSrc: string) => {
          setCurrentImage(imageSrc)
        }}
      />
    </>
  )
}
