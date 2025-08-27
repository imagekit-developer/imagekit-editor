import { Flex } from "@chakra-ui/react"
import { useState } from "react"
import { Header, type HeaderProps } from "../header"
import { Sidebar } from "../sidebar"
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

  return (
    <>
      <Header onClose={onClose} exportOptions={exportOptions} />
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
          {viewMode === "grid" && (
            <GridView imageSize={gridImageSize} onAddImage={onAddImage} />
          )}
        </Flex>
      </Flex>
    </>
  )
}
