import { Center, Flex, Spinner } from "@chakra-ui/react"
import { type FC, useMemo } from "react"
import { useEditorStore } from "../../store"
import { isLayerTransformation } from "../../utils/layerGeometry"
import RetryableImage from "../RetryableImage"
import { Toolbar } from "../toolbar"
import { InteractivePreview } from "./InteractivePreview"

interface ListViewProps {
  onAddImage?: () => void
}

export const ListView: FC<ListViewProps> = ({ onAddImage }) => {
  const {
    canvas,
    currentImage,
    setCurrentImage,
    imageList,
    originalImageList,
    signingImages,
    setImageDimensions,
    transformations,
    visibleTransformations,
    _internalState,
  } = useEditorStore()

  const maxH = `calc(100vh - 2*var(--chakra-space-16) - var(--chakra-space-44) - 2*var(--chakra-space-4))`
  const maxW = "calc(100vw - 2*var(--chakra-space-96) - 2*var(--chakra-space-4))"

  // Check if there are any visible layer transformations
  const hasVisibleLayers = useMemo(
    () =>
      transformations.some(
        (t) =>
          isLayerTransformation(t.key) &&
          visibleTransformations[t.id] !== false,
      ),
    [transformations, visibleTransformations],
  )

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
          {hasVisibleLayers ? (
            <InteractivePreview maxH={maxH} maxW={maxW} />
          ) : (
            <RetryableImage
              src={currentImage}
              maxH={maxH}
              maxW={maxW}
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
                const originalUrl = originalImageList[idx]?.url
                if (!originalUrl) return
                setImageDimensions(originalUrl, {
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }}
            />
          )}
        </Flex>
      </Flex>
      {/* Hide toolbar in canvas-only mode (no base images) */}
      {!(canvas && originalImageList.length === 0) && (
        <Toolbar
          onAddImage={onAddImage}
          onSelectImage={(imageSrc: string) => {
            setCurrentImage(imageSrc)
          }}
        />
      )}
    </>
  )
}
