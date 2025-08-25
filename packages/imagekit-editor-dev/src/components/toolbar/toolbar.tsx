import { Box, Center, Flex, Icon, IconButton, Spinner } from "@chakra-ui/react"
import { PiCaretLeft } from "@react-icons/all-files/pi/PiCaretLeft"
import { PiCaretRight } from "@react-icons/all-files/pi/PiCaretRight"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { type FC, useRef } from "react"
import { useEditorStore } from "../../store"
import Hover from "../common/Hover"
import RetryableImage from "../RetryableImage"

interface ToolbarProps {
  onAddImage?: () => void
  onSelectImage?: (imageSrc: string) => void
}

export const Toolbar: FC<ToolbarProps> = ({ onAddImage, onSelectImage }) => {
  const {
    currentImage,
    imageList,
    originalImageList,
    signingImages,
    setCurrentImage,
    removeImage,
    _internalState,
  } = useEditorStore()

  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollThumbnails = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" })
  }

  return (
    <Flex
      display="flex"
      width="full"
      h={36}
      py={2}
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
        zIndex={2}
        gap={2}
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
      <Flex
        position="sticky"
        right={0}
        top={0}
        height="full"
        alignItems="center"
        justifyContent="center"
        bg="white"
        paddingLeft={2}
        zIndex={2}
      >
        <IconButton
          aria-label="Scroll thumbnails left"
          icon={<PiCaretLeft />}
          variant="ghost"
          h="full"
          size="sm"
          onClick={() => scrollThumbnails(-200)}
        />
      </Flex>

      <Box
        ref={scrollRef}
        flex={1}
        minW={0}
        overflowX="auto"
        overflowY="hidden"
        pt={2.5}
        pb={2}
        px={3}
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
          {imageList.map((imageSrc, index) => {
            const originalUrl = originalImageList[index]?.url
            const key = originalUrl ?? imageSrc
            const isSigning = originalUrl ? signingImages[originalUrl] : false

            return (
              <Hover display="block" key={key}>
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
                      // transform: "scale(1.02)",
                      boxShadow: "md",
                    }}
                    opacity={currentImage === imageSrc || isHovered ? 1 : 0.7}
                    transition="all 0.2s"
                    borderRadius="md"
                    h={24}
                    w={32}
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
                          if (originalUrl) {
                            removeImage(originalUrl)
                          }
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
                      height={24}
                      width="auto"
                      minWidth={32}
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
                        <Center h={24} w={32}>
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
      <Flex
        position="sticky"
        right={0}
        top={0}
        height="full"
        alignItems="center"
        justifyContent="center"
        bg="white"
        px={2}
        zIndex={2}
      >
        <IconButton
          aria-label="Scroll thumbnails right"
          icon={<PiCaretRight />}
          variant="ghost"
          size="sm"
          onClick={() => scrollThumbnails(200)}
          h="full"
        />
      </Flex>
    </Flex>
  )
}
