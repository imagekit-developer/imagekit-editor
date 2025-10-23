import { Icon } from "@chakra-ui/react"
import { ImageKitEditor, type ImageKitEditorProps } from "@imagekit/editor"
import type { ImageKitEditorRef } from "@imagekit/editor/dist/ImageKitEditor"
import { PiDownload } from "@react-icons/all-files/pi/PiDownload"
import React, { useCallback, useEffect } from "react"
import ReactDOM from "react-dom"

function App() {
  const [open, setOpen] = React.useState(true)
  const [editorProps, setEditorProps] =
    React.useState<ImageKitEditorProps<{ requireSignedUrl: boolean }>>()
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
        {
          url: "https://ik.imagekit.io/v3sxk1svj/white%20BMW%20car%20on%20street.jpg",
          metadata: {
            requireSignedUrl: false,
          },
        },
        {
          url: "https://ik.imagekit.io/v3sxk1svj/Young%20Living%20Patchouili%20bot....jpg",
          metadata: {
            requireSignedUrl: false,
          },
        },
        {
          url: "https://ik.imagekit.io/v3sxk1svj/brown%20bear%20plush%20toy%20on%20whi....jpg?updatedAt=1760432666859",
          metadata: {
            requireSignedUrl: false,
          },
        },
        // ...Array.from({ length: 10000 }).map((_, i) => ({
        //   url: `https://ik.imagekit.io/v3sxk1svj/placeholder.jpg?updatedAt=${Date.now()}&v=${i}`,
        //   metadata: {
        //     requireSignedUrl: false,
        //   },
        // })),
      ],
      onAddImage: handleAddImage,
      onClose: () => setOpen(false),
      exportOptions: [
        {
          type: "button",
          label: "Export",
          icon: <Icon boxSize={"5"} as={PiDownload} />,
          isVisible: true,
          onClick: (images) => {
            console.log(images)
          },
        },
        {
          type: "menu",
          label: "Export",
          icon: <Icon boxSize={"5"} as={PiDownload} />,
          isVisible: true,
          options: [
            {
              label: "Export",
              icon: <Icon boxSize={"5"} as={PiDownload} />,
              isVisible: true,
              onClick: (images) => {
                console.log(images)
              },
            },
          ],
        },
      ],
      signer: async (request) => {
        console.log(request)
        await new Promise((resolve) => setTimeout(resolve, 10000))
        console.log("Signed URL", request.url)
        return Promise.resolve(request.url)
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
