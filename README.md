[<img width="250" alt="ImageKit.io" src="https://raw.githubusercontent.com/imagekit-developer/imagekit-javascript/master/assets/imagekit-light-logo.svg"/>](https://imagekit.io)

# ImageKit Editor

[![npm version](https://img.shields.io/npm/v/@imagekit/editor)](https://www.npmjs.com/package/@imagekit/editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitter Follow](https://img.shields.io/twitter/follow/imagekitio?label=Follow&style=social)](https://twitter.com/ImagekitIo)

A powerful, React-based image editor component powered by ImageKit transformations. This editor provides an intuitive interface for applying various image transformations, managing transformation history, and exporting edited images.

## Features

- 🖼️ **Visual Image Editor**: Interactive UI for applying ImageKit transformations
- 📝 **Transformation History**: Track and manage applied transformations using ImageKit's chain transformations
- 🎨 **Multiple Transformation Types**: Support for resize, crop, focus, quality adjustments, and more
- 🖥️ **Desktop Interface**: Modern interface built with Chakra UI for desktop environments
- 🔧 **TypeScript Support**: Full TypeScript support with comprehensive type definitions

## Installation

Install the package using npm or yarn:

```bash
npm install @imagekit/editor
```

### Peer Dependencies

The editor requires the following peer dependencies to be installed in your project:

```bash
npm install @chakra-ui/icons@1.1.1 @chakra-ui/react@~1.8.9 @emotion/react@^11.14.0 @emotion/styled@^11.14.1 framer-motion@6.5.1 react@^17.0.2 react-dom@^17.0.2 react-select@^5.2.1
```

## Quick Start

```tsx
import {
  Icon,
  Portal,
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import type { ImageKitEditorProps, ImageKitEditorRef } from '@imagekit/editor';
import { ImageKitEditor } from '@imagekit/editor';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  selectedFiles: Array<{
    url: string;
    name: string;
    // ... other file properties
  }>;
  onClose(): void;
}

const ImageEditor = ({ selectedFiles, onClose }: Props) => {
  const [editorProps, setEditorProps] = useState<ImageKitEditorProps>();
  const imagekitEditorRef = useRef<ImageKitEditorRef>(null);

  const initEditor = useCallback(async () => {
    const initialImages = selectedFiles.map(file => ({
      src: file.url,
      metadata: {
        requireSignedUrl: file.url.includes('ik-s='),
        ...file,
      },
    }));

    setEditorProps({
      initialImages,
      onClose,
      // Optional: Add signer for private images
      signer: async ({ metadata, transformation }) => {
        // Your URL signing logic here
        return getSignedUrl(metadata, transformation);
      },
      // Optional: Add custom export options
      exportOptions: {
        label: 'Download Options',
        icon: <Icon boxSize="5" as={DownloadIcon} />,
        options: [
          {
            label: 'Download',
            isVisible: (imageList: string[]) => imageList.length === 1,
            onClick: (imageList: string[]) => {
              // Your single file download logic here
            },
          },
          {
            label: 'Copy URLs',
            isVisible: (imageList: string[]) => imageList.length > 0,
            onClick: async (imageList: string[]) => {
              // Your copy URLs logic here

              const urlsText = imageList.join('\n');
              await navigator.clipboard.writeText(urlsText);
            },
          },
        ],
      },
    });
  }, [selectedFiles, onClose]);

  useEffect(() => {
    initEditor();
  }, [initEditor]);

  if (!editorProps) {
    return null;
  }

  return (
    <Portal>
      <ImageKitEditor ref={imagekitEditorRef} {...editorProps} />
    </Portal>
  );
};

export default ImageEditor;
```

## API Reference

### ImageKitEditor Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onClose` | `() => void` | ✅ | Callback function called when the editor is closed |
| `initialImages` | `Array<string \| FileElement>` | ❌ | Initial images to load in the editor |
| `signer` | `Signer` | ❌ | Function to generate signed URLs for private images |
| `onAddImage` | `() => void` | ❌ | Callback function for adding new images |
| `exportOptions` | `ExportOptions` | ❌ | Configuration for export functionality |

### ImageKitEditor Ref Methods

The editor exposes the following methods through a ref:

```tsx
interface ImageKitEditorRef {
  loadImage: (image: string | FileElement) => void;
  loadImages: (images: Array<string | FileElement>) => void;
  setCurrentImage: (imageSrc: string) => void;
}
```

### Export Options

You can configure export functionality in two ways:

#### Simple Export
```tsx
exportOptions={{
  label: 'Download',
  icon: <DownloadIcon />,
  onClick: (images: string[]) => {
    // Handle export
  }
}}
```

#### Multiple Export Options
```tsx
exportOptions={{
  label: 'Export',
  options: [
    {
      label: 'Download JSON',
      isVisible: true,
      onClick: (images: string[]) => {
        // Export transformation data
      }
    },
    {
      label: 'Copy URLs',
      isVisible: (images) => images.length > 0,
      onClick: (images: string[]) => {
        // Copy image URLs
      }
    }
  ]
}}
```

### File Element Interface

For advanced use cases with metadata and signed URLs:

```tsx
interface FileElement<Metadata = RequiredMetadata> {
  src: string;
  metadata: Metadata & {
    requireSignedUrl?: boolean;
  };
}
```

The `metadata` object can contain any contextual information your application needs, such as file IDs, user context, etc. This metadata is passed to the signer function, allowing you to generate appropriate signed URLs based on the specific file and user context.

## Advanced Usage

### Signed URLs

For private images that require signed URLs, you can pass file metadata that will be available in the signer function:

```tsx
import { Signer, ImageKitEditor } from '@imagekit/editor';

interface Metadata {
  requireSignedUrl: boolean; // Required for signed URL generation
  
  // Add any other metadata properties you need, for example:
  fileId: string;
  userId: string;
}

const signer: Signer<Metadata> = async (signerRequest, abortController) => {
  // Access file context from the signer request
  const { url, transformation, metadata } = signerRequest;
  const { fileId, userId } = metadata;
  
  // Your signing logic using the metadata context
  // The abortController can be used to cancel the request if needed
  return await generateSignedUrl({
    url,
    fileId,
    userId,
    transformation,
    signal: abortController?.signal, // Pass abort signal to your API call
  });
};

<ImageKitEditor
  signer={signer}
  initialImages={[
    {
      src: 'https://ik.imagekit.io/demo/private-image.jpg',
      metadata: {
        requireSignedUrl: true,
        fileId: 'file_123',
        userId: 'user_456',
        // ... other metadata
      }
    }
  ]}
  // ... other props
/>
```

## TypeScript Support

The editor is built with TypeScript and provides comprehensive type definitions. You can import types for better development experience:

```tsx
import type { 
  ImageKitEditorProps, 
  ImageKitEditorRef, 
  FileElement, 
  Signer 
} from '@imagekit/editor';
```

## Contributing

We welcome contributions! Please see our [contributing guidelines](./CONTRIBUTING.md) for more details.

## Support

- 📖 [Documentation](https://imagekit.io/docs)
- 💬 [Community Forum](https://community.imagekit.io)
- 📧 [Support Email](mailto:support@imagekit.io)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [ImageKit](https://imagekit.io)
