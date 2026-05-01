[<img width="250" alt="ImageKit.io" src="https://raw.githubusercontent.com/imagekit-developer/imagekit-javascript/master/assets/imagekit-light-logo.svg"/>](https://imagekit.io)

# ImageKit Editor

[![npm version](https://img.shields.io/npm/v/@imagekit/editor)](https://www.npmjs.com/package/@imagekit/editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Twitter Follow](https://img.shields.io/twitter/follow/imagekitio?label=Follow&style=social)](https://twitter.com/ImagekitIo)

A powerful, React-based image editor component powered by ImageKit transformations. This editor provides an intuitive interface for applying various image transformations, managing transformation history, and exporting edited images.

## Features

- 🖼️ **Visual Image Editor**: Interactive UI for applying ImageKit transformations
- 📝 **Transformation History**: Track and manage applied transformations using ImageKit's chain transformations
- 💾 **Template Management**: Save and restore editor templates with built-in serialization support
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
| `focusObjects` | `string[]` | ❌ | Custom list of selectable focus objects for object-based focus |

### ImageKitEditor Ref Methods

The editor exposes the following methods through a ref:

```tsx
interface ImageKitEditorRef {
  loadImage: (image: string | FileElement) => void;
  loadImages: (images: Array<string | FileElement>) => void;
  setCurrentImage: (imageSrc: string) => void;
  getTemplate: () => Transformation[];
  loadTemplate: (template: Omit<Transformation, 'id'>[]) => void;
}
```

**Template Management Methods:**
- `getTemplate()` - Returns the current editor template (transformation stack)
- `loadTemplate(template)` - Loads a previously saved template into the editor

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

### Focus Objects

You can override the list of selectable focus objects used when a transformation's focus is set to "Object" (e.g., Maintain Aspect Ratio, Forced Crop, Extract). If not provided, the editor defaults to ImageKit's supported objects (e.g., person, bicycle, car, dog, etc.).

See the supported object list in the ImageKit docs: https://imagekit.io/docs/image-resize-and-crop#supported-object-list

```tsx
<ImageKitEditor
  focusObjects={["person", "cat", "car", "customObject"]}
  // ... other props
/>
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

### Template Management

You can save and restore editor templates, enabling features like:
- Template library
- Preset transformation stacks
- Collaborative editing workflows
- Quick application of common transformations

**Template Versioning:** All templates are versioned (currently `v1`) to ensure backward compatibility and safe schema evolution.

#### Saving a Template

```tsx
import { useRef } from 'react';
import { ImageKitEditor, type ImageKitEditorRef, type Transformation } from '@imagekit/editor';

function MyComponent() {
  const editorRef = useRef<ImageKitEditorRef>(null);

  const handleSaveTemplate = () => {
    const template = editorRef.current?.getTemplate();
    if (template) {
      // Remove the auto-generated 'id' field before saving
      const templateToSave = template.map(({ id, ...rest }) => rest);
      
      // Save to localStorage
      localStorage.setItem('editorTemplate', JSON.stringify(templateToSave));
      
      // Or save to your backend
      await api.saveTemplate(templateToSave);
    }
  };

  return (
    <ImageKitEditor
      ref={editorRef}
      // ... other props
      exportOptions={[
        {
          type: 'button',
          label: 'Save Template',
          isVisible: true,
          onClick: handleSaveTemplate
        }
      ]}
    />
  );
}
```

#### Loading a Template

```tsx
const handleLoadTemplate = () => {
  // Load from localStorage
  const saved = localStorage.getItem('editorTemplate');
  
  // Or load from your backend
  // const saved = await api.getTemplate();
  
  if (saved) {
    const template = JSON.parse(saved);
    editorRef.current?.loadTemplate(template);
  }
};
```

#### Template Structure

A template is an array of transformation objects with version information:

```tsx
interface Transformation {
  id: string;           // Auto-generated, omit when saving
  key: string;          // e.g., 'adjust-background'
  name: string;         // e.g., 'Background'
  type: 'transformation';
  value: Record<string, unknown>; // Transformation parameters
  version?: 'v1';       // Template version for compatibility
}

// Version constant
import { TRANSFORMATION_STATE_VERSION } from '@imagekit/editor';
console.log(TRANSFORMATION_STATE_VERSION); // 'v1'
```

**Example template:**
```json
[
  {
    "key": "adjust-background",
    "name": "Background",
    "type": "transformation",
    "value": {
      "backgroundType": "color",
      "background": "#FFFFFF"
    },
    "version": "v1"
  },
  {
    "key": "resize_and_crop-resize_and_crop",
    "name": "Resize and Crop",
    "type": "transformation",
    "value": {
      "width": 800,
      "height": 600,
      "mode": "pad_resize"
    },
    "version": "v1"
  }
]
```

**Version Compatibility:**
- `v1` - Current version with all transformation features
- The `version` field is optional for backward compatibility
- Future versions will maintain backward compatibility where possible

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
  Signer,
  Transformation  // For template management
} from '@imagekit/editor';

// Version constant for template compatibility
import { TRANSFORMATION_STATE_VERSION } from '@imagekit/editor';
```

## Testing

The package includes comprehensive tests to ensure schema stability and API consistency. Run tests:

```bash
# Run tests once
yarn test

# Watch mode
yarn test:watch

# With UI
yarn test:ui
```

### Schema Versioning

The transformation schema is locked down with tests to ensure:
- All transformation categories exist and are stable
- All transformation items have required properties
- Schemas validate correctly
- Template serialization/deserialization works consistently
- Version compatibility is maintained

Current schema version: **v1**

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
