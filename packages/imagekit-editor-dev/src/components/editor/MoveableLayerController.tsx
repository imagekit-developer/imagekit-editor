import { Box } from "@chakra-ui/react"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Moveable from "react-moveable"
import type { Transformation } from "../../store"
import { useEditorStore } from "../../store"
import {
  extractLayerPositionConfig,
  getLayerType,
  hasExpressionCoords,
  resolveLayerRect,
} from "../../utils/layerGeometry"
import { ExpressionConfirmDialog } from "./ExpressionConfirmDialog"

interface MoveableLayerControllerProps {
  layer: Transformation
  layerUrl: string
  isSelected: boolean
  zIndex: number
  coordSpace: {
    canvasW: number
    canvasH: number
    scale: number
  }
  onClick: () => void
}

/**
 * Wraps a single layer image with a Moveable gizmo when selected.
 * Handles drag (all layers) and resize (image + solid only).
 * During drag/resize, only CSS transform is updated for smooth feedback.
 * On drag/resize end, store is updated with new coordinates.
 */
export const MoveableLayerController: FC<MoveableLayerControllerProps> = ({
  layer,
  layerUrl,
  isSelected,
  zIndex,
  coordSpace,
  onClick,
}) => {
  const targetRef = useRef<HTMLImageElement>(null)
  const { updateTransformation, _internalState, _acknowledgeExpressionOverwrite } =
    useEditorStore()
  const [showExpressionDialog, setShowExpressionDialog] = useState(false)
  const [dragBlocked, setDragBlocked] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  // Track the actual rendered dimensions of the single-layer image so we can
  // apply the correct centering offset when the layer config has no explicit
  // width/height (e.g. auto-sized text layers).
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number } | null>(null)

  // Reset when the layer URL changes (layer content was re-rendered).
  useEffect(() => {
    setNaturalDims(null)
  }, [layerUrl])

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setNaturalDims({
        w: e.currentTarget.naturalWidth,
        h: e.currentTarget.naturalHeight,
      })
    },
    [],
  )

  const layerType = getLayerType(layer.key)
  const isResizable = layerType === "image" || layerType === "solid-color"

  const value = layer.value as Record<string, unknown>
  const posConfig = extractLayerPositionConfig(value)
  const hasExpressions = hasExpressionCoords(posConfig)
  const isAcknowledged =
    _internalState.acknowledgedExpressionOverwrites.has(layer.id)

  const checkExpressionGuard = useCallback(
    (action: () => void): boolean => {
      if (hasExpressions && !isAcknowledged) {
        pendingActionRef.current = action
        setShowExpressionDialog(true)
        setDragBlocked(true)
        return false // blocked
      }
      return true // proceed
    },
    [hasExpressions, isAcknowledged],
  )

  const handleExpressionConfirm = useCallback(() => {
    _acknowledgeExpressionOverwrite(layer.id)
    setShowExpressionDialog(false)
    setDragBlocked(false)
    pendingActionRef.current?.()
    pendingActionRef.current = null
  }, [_acknowledgeExpressionOverwrite, layer.id])

  const handleExpressionCancel = useCallback(() => {
    setShowExpressionDialog(false)
    setDragBlocked(false)
    pendingActionRef.current = null
  }, [])

  const applyPositionUpdate = useCallback(
    (dx: number, dy: number) => {
      const currentValue = layer.value as Record<string, unknown>
      const currentConfig = extractLayerPositionConfig(currentValue)

      // Resolve current rect, apply the display-pixel delta, then convert
      // back to xc/yc relative to canvas center (anchorPoint = center).
      const rect = resolveLayerRect(
        currentConfig,
        coordSpace.canvasW,
        coordSpace.canvasH,
      )
      const canvasDx = dx / coordSpace.scale
      const canvasDy = dy / coordSpace.scale

      // New center of the layer in canvas pixels
      const newCenterX = rect.x + rect.w / 2 + canvasDx
      const newCenterY = rect.y + rect.h / 2 + canvasDy

      // xc/yc = offset of the layer center from the anchor point.
      // With anchorPoint "center", the anchor is at canvas center.
      const xc = Math.round(newCenterX - coordSpace.canvasW / 2)
      const yc = Math.round(newCenterY - coordSpace.canvasH / 2)

      const updatedValue = { ...currentValue }
      updatedValue.layerPositionMethod = "center"
      updatedValue.layerAnchorPoint = "center"
      updatedValue.positionXC = xc
      updatedValue.positionYC = yc
      // Clear topleft fields so they don't conflict
      delete updatedValue.positionX
      delete updatedValue.positionY

      updateTransformation(layer.id, {
        ...layer,
        value: updatedValue,
      })
    },
    [layer, coordSpace, updateTransformation],
  )

  const applySizeUpdate = useCallback(
    (width: number, height: number) => {
      const updatedValue = { ...(layer.value as Record<string, unknown>) }
      updatedValue.width = Math.round(width / coordSpace.scale)
      updatedValue.height = Math.round(height / coordSpace.scale)
      updateTransformation(layer.id, {
        ...layer,
        value: updatedValue,
      })
    },
    [layer, coordSpace.scale, updateTransformation],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClick()
    },
    [onClick],
  )

  // Compute the layer's position and size in display pixels
  const displayRect = useMemo(() => {
    const posConfig = extractLayerPositionConfig(
      layer.value as Record<string, unknown>,
    )
    const rect = resolveLayerRect(posConfig, coordSpace.canvasW, coordSpace.canvasH)

    let left = rect.x * coordSpace.scale
    let top = rect.y * coordSpace.scale
    let width = rect.w > 0 ? rect.w * coordSpace.scale : undefined
    let height = rect.h > 0 ? rect.h * coordSpace.scale : undefined

    // When the layer config has no explicit dimensions (rect.w/h === 0),
    // resolveLayerRect cannot apply the centering offset (−lw/2, −lh/2) for
    // center-mode positioning — it treats the layer as a point. Use the
    // actual rendered image dimensions to correct the position so the layer
    // *center* (not top-left) aligns with the computed anchor+offset point.
    if (naturalDims && posConfig.positionMethod === "center") {
      if (rect.w === 0) {
        const scaledW = naturalDims.w * coordSpace.scale
        left -= scaledW / 2
        width = scaledW
      }
      if (rect.h === 0) {
        const scaledH = naturalDims.h * coordSpace.scale
        top -= scaledH / 2
        height = scaledH
      }
    }

    return { left, top, width, height }
  }, [layer.value, coordSpace, naturalDims])

  return (
    <>
      <Box
        position="absolute"
        top={`${displayRect.top}px`}
        left={`${displayRect.left}px`}
        zIndex={zIndex}
        pointerEvents={isSelected ? "auto" : "none"}
        onClick={handleClick}
      >
        <img
          ref={targetRef}
          src={layerUrl}
          alt=""
          style={{
            display: "block",
            ...(displayRect.width != null
              ? { width: `${displayRect.width}px` }
              : {}),
            ...(displayRect.height != null
              ? { height: `${displayRect.height}px` }
              : {}),
            pointerEvents: isSelected ? "auto" : "none",
            cursor: isSelected ? "move" : "pointer",
          }}
          draggable={false}
          onClick={handleClick}
          onLoad={handleImageLoad}
        />

        {/* Click target for non-selected layers */}
        {!isSelected && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            pointerEvents="auto"
            cursor="pointer"
            onClick={handleClick}
          />
        )}
      </Box>

      {isSelected && targetRef.current && (
        <Moveable
          target={targetRef.current}
          draggable={!dragBlocked}
          resizable={isResizable && !dragBlocked}
          snappable
          snapDirections={{
            top: true,
            left: true,
            bottom: true,
            right: true,
            center: true,
            middle: true,
          }}
          elementSnapDirections={{
            top: true,
            left: true,
            bottom: true,
            right: true,
            center: true,
            middle: true,
          }}
          bounds={{
            left: 0,
            top: 0,
          }}
          onDragStart={() => {
            const proceed = checkExpressionGuard(() => {
              // User confirmed — they can drag again now
            })
            if (!proceed) {
              return false
            }
            return true
          }}
          onDrag={(e) => {
            e.target.style.transform = e.transform
          }}
          onDragEnd={(e) => {
            if (e.lastEvent) {
              const { translate } = e.lastEvent
              // Reset visual transform
              e.target.style.transform = ""
              applyPositionUpdate(translate[0], translate[1])
            }
          }}
          onResizeStart={() => {
            const proceed = checkExpressionGuard(() => {})
            if (!proceed) {
              return false
            }
            return true
          }}
          onResize={(e) => {
            e.target.style.width = `${e.width}px`
            e.target.style.height = `${e.height}px`
            e.target.style.transform = e.drag.transform
          }}
          onResizeEnd={(e) => {
            if (e.lastEvent) {
              const { width, height, drag } = e.lastEvent
              e.target.style.transform = ""
              applyPositionUpdate(drag.translate[0], drag.translate[1])
              applySizeUpdate(width, height)
            }
          }}
        />
      )}

      <ExpressionConfirmDialog
        isOpen={showExpressionDialog}
        layerConfig={posConfig}
        onConfirm={handleExpressionConfirm}
        onCancel={handleExpressionCancel}
      />
    </>
  )
}
