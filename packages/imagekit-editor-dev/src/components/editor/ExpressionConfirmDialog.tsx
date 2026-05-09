import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Code,
  Text,
} from "@chakra-ui/react"
import { type FC, useRef } from "react"
import type { LayerPositionConfig } from "../../utils/layerGeometry"
import { isExpression } from "../../utils/layerGeometry"

interface ExpressionConfirmDialogProps {
  isOpen: boolean
  layerConfig: LayerPositionConfig
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation dialog shown when the user tries to drag a layer
 * whose position coordinates contain expression values (e.g. `bw_div_2`).
 * Dragging will replace these expressions with numeric pixel values.
 */
export const ExpressionConfirmDialog: FC<ExpressionConfirmDialogProps> = ({
  isOpen,
  layerConfig,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null)

  const expressions: string[] = []
  if (layerConfig.positionMethod === "topleft") {
    if (isExpression(layerConfig.positionX))
      expressions.push(String(layerConfig.positionX))
    if (isExpression(layerConfig.positionY))
      expressions.push(String(layerConfig.positionY))
  } else {
    if (isExpression(layerConfig.positionXC))
      expressions.push(String(layerConfig.positionXC))
    if (isExpression(layerConfig.positionYC))
      expressions.push(String(layerConfig.positionYC))
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onCancel}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Replace expression values?
          </AlertDialogHeader>

          <AlertDialogBody>
            <Text mb={2}>
              This layer&apos;s position uses expression values that will be
              replaced with numeric pixel values when you drag it:
            </Text>
            {expressions.map((expr) => (
              <Code key={expr} display="block" mb={1}>
                {expr}
              </Code>
            ))}
            <Text mt={2} fontSize="sm" color="gray.600">
              This cannot be undone. The expression will be lost.
            </Text>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onCancel}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={onConfirm} ml={3}>
              Replace &amp; Drag
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}
