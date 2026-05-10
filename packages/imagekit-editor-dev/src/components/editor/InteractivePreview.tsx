import { Box, Center, Spinner } from "@chakra-ui/react"
import {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { buildBackdropUrl, buildSingleLayerUrl } from "../../buildTemplateUrl"
import { useCoordinateSpace } from "../../hooks/useCoordinateSpace"
import { useEditorStore } from "../../store"
import { isLayerTransformation } from "../../utils/layerGeometry"
import RetryableImage from "../RetryableImage"
import { MoveableLayerController } from "./MoveableLayerController"

interface InteractivePreviewProps {
  maxH: string
  maxW: string
}

/**
 * Renders the preview with individually-interactive layer overlays.
 *
 * Structure:
 * - Backdrop image (base + non-layer transforms, no overlays)
 * - One <img> per visible layer, stacked in transformation order
 * - The selected layer gets a Moveable gizmo for drag/resize
 */
export const InteractivePreview: FC<InteractivePreviewProps> = ({
  maxH,
  maxW,
}) => {
  const {
    canvas,
    currentImage,
    transformations,
    visibleTransformations,
    originalImageList,
    signingImages,
    imagekitId,
    _internalState,
    _setSelectedLayerId,
    setImageDimensions,
  } = useEditorStore()

  const containerRef = useRef<HTMLDivElement>(null)

  // Track the backdrop image's actual rendered dimensions (naturalWidth/Height)
  // so that size-changing transforms (e.g. border) are reflected in all
  // layer position calculations.
  const [backdropDims, setBackdropDims] = useState<{
    width: number
    height: number
  } | null>(null)

  const coordSpace = useCoordinateSpace(containerRef, backdropDims)

  const selectedLayerId = _internalState.selectedLayerId

  // Resolve the original (untransformed) source URL for image mode.
  // `currentImage` from the store is the *composed* URL, so we must look up
  // the original entry to pass a clean src to buildBackdropUrl.
  const originalImageUrl = useMemo(() => {
    if (canvas) return undefined
    if (!currentImage) return undefined
    const idx = useEditorStore
      .getState()
      .imageList.findIndex((img) => img === currentImage)
    if (idx === -1) return currentImage
    return originalImageList[idx]?.url ?? currentImage
  }, [canvas, currentImage, originalImageList])

  // Get visible layer transformations in stack order
  const layerTransformations = useMemo(
    () =>
      transformations.filter(
        (t) =>
          isLayerTransformation(t.key) &&
          visibleTransformations[t.id] !== false,
      ),
    [transformations, visibleTransformations],
  )

  // Build backdrop URL (base + non-layer transforms)
  const backdropUrl = useMemo(
    () =>
      buildBackdropUrl({
        transformations,
        visibleTransformations,
        imageUrl: originalImageUrl,
        canvas,
        imagekitId,
      }),
    [
      transformations,
      visibleTransformations,
      originalImageUrl,
      canvas,
      imagekitId,
    ],
  )

  // Reset backdrop dims when the URL changes so stale sizes don't linger.
  useEffect(() => {
    setBackdropDims(null)
  }, [backdropUrl])

  // Build per-layer URLs
  const layerUrls = useMemo(() => {
    const urls: Record<string, string | null> = {}
    for (const layer of layerTransformations) {
      urls[layer.id] = buildSingleLayerUrl({
        transformations,
        visibleTransformations,
        layerId: layer.id,
        imagekitId,
      })
    }
    return urls
  }, [
    transformations,
    visibleTransformations,
    layerTransformations,
    imagekitId,
  ])

  const handleBackdropLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const natW = event.currentTarget.naturalWidth
      const natH = event.currentTarget.naturalHeight

      // Update backdrop dims used for coordinate-space calculations.
      setBackdropDims({ width: natW, height: natH })

      if (!currentImage) return
      const idx = useEditorStore
        .getState()
        .imageList.findIndex((img) => img === currentImage)
      if (idx === -1) return
      const originalUrl = originalImageList[idx]?.url
      if (!originalUrl) return
      setImageDimensions(originalUrl, {
        width: natW,
        height: natH,
      })
    },
    [currentImage, originalImageList, setImageDimensions],
  )

  const isLoading = useMemo(() => {
    const idx = useEditorStore
      .getState()
      .imageList.findIndex((img) => img === currentImage)
    if (idx === -1) return false
    const originalUrl = originalImageList[idx]?.url
    return originalUrl ? signingImages[originalUrl] : false
  }, [currentImage, originalImageList, signingImages])

  const handleLayerClick = useCallback(
    (layerId: string) => {
      _setSelectedLayerId(layerId)
    },
    [_setSelectedLayerId],
  )

  const handleBackdropClick = useCallback(() => {
    _setSelectedLayerId(null)
  }, [_setSelectedLayerId])

  if (!backdropUrl) {
    return (
      <Center h="full" w="full">
        <Spinner />
      </Center>
    )
  }

  return (
    <Box
      ref={containerRef}
      position="relative"
      display="inline-block"
      maxH={maxH}
      maxW={maxW}
      onClick={handleBackdropClick}
    >
      {/* Backdrop: base image + non-layer transforms */}
      <RetryableImage
        src={backdropUrl}
        maxH={maxH}
        maxW={maxW}
        fallback={
          <Center h="full" w="full">
            <Spinner />
          </Center>
        }
        isLoading={isLoading}
        onLoad={handleBackdropLoad}
      />

      {/* Layer images stacked on top */}
      {layerTransformations.map((layer, index) => {
        const url = layerUrls[layer.id]
        if (!url) return null

        const isSelected = selectedLayerId === layer.id

        return (
          <MoveableLayerController
            key={layer.id}
            layer={layer}
            layerUrl={url}
            isSelected={isSelected}
            zIndex={index + 1}
            coordSpace={coordSpace}
            onClick={() => handleLayerClick(layer.id)}
          />
        )
      })}
    </Box>
  )
}
