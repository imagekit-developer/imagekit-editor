import { Center, Flex, Image, Spinner } from "@chakra-ui/react"
import type { FC } from "react"
import { useEditorStore } from "../../store"
import { Toolbar } from "../toolbar"

interface ListViewProps {
  onAddImage?: () => void
}

export const ListView: FC<ListViewProps> = ({ onAddImage }) => {
  const { currentImage, setCurrentImage } = useEditorStore()

  return (
    <>
      <Flex
        flex="1"
        padding={8}
        overflow="auto"
        justifyContent="center"
        alignItems="flex-start"
        position="relative"
      >
        <Flex
          direction="column"
          alignItems="center"
          justifyContent="center"
          height="full"
          width="full"
        >
          <Image
            src={currentImage}
            maxH={
              "calc(100vh - 4.125rem - 2*var(--chakra-space-8) - var(--chakra-space-12) - var(--chakra-space-24))"
            }
            maxW={
              "calc(100vw - var(--chakra-space-72) - 2*var(--chakra-space-8))"
            }
            fallback={
              <Center h="full" w="full">
                <Spinner />
              </Center>
            }
          />
        </Flex>
      </Flex>
      <Toolbar
        onAddImage={onAddImage}
        onSelectImage={(imageSrc: string) => {
          setCurrentImage(imageSrc)
        }}
      />
    </>
  )
}
