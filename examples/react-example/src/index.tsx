import { Icon } from "@chakra-ui/react"
import { ImageKitEditor, type ImageKitEditorProps } from "@imagekit/editor"
import type { ImageKitEditorRef } from "@imagekit/editor/dist/ImageKitEditor"
import { PiDownload } from "@react-icons/all-files/pi/PiDownload"
import React, { useCallback, useEffect } from "react"
import ReactDOM from "react-dom"

function App() {
  const [open, setOpen] = React.useState(true)
  const [editorProps, setEditorProps] = React.useState<ImageKitEditorProps>()
  const ref = React.useRef<ImageKitEditorRef>(null)

  /**
   * Function moved from EditorLayout component
   * Adds a random image with timestamp to ensure uniqueness
   */
  const handleAddImage = useCallback(() => {
    const timestamp = Date.now()
    const randomImage = `https://ik.imagekit.io/v3sxk1svj/placeholder.jpg?updatedAt=${timestamp}`
    ref.current?.loadImage(randomImage)
  }, [])

  useEffect(() => {
    setEditorProps({
      initialImages: [
        "https://ik.imagekit.io/v3sxk1svj/white%20BMW%20car%20on%20street.jpg",
        "https://ik.imagekit.io/v3sxk1svj/Young%20Living%20Patchouili%20bot....jpg",
      ],
      onAddImage: handleAddImage,
      onClose: () => setOpen(false),
      exportOptions: {
        label: "Export",
        icon: <Icon boxSize={"5"} as={PiDownload} />,
        onClick: (images) => {
          console.log(images)
        },
      },
      signedUrls: true,
      signer: (requests) => {
        return Promise.resolve(requests.map((req) => req.url))
      },
    })
  }, [handleAddImage])

  const toggle = () => {
    setOpen((prev) => !prev)
  }

  return (
    <>
      <button type="button" onClick={() => toggle()}>
        Open ImageKit Editor
      </button>
      {open && editorProps && <ImageKitEditor {...editorProps} ref={ref} />}
    </>
  )
}

const root = document.getElementById("root")
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  root,
)
