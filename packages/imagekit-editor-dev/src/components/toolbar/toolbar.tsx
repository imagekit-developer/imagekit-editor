import {
  Box,
  Button,
  Center,
  chakra,
  Flex,
  Icon,
  IconButton,
  Spinner,
  shouldForwardProp,
} from "@chakra-ui/react"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiCaretUp } from "@react-icons/all-files/pi/PiCaretUp"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { isValidMotionProp, motion } from "framer-motion"
import type { FC } from "react"
import { useEditorStore } from "../../store"
import Hover from "../common/Hover"
import RetryableImage from "../RetryableImage"

interface ToolbarProps {
  onAddImage?: () => void
  onSelectImage?: (imageSrc: string) => void
}

const MotionFlex = chakra(motion.div, {
  shouldForwardProp: (prop) =>
    isValidMotionProp(prop) || shouldForwardProp(prop),
})

export const Toolbar: FC<ToolbarProps> = ({ onAddImage, onSelectImage }) => {
  const {
    currentImage,
    imageList,
    setCurrentImage,
    removeImage,
    isSigning,
    _internalState,
    _setIsToolbarCollapsed,
  } = useEditorStore()

  const isCollapsed = _internalState.isToolbarCollapsed

  return (
    <MotionFlex
      display="flex"
      width="full"
      animate={isCollapsed ? "collapsed" : "expanded"}
      variants={{
        collapsed: {
          translateY: "100%",
          transition: { duration: 0.3, ease: "easeInOut" },
        },
        expanded: {
          translateY: "0%",
          transition: { duration: 0.3, ease: "easeInOut" },
        },
      }}
      h={44}
      py={3}
      initial={isCollapsed ? "collapsed" : "expanded"}
      borderTop="1px"
      borderColor="editorBattleshipGrey.100"
      justifyContent="center"
      alignItems="center"
      bg="white"
      maxW={
        _internalState.sidebarState === "none"
          ? "calc(100vw - var(--chakra-space-64) - var(--chakra-space-6))"
          : "calc(100vw - var(--chakra-space-72) - var(--chakra-space-80) - var(--chakra-space-2))"
      }
      position="relative"
    >
      <Flex
        position="sticky"
        left={0}
        top={0}
        height="full"
        alignItems="center"
        justifyContent="center"
        bg="white"
        px={4}
        zIndex={11}
      >
        <IconButton
          aria-label="Add new image"
          icon={<PiPlus />}
          rounded="full"
          onClick={onAddImage}
          flexShrink={0}
          size="md"
          colorScheme="blue"
        />
      </Flex>

      <Box
        flex={1}
        minW={0}
        overflowX="auto"
        py={3}
        display="block"
        whiteSpace="nowrap"
      >
        <Flex
          display="inline-flex"
          gap={3}
          pl={2}
          pr={4}
          minWidth="min-content"
        >
          {imageList.map((imageSrc) => {
            return (
              <Hover display="block" key={imageSrc}>
                {(isHovered) => (
                  <Box
                    position="relative"
                    cursor="pointer"
                    onClick={() => {
                      if (onSelectImage) {
                        onSelectImage(imageSrc)
                      } else {
                        setCurrentImage(imageSrc)
                      }
                    }}
                    _hover={{
                      transform: "scale(1.02)",
                      boxShadow: "md",
                    }}
                    opacity={currentImage === imageSrc || isHovered ? 1 : 0.7}
                    transition="all 0.2s"
                    borderRadius="md"
                    h={32}
                    w={40}
                  >
                    {isHovered && (
                      <IconButton
                        variant="unstyled"
                        position="absolute"
                        minW="6"
                        h="6"
                        top={0}
                        right={0}
                        zIndex={2}
                        transition="opacity 0.2s"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="full"
                        bg="white"
                        border="1px solid"
                        borderColor="editorBattleshipGrey.100"
                        transform="translateY(-40%) translateX(40%)"
                        isLoading={isSigning}
                        isDisabled={imageList.length === 1}
                        _disabled={{
                          background: "editorBattleshipGrey.100",
                          cursor: "not-allowed",
                          color: "editorBattleshipGrey.400",
                          "&:hover": {
                            background:
                              "var(--chakra-colors-editorBattleshipGrey-100) !important",
                            cursor: "not-allowed",
                            color:
                              "var(--chakra-colors-editorBattleshipGrey-400) !important",
                          },
                        }}
                        boxShadow="md"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(imageSrc)
                        }}
                        aria-label="Remove image"
                        icon={<Icon as={PiX} size="14px" />}
                      />
                    )}
                    <RetryableImage
                      showRetryButton={false}
                      compactError
                      src={imageSrc}
                      alt={`Image`}
                      height={32}
                      width="auto"
                      minWidth={40}
                      objectFit="contain"
                      borderRadius="md"
                      borderWidth={currentImage === imageSrc ? "2px" : "1px"}
                      borderStyle="solid"
                      borderColor={
                        currentImage === imageSrc
                          ? "editorBlue.300"
                          : "editorBattleshipGrey.100"
                      }
                      fallback={
                        <Center h={32} w={40}>
                          <Spinner />
                        </Center>
                      }
                      isLoading={isSigning}
                    />
                  </Box>
                )}
              </Hover>
            )
          })}
        </Flex>
      </Box>

      <Button
        aria-label={isCollapsed ? "Add more images" : "Hide toolbar"}
        leftIcon={isCollapsed ? <PiCaretUp /> : <PiCaretDown />}
        onClick={() => _setIsToolbarCollapsed(!isCollapsed)}
        size="md"
        position="absolute"
        right={10}
        bottom="100%"
        marginBottom={0}
        alignItems="center"
        justifyContent="center"
        bg="white"
        borderRadius={0}
        borderWidth="1px"
        borderColor="var(--chakra-colors-editorBattleshipGrey-100)"
      >
        {isCollapsed ? "Add more images" : "Hide toolbar"}
      </Button>
    </MotionFlex>
  )
}
