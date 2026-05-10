import { Box, Flex } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import { PresetsLibraryToggleContext } from "../../context/PresetsLibraryToggleContext"
import { useAutoSaveTemplate } from "../../hooks/useAutoSaveTemplate"
import { useSaveTemplate } from "../../hooks/useSaveTemplate"
import { useEditorStore } from "../../store"
import { Header, type HeaderProps } from "../header"
import { PresetsLibraryView } from "../presets/PresetsLibraryView"
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
  const { canvas, originalImageList } = useEditorStore()
  const isCanvasOnly = canvas != null && originalImageList.length === 0
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [gridImageSize, setGridImageSize] = useState<number>(300)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [isPresetsOpen, setIsPresetsOpen] = useState(false)

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

  // Close presets modal on Escape while it's open
  useEffect(() => {
    if (!isPresetsOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        setIsPresetsOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isPresetsOpen])

  useAutoSaveTemplate()
  useSaveTemplate()

  const closeTemplatesLibrary = () => setIsTemplatesOpen(false)
  const closePresetsLibrary = () => setIsPresetsOpen(false)
  const presetsToggle = useMemo(
    () => ({ open: () => setIsPresetsOpen(true) }),
    [],
  )

  return (
    <PresetsLibraryToggleContext.Provider value={presetsToggle}>
      <Header
        onClose={onClose}
        exportOptions={exportOptions}
        onViewAllTemplates={() => setIsTemplatesOpen(true)}
        onViewAllPresets={() => setIsPresetsOpen(true)}
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
            viewMode={viewMode}
            setViewMode={setViewMode}
            gridImageSize={gridImageSize}
            setGridImageSize={setGridImageSize}
          />
          {viewMode === "list" && <ListView onAddImage={onAddImage} />}
          {!isCanvasOnly && viewMode === "grid" && (
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
      {isPresetsOpen ? (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.400"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1400}
          onClick={closePresetsLibrary}
        >
          <Box
            w="60vw"
            h="70vh"
            maxW="800px"
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
            <PresetsLibraryView onClose={closePresetsLibrary} />
          </Box>
        </Box>
      ) : null}
    </PresetsLibraryToggleContext.Provider>
  )
}
