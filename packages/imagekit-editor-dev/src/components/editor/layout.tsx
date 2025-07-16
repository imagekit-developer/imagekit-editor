import { Flex } from "@chakra-ui/react"
import { useState } from "react"
import { Header } from "../header"
import { Sidebar } from "../sidebar"
import { ActionBar } from "./ActionBar"
import { GridView } from "./GridView"
import { ListView } from "./ListView"

interface Props {
  onAddImage?: () => void
  onClose: () => void
}

export function EditorLayout({ onAddImage, onClose }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [gridImageSize, setGridImageSize] = useState<number>(220)

  return (
    <>
      <Header onClose={onClose} />
      <Flex flexDirection="row" width="full" flexGrow={1}>
        <Sidebar />
        <Flex
          flex="1"
          background="imagekitGray.200"
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
