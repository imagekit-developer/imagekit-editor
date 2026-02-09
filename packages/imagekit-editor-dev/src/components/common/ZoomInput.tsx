import {
  ButtonGroup,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Text,
} from "@chakra-ui/react"
import { AiOutlineMinus } from "@react-icons/all-files/ai/AiOutlineMinus"
import { AiOutlinePlus } from "@react-icons/all-files/ai/AiOutlinePlus"
import type * as React from "react"
import { useEffect, useState } from "react"

type ZoomInputFieldProps = {
  id?: string
  onChange: (value: number) => void
  defaultValue?: number | unknown
  value?: number
}

const STEP_SIZE = 10

/**
 * Calculate the next zoom value when zooming in
 * Rounds up to the next step value
 */
function calculateZoomIn(currentValue: number): number {
  return Math.floor(currentValue / STEP_SIZE) * STEP_SIZE + STEP_SIZE
}

/**
 * Calculate the next zoom value when zooming out
 * Rounds down to the previous step value
 */
function calculateZoomOut(currentValue: number): number {
  return Math.ceil(currentValue / STEP_SIZE) * STEP_SIZE - STEP_SIZE
}

export const ZoomInput: React.FC<ZoomInputFieldProps> = ({
  id,
  onChange,
  defaultValue = 100,
  value,
}) => {
  const [zoomValue, setZoomValue] = useState<number>(
    value ?? (defaultValue as number),
  )
  const [inputValue, setInputValue] = useState<string>(
    (value ?? (defaultValue as number)).toString(),
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: <causes re-render loop if added>
  useEffect(() => {
    onChange(zoomValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    const numValue = Number(value)
    if (!Number.isNaN(numValue) && numValue >= 0) {
      setZoomValue(numValue)
    }
  }

  const handleInputBlur = () => {
    // Sync input value with zoom value on blur
    setInputValue(zoomValue.toString())
  }

  const handleZoomIn = () => {
    const newValue = calculateZoomIn(zoomValue)
    setZoomValue(newValue)
    setInputValue(newValue.toString())
  }

  const handleZoomOut = () => {
    const newValue = calculateZoomOut(zoomValue)
    // Prevent going below 0
    if (newValue >= 0) {
      setZoomValue(newValue)
      setInputValue(newValue.toString())
    } else {
      setZoomValue(0)
      setInputValue("0")
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: <role used to concur to chakra standard>
    <HStack as="fieldset" id={id} role="group" spacing={2} alignItems="stretch">
      <InputGroup maxWidth="120px">
        <Input
          type="number"
          min={0}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          textAlign="center"
          paddingRight="2.5rem"
        />
        <InputRightElement pointerEvents="none">
          <Text fontSize="sm" color="gray.500">
            %
          </Text>
        </InputRightElement>
      </InputGroup>

      <ButtonGroup variant="outline" isAttached>
        <IconButton
          aria-label="Zoom out"
          icon={<AiOutlineMinus />}
          onClick={handleZoomOut}
        />
        <IconButton
          aria-label="Zoom in"
          icon={<AiOutlinePlus />}
          onClick={handleZoomIn}
        />
      </ButtonGroup>
    </HStack>
  )
}

export default ZoomInput
