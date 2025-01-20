import {ChakraProvider} from "@chakra-ui/react";
import ImageKit from "imagekit-javascript";
import {ImageKitOptions} from "imagekit-javascript/dist/src/interfaces";
import React, {useMemo} from "react";
import Editor from ".";
import {EditorProvider} from "../../context";
import {FontsFaces, theme} from "../../theme";

export interface ImageKitEditorProps {
  ikClientOptions: ImageKitOptions;
  portalContainerRef?: React.RefObject<HTMLDivElement | null>;
  imageUrl: string;
  onClose(): void;
  exportActions: Array<{
    label: string;
    onClick(url: string): void;
  }>;
}

export default (props: ImageKitEditorProps) => {
  const {portalContainerRef, onClose, imageUrl, ikClientOptions, exportActions} = props;

  if (!imageUrl) {
    throw new Error("`imageUrl` is required for the image that will be edited");
  }

  const ikClient = useMemo(() => {
    return new ImageKit(ikClientOptions);
  }, [ikClientOptions]);

  return (
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <FontsFaces />
        <EditorProvider imageUrl={imageUrl} ikClient={ikClient}>
          <Editor onClose={onClose} portalContainerRef={portalContainerRef} exportActions={exportActions} />
        </EditorProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
};
