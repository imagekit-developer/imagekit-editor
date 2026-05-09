import { useCallback, useEffect, useRef, useState } from "react"
import { useEditorStore } from "../store"

interface CoordinateSpace {
  /** Base image / canvas width in source pixels. */
  canvasW: number
  /** Base image / canvas height in source pixels. */
  canvasH: number
  /** Scale factor: display pixels per source pixel. */
  scale: number
  /** Convert a delta in display pixels to source canvas pixels. */
  toCanvas: (dx: number, dy: number) => { x: number; y: number }
  /** Convert source canvas coords to display pixels relative to the preview element. */
  toDisplay: (x: number, y: number) => { x: number; y: number }
}

/**
 * Provides coordinate-space conversion between the displayed preview
 * and the source canvas/image pixels. Watches `previewRef` for resize
 * and base-image dimension changes.
 *
 * @param sourceDims - When provided, these override the canvas/image
 *   config dimensions.  Use the backdrop image's `naturalWidth` /
 *   `naturalHeight` so that size-changing transforms (e.g. border)
 *   are accounted for in all layer-position calculations.
 */
export function useCoordinateSpace(
  previewRef: React.RefObject<HTMLElement | null>,
  sourceDims?: { width: number; height: number } | null,
): CoordinateSpace {
  const { canvas, originalImageList, currentImage } = useEditorStore()

  // Determine source dimensions.
  // Prefer the caller-supplied sourceDims (actual rendered backdrop) so
  // that transforms like border are reflected in position math.
  let canvasW = 1
  let canvasH = 1
  if (sourceDims && sourceDims.width > 0 && sourceDims.height > 0) {
    canvasW = sourceDims.width
    canvasH = sourceDims.height
  } else if (canvas) {
    canvasW = canvas.width
    canvasH = canvas.height
  } else if (currentImage) {
    const img = originalImageList.find((i) => i.url === currentImage)
    if (img?.imageDimensions) {
      canvasW = img.imageDimensions.width
      canvasH = img.imageDimensions.height
    }
  }

  // Display dimensions from the preview element
  const [displayW, setDisplayW] = useState(1)
  const [displayH, setDisplayH] = useState(1)
  const roRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return

    const measure = () => {
      setDisplayW(el.clientWidth)
      setDisplayH(el.clientHeight)
    }
    measure()

    roRef.current = new ResizeObserver(measure)
    roRef.current.observe(el)
    return () => roRef.current?.disconnect()
  }, [previewRef])

  // Uniform scale — the preview image maintains aspect ratio via object-fit
  const scale = Math.min(displayW / canvasW, displayH / canvasH) || 1

  const toCanvas = useCallback(
    (dx: number, dy: number) => ({
      x: dx / scale,
      y: dy / scale,
    }),
    [scale],
  )

  const toDisplay = useCallback(
    (x: number, y: number) => ({
      x: x * scale,
      y: y * scale,
    }),
    [scale],
  )

  return { canvasW, canvasH, scale, toCanvas, toDisplay }
}
