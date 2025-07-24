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
  exportOptions?:
    | {
        label: string
        icon?: React.ReactElement
        onClick: (images: string[]) => void
      }
    | {
        label: string
        icon?: React.ReactElement
        options: Array<{
          label: string
          isVisible: boolean | ((images: string[]) => boolean)
          onClick: (images: string[]) => void
        }>
      }
}

export function EditorLayout({ onAddImage, onClose, exportOptions }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [gridImageSize, setGridImageSize] = useState<number>(220)

  return (
    <>
      <Header onClose={onClose} exportOptions={exportOptions} />
      <Flex flexDirection="row" width="full" flexGrow={1}>
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
