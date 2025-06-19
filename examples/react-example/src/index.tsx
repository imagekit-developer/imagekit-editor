import ImageKitEditor, { type ImageKitEditorProps } from "@imagekit/editor";
import React, { useEffect } from "react";
import ReactDOM from "react-dom";

function App() {
  const [open, setOpen] = React.useState(true);
  const [editorProps, setEditorProps] = React.useState<ImageKitEditorProps>();

  useEffect(() => {
    setEditorProps({
      // imageUrl: "https://ik.imagekit.io/n8ym6wilmq/river__Imiu4UZd.png",
      imageUrl:
        "https://stage-ik.imagekit.io/n8ym6wilmq/image.png?updatedAt=1737527205877",
      // imageUrl: "https://ik.imagekit.io/n8ym6wilmq/low-res-demo.jpg?updatedAt=1736923795562",
      // imageUrl: "https://ik.imagekit.io/n8ym6wilmq/table.png",
      ikClientOptions: {
        publicKey: "public_K0hLzl8KvshMKkSvKsEGxMSf5SI=",
        urlEndpoint: "https://ik.imagekit.io/pwliscd3n",
      },
      onClose: () => setOpen(false),
      exportActions: [
        {
          label: "Download",
          onClick: (url: string) => {
            console.log("Download", url);
          },
        },
        {
          label: "Save as new file",
          onClick: (url: string) => {
            console.log("Save as new file", url);
          },
        },
        {
          label: "Save as new version",
          onClick: (url: string) => {
            console.log("Save as new version", url);
          },
        },
      ],
    });
  }, []);

  const toggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button type="button" onClick={() => toggle()}>
        Open ImageKit Editor
      </button>
      {open && editorProps && <ImageKitEditor {...editorProps} />}
    </>
  );
}

const root = document.getElementById("root");
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  root,
);
