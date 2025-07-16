import { Box, Button, Flex, Text, Tooltip } from "@chakra-ui/react"
import { memo } from "react"

type AnchorPosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"
  | string

interface AnchorFieldProps {
  value: AnchorPosition
  onChange: (value: AnchorPosition) => void
  positions?: AnchorPosition[]
}

const Positions: Array<{
  value: AnchorPosition
  label: string
  col: number
  row: number
}> = [
  { value: "top_left", label: "Top Left", col: 0, row: 0 },
  { value: "top", label: "Top", col: 1, row: 0 },
  { value: "top_right", label: "Top Right", col: 2, row: 0 },
  { value: "left", label: "Left", col: 0, row: 1 },
  { value: "center", label: "Center", col: 1, row: 1 },
  { value: "right", label: "Right", col: 2, row: 1 },
  { value: "bottom_left", label: "Bottom Left", col: 0, row: 2 },
  { value: "bottom", label: "Bottom", col: 1, row: 2 },
  { value: "bottom_right", label: "Bottom Right", col: 2, row: 2 },
]

const AnchorField: React.FC<AnchorFieldProps> = ({
  value,
  onChange,
  positions = [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top_left",
    "top_right",
    "bottom_left",
    "bottom_right",
  ],
}) => {
  return (
    <Flex direction="column" gap="2">
      <Box
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="md"
        background="gray.50"
        p="2"
        width="fit-content"
      >
        <Box
          display="grid"
          gridTemplateColumns="repeat(3, var(--chakra-sizes-6))"
          gridTemplateRows="repeat(3, var(--chakra-sizes-6))"
          gap="2"
        >
          {Positions.map((position) => (
            <Tooltip key={position.value} label={position.label}>
              <Button
                variant="unstyled"
                size="xs"
                display="flex"
                alignItems="center"
                justifyContent="center"
                minWidth="0"
                p="0"
                isDisabled={!positions.includes(position.value)}
                onClick={() => onChange(position.value)}
                borderRadius="md"
                _hover={{
                  bg: "blue.50",
                }}
                _disabled={{
                  opacity: 0.25,
                }}
                aria-label={position.label}
              >
                <Box
                  width="1.5"
                  height="1.5"
                  borderRadius="full"
                  bg={value === position.value ? "blue.500" : "gray.500"}
                />
              </Button>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Flex>
  )
}

export default memo(AnchorField)
