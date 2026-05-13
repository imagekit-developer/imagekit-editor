import { Box, Flex } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useAutoSaveTemplate } from "../../hooks/useAutoSaveTemplate"
import { useSaveTemplate } from "../../hooks/useSaveTemplate"
import { useEditorStore } from "../../store"
import { Header, type HeaderProps } from "../header"
import { Sidebar } from "../sidebar"
import { TemplatesLibraryView } from "../templates/TemplatesLibraryView"
import { ActionBar } from "./ActionBar"
import { GridView } from "./GridView"
import { ListView } from "./ListView"

interface Props {
  onAddImage?: () => void
  onClose: () => void
  exportOptions?: HeaderProps["exportOptions"]
}

export function EditorLayout({ onAddImage, onClose, exportOptions }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [gridImageSize, setGridImageSize] = useState<number>(300)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const overlayMode = useEditorStore((s) => s._internalState.overlayMode)
  const effectiveViewMode: "list" | "grid" = overlayMode ? "list" : viewMode

  // Close templates modal on Escape while it's open
  useEffect(() => {
    if (!isTemplatesOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        setIsTemplatesOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isTemplatesOpen])

  useAutoSaveTemplate()
  useSaveTemplate()

  const closeTemplatesLibrary = () => setIsTemplatesOpen(false)

  return (
    <>
      <Header
        onClose={onClose}
        exportOptions={exportOptions}
        onViewAllTemplates={() => setIsTemplatesOpen(true)}
      />
      <Flex flexDirection="row" width="full" height="full" flexGrow={0}>
        <Sidebar />
        <Flex
          flex="1 0 0"
          background="editorGray.200"
          flexDirection="column"
          position="relative"
        >
          <ActionBar
            viewMode={effectiveViewMode}
            setViewMode={setViewMode}
            gridImageSize={gridImageSize}
            setGridImageSize={setGridImageSize}
          />
          {effectiveViewMode === "list" && <ListView onAddImage={onAddImage} />}
          {effectiveViewMode === "grid" && (
            <GridView imageSize={gridImageSize} onAddImage={onAddImage} />
          )}
        </Flex>
      </Flex>
      {isTemplatesOpen ? (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.400"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1400}
          onClick={closeTemplatesLibrary}
        >
          <Box
            w="80vw"
            h="80vh"
            maxW="80vw"
            maxH="80vh"
            bg="white"
            borderRadius="xl"
            overflow="hidden"
            boxShadow="xl"
            display="flex"
            flexDirection="column"
            position="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              flex="1 1 0"
              minH={0}
              display="flex"
              flexDirection="column"
              paddingY="2"
            >
              <TemplatesLibraryView onClose={closeTemplatesLibrary} />
            </Box>
          </Box>
        </Box>
      ) : null}
    </>
  )
}
