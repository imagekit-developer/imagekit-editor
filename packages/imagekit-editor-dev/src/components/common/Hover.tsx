import { Box, type BoxProps, Flex, type FlexProps } from "@chakra-ui/react"
import { useState } from "react"

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
