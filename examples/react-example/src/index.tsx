import { Icon } from "@chakra-ui/react"
import {
  createLocalStorageProvider,
  ImageKitEditor,
  type ImageKitEditorProps,
  type ImageKitEditorRef,
  TRANSFORMATION_STATE_VERSION,
} from "@imagekit/editor"
import { PiDownload } from "@react-icons/all-files/pi/PiDownload"
import React, { useCallback, useEffect } from "react"
import ReactDOM from "react-dom"

function App() {
  const [open, setOpen] = React.useState(true)
  const [editorProps, setEditorProps] =
    React.useState<
      ImageKitEditorProps<{ requireSignedUrl: boolean; fileName: string }>
    >()
  const ref = React.useRef<ImageKitEditorRef>(null)
  const [savedTemplate, setSavedTemplate] = React.useState<
    Omit<Transformation, "id">[] | null
  >(null)
  const [shouldLoadTemplate, setShouldLoadTemplate] = React.useState(false)

  /**
   * Function moved from EditorLayout component
   * Adds a random image with timestamp to ensure uniqueness
   */
  const handleAddImage = useCallback(() => {
    const timestamp = Date.now()
    const randomImage = `https://ik.imagekit.io/v3sxk1svj/placeholder.jpg?updatedAt=${timestamp}`
    ref.current?.loadImage(randomImage)
  }, [])

  /**
   * Load template when editor becomes available
   */
  React.useEffect(() => {
    if (open && shouldLoadTemplate && ref.current && savedTemplate) {
      ref.current.loadTemplate(savedTemplate)
      console.log("Loaded template:", savedTemplate)
      setShouldLoadTemplate(false)
    }
  }, [open, shouldLoadTemplate, savedTemplate])

  /**
   * Load previously saved template
   */
  const handleLoadTemplate = useCallback(() => {
    if (savedTemplate) {
      // Flag to load template and open editor
      setShouldLoadTemplate(true)
      setOpen(true)
    } else {
      // Try to load from localStorage
      const stored = localStorage.getItem("editorTemplate")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setSavedTemplate(parsed)
          setShouldLoadTemplate(true)
          setOpen(true)
          console.log("Loaded template from localStorage:", parsed)
        } catch (e) {
          console.error("Failed to parse saved template:", e)
          alert("❌ Failed to load saved template - invalid JSON")
        }
      } else {
        alert("⚠️ No saved template found")
      }
    }
  }, [savedTemplate])

  /**
   * Clear the saved template
   */
  const handleClearTemplate = useCallback(() => {
    if (confirm("Are you sure you want to clear the saved template?")) {
      setSavedTemplate(null)
      localStorage.removeItem("editorTemplate")
      console.log("Cleared saved template")
      alert("🗑️ Template cleared!")
    }
  }, [])

  useEffect(() => {
    setEditorProps({
      initialImages: [
        {
          url: "https://ik.imagekit.io/v3sxk1svj/white%20BMW%20car%20on%20street.jpg",
          metadata: {
            requireSignedUrl: false,
            fileName: "white BMW car on street.jpg",
          },
        },
        {
          url: "https://ik.imagekit.io/v3sxk1svj/Young%20Living%20Patchouili%20bot....jpg",
          metadata: {
            requireSignedUrl: false,
            fileName: "Young Living Patchouili bot.jpg",
          },
        },
        {
          url: "https://ik.imagekit.io/v3sxk1svj/brown%20bear%20plush%20toy%20on%20whi....jpg?updatedAt=1760432666859",
          metadata: {
            requireSignedUrl: false,
            fileName: "brown bear plush toy on white.jpg",
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
          onClick: (images, currentImage) => {
            console.log("Export images:", images, currentImage)
          },
        },
        // {
        //   type: "menu",
        //   label: "Export",
        //   icon: <Icon boxSize={"5"} as={PiDownload} />,
        //   isVisible: true,
        //   options: [
        //     {
        //       label: "Export",
        //       icon: <Icon boxSize={"5"} as={PiDownload} />,
        //       isVisible: true,
        //       onClick: (images) => {
        //         console.log(images)
        //       },
        //     },
        //   ],
        // },
      ],
      signer: async (request) => {
        console.log(request)
        await new Promise((resolve) => setTimeout(resolve, 10000))
        console.log("Signed URL", request.url)
        return Promise.resolve(request.url)
      },
      templateStorage: createLocalStorageProvider(),
    })
  }, [handleAddImage])

  const toggle = () => {
    setOpen((prev: boolean) => !prev)
  }

  return (
    <>
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h1>ImageKit Editor - Template Management Demo</h1>
        <p>
          This demo shows how to save and restore editor templates using the
          editor's ref methods.
        </p>

        <div style={{ marginTop: "20px", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => toggle()}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              marginRight: "10px",
              cursor: "pointer",
            }}
          >
            {open ? "Close" : "Open"} ImageKit Editor
          </button>

          <button
            type="button"
            onClick={handleLoadTemplate}
            disabled={!savedTemplate && !localStorage.getItem("editorTemplate")}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              marginRight: "10px",
              cursor:
                savedTemplate || localStorage.getItem("editorTemplate")
                  ? "pointer"
                  : "not-allowed",
              opacity:
                savedTemplate || localStorage.getItem("editorTemplate")
                  ? 1
                  : 0.5,
            }}
          >
            Load Saved Template
          </button>

          {savedTemplate && (
            <button
              type="button"
              onClick={handleClearTemplate}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                marginRight: "10px",
                cursor: "pointer",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Clear Template
            </button>
          )}

          {savedTemplate && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#e8f5e9",
                borderRadius: "5px",
                border: "2px solid #4caf50",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#2e7d32" }}>
                ✓ Saved Template
              </h3>
              <p>
                <strong>Transformations:</strong> {savedTemplate.length}
              </p>
              <p>
                <strong>Schema Version:</strong> {TRANSFORMATION_STATE_VERSION}
              </p>
              <p>
                <strong>Types:</strong>{" "}
                {Array.from(new Set(savedTemplate.map((t) => t.type))).join(
                  ", ",
                )}
              </p>
              <details>
                <summary
                  style={{
                    cursor: "pointer",
                    marginTop: "10px",
                    fontWeight: "bold",
                  }}
                >
                  📋 View Template JSON
                </summary>
                <pre
                  style={{
                    marginTop: "10px",
                    padding: "10px",
                    backgroundColor: "#fff",
                    borderRadius: "3px",
                    overflow: "auto",
                    maxHeight: "300px",
                    fontSize: "12px",
                    border: "1px solid #ddd",
                  }}
                >
                  {JSON.stringify(savedTemplate, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "15px",
            backgroundColor: "#e3f2fd",
            borderRadius: "5px",
            marginTop: "20px",
          }}
        >
          <h3>📖 How to use Template Features:</h3>
          <ol>
            <li>Click "Open ImageKit Editor" and apply some transformations</li>
            <li>
              Click the <strong>"Save Template"</strong> button in the editor
              header
            </li>
            <li>Close the editor</li>
            <li>
              Click <strong>"Load Saved Template"</strong> - it will open the
              editor with all transformations restored
            </li>
            <li>
              Use <strong>"Clear Template"</strong> to remove the saved template
            </li>
          </ol>
          <p
            style={{
              marginTop: "15px",
              padding: "10px",
              fontSize: "14px",
              color: "#0d47a1",
              backgroundColor: "#bbdefb",
              borderRadius: "3px",
            }}
          >
            💾 <strong>Persistent Storage:</strong> Templates are saved to
            localStorage, so they persist across page reloads!
          </p>
          <p style={{ marginTop: "10px", fontSize: "13px", color: "#666" }}>
            <strong>Note:</strong> Template IDs are automatically generated on
            load to ensure uniqueness and enable reusability.
          </p>
        </div>
      </div>

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
