import {
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  ButtonGroup,
  Text,
  useColorModeValue,
} from "@chakra-ui/react"
import type * as React from "react"
import { useState, useEffect } from "react"
import { AiOutlinePlus } from "@react-icons/all-files/ai/AiOutlinePlus"
import { AiOutlineMinus } from "@react-icons/all-files/ai/AiOutlineMinus"

type ZoomInputFieldProps = {
  id?: string
  onChange: (value: number) => void
  defaultValue?: number
}

/**
 * Calculate the step size based on the current zoom value
 * If zoom >= 100: step = 50
 * If zoom < 100: step = 10
 */
function getStepSize(value: number, zoomMode: "in" | "out"): number {
  if (zoomMode === "in") {
    return value >= 100 ? 50 : 10
  } else {
    return value > 100 ? 50 : 10
  }
}

/**
 * Calculate the next zoom value when zooming in
 * Rounds up to the next step value
 */
function calculateZoomIn(currentValue: number): number {
  const step = getStepSize(currentValue, "in")
  return (Math.floor(currentValue / step) * step) + step
}

/**
 * Calculate the next zoom value when zooming out
 * Rounds down to the previous step value
 */
function calculateZoomOut(currentValue: number): number {
  const step = getStepSize(currentValue, "out")
  return (Math.ceil(currentValue / step) * step) - step
}

export const ZoomInputField: React.FC<ZoomInputFieldProps> = ({
  id,
  onChange,
  defaultValue = 100,
}) => {
  const [zoomValue, setZoomValue] = useState<number>(defaultValue)
  const [inputValue, setInputValue] = useState<string>(defaultValue.toString())

  useEffect(() => {
    onChange(zoomValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    const numValue = Number(value)
    if (!isNaN(numValue) && numValue >= 0) {
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
    <HStack
      as="fieldset"
      id={id}
      role="group"
      spacing={2}
      alignItems="stretch"
    > 
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

export default ZoomInputField
