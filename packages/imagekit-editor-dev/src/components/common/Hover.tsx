import { Box, type BoxProps, Flex, type FlexProps } from "@chakra-ui/react"
import { useState, useEffect, useRef, useCallback } from "react"

interface FlexHoverProps extends FlexProps {
  children(isHover: boolean): JSX.Element
}

interface BoxHoverProps extends BoxProps {
  children(isHover: boolean): JSX.Element
}

const Hover = ({
  children,
  ...props
}: BoxHoverProps | FlexHoverProps): JSX.Element => {
  const [isHover, setIsHover] = useState<boolean>(false)

  const hoverAreaRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleClickOutside = useCallback((event: MouseEvent): void => {
    console.log('handleClickOutside called')
    const hoverArea = hoverAreaRef.current
    if (
      hoverArea &&
      !hoverArea.contains(event.target as Node)
    ) {
      setIsHover(false)
    }
  }, [])

  const debouncedHandleClickOutside = useCallback((event: MouseEvent): void => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      handleClickOutside(event)
    }, 100)
  }, [handleClickOutside])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('mouseover', debouncedHandleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('mouseover', debouncedHandleClickOutside)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [handleClickOutside, debouncedHandleClickOutside])

  if (props.display === "flex") {
    return (
      <Flex
        {...props}
        onMouseOver={() => {
          setIsHover(true)
        }}
        onMouseLeave={() => {
          setIsHover(false)
        }}
        ref={hoverAreaRef}
      >
        {children(isHover)}
      </Flex>
    )
  }

  return (
    <Box
      {...props}
      onMouseOver={() => {
        setIsHover(true)
      }}
      onMouseLeave={() => {
        setIsHover(false)
      }}
    >
      {children(isHover)}
    </Box>
  )
}

export default Hover
