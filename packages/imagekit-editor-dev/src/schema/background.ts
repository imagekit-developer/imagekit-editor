import { z } from "zod/v3"
import type { TransformationField } from "."
import { colorValidator } from "./transformation"

export const SUPPORTED_BACKGROUND_TYPES: Record<
  string,
  { label: string; value: string }
> = {
  // Solid color background - bg-<color> and bg-dominant
  color: {
    label: "Color",
    value: "color",
  },
  // Gradient background - bg-gradient_dominant and e-gradient with layers
  gradient: {
    label: "Gradient",
    value: "gradient",
  },
  // Blurred background - bg-blurred
  blurred: {
    label: "Blurred",
    value: "blurred",
  },
  // AI Generative Fill - bg-genfill
  genfill: {
    label: "Generative Fill",
    value: "generative_fill",
  },
} as const

export type BackgroundContext = "pad_extract" | "pad_resize" | "root_image"

export const backgroundTransformations: Record<
  string,
  ({
    context,
    transformationGroup,
  }: {
    context: BackgroundContext
    transformationGroup: string | undefined
  }) => TransformationField
> = {
  backgroundType: ({ context, transformationGroup }) => {
    // Filter background types based on context
    let availableTypes = Object.values(SUPPORTED_BACKGROUND_TYPES)

    if (context === "root_image") {
      // Global transformations: only color and gradient
      availableTypes = availableTypes.filter(
        (type) => type.value === "color" || type.value === "gradient",
      )
    } else if (context === "pad_extract") {
      // Pad extract: color, gradient, and generative fill (no blur)
      availableTypes = availableTypes.filter(
        (type) =>
          type.value === "color" ||
          type.value === "gradient" ||
          type.value === "generative_fill",
      )
    }
    // For pad_resize, all types are available

    const transformation: TransformationField = {
      label: "Background Type",
      name: "backgroundType",
      fieldType: "select",
      isTransformation: false,
      transformationGroup: transformationGroup,
      fieldProps: {
        options: availableTypes.map((type) => ({
          label: type.label,
          value: type.value,
        })),
        isClearable: true,
      },
      helpText: "Choose the type of background to apply to your image.",
    }

    if (context === "root_image" && transformation.fieldProps) {
      transformation.fieldProps.isClearable = false
    }

    return transformation
  },
  background: ({ context, transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Background Color",
      name: "background",
      fieldType: "color-picker",
      transformationGroup: transformationGroup,
      isTransformation: true,
      helpText: "Apply a solid color to the background.",
      examples: ["FFFFFF", "FF0000"],
      isVisible: ({ backgroundType }) => backgroundType === "color",
      fieldProps: {
        isClearable: true,
      },
    }

    switch (context) {
      case "root_image":
        // Root image: show color picker when type is color and auto pick is off
        transformation.isVisible = ({
          backgroundType,
          backgroundDominantAuto,
        }) => backgroundType === "color" && !backgroundDominantAuto
        break
      case "pad_resize":
      case "pad_extract":
        // Contexts that support bg-dominant: show color picker when type is color and auto pick is off
        transformation.isVisible = ({
          backgroundType,
          backgroundDominantAuto,
        }) => backgroundType === "color" && !backgroundDominantAuto
        break
    }

    return transformation
  },
  backgroundDominantAuto: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Auto-pick dominant color from borders",
      name: "backgroundDominantAuto",
      fieldType: "switch",
      isTransformation: false,
      transformationGroup: transformationGroup,
      fieldProps: {
        defaultValue: false,
      },
      helpText:
        "Automatically pick the most dominant color from the border pixels of the image. Useful when using pad_resize or pad_extract crop modes.",
      isVisible: ({ backgroundType }) => backgroundType === "color",
    }

    return transformation
  },
  backgroundGradientAutoDominant: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Auto-detect gradient colors",
      name: "backgroundGradientAutoDominant",
      fieldType: "switch",
      isTransformation: false,
      transformationGroup: transformationGroup,
      helpText:
        "Automatically pick the most dominant colors from the image to form a gradient background.",
      isVisible: ({ backgroundType }) => backgroundType === "gradient",
    }

    return transformation
  },
  backgroundGradientMode: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Gradient Mode",
      name: "backgroundGradientMode",
      fieldType: "select",
      isTransformation: false,
      transformationGroup: transformationGroup,
      fieldProps: {
        options: [{ label: "Dominant", value: "dominant" }],
        defaultValue: "dominant",
      },
      helpText: "The method used to generate the gradient.",
      isVisible: ({ backgroundType, backgroundGradientAutoDominant }) =>
        backgroundType === "gradient" &&
        backgroundGradientAutoDominant === true,
    }

    return transformation
  },
  backgroundGradientPaletteSize: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Palette Size",
      name: "backgroundGradientPaletteSize",
      fieldType: "radio-card",
      isTransformation: false,
      transformationGroup: transformationGroup,
      fieldProps: {
        options: [
          { label: "2 Colors (Linear)", value: "2" },
          { label: "4 Colors (Corners)", value: "4" },
        ],
        defaultValue: "2",
        columns: 2,
      },
      helpText:
        "Number of colors to pick from the image. 2 creates a linear gradient, 4 creates corner interpolation.",
      isVisible: ({ backgroundType, backgroundGradientAutoDominant }) =>
        backgroundType === "gradient" &&
        backgroundGradientAutoDominant === true,
    }

    return transformation
  },
  backgroundBlurIntensity: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Background Blur Intensity",
      name: "backgroundBlurIntensity",
      fieldType: "slider",
      helpText:
        "For blurred backgrounds, choose a blur radius or select 'auto' for a smart default. Width and height are required when using a blurred background.",
      examples: ["auto", "30"],
      isTransformation: true,
      transformationGroup: transformationGroup,
      fieldProps: {
        defaultValue: "auto",
        min: 0,
        max: 100,
        step: 1,
        autoOption: true,
      },
      isVisible: ({ backgroundType }) => backgroundType === "blurred",
    }

    return transformation
  },
  backgroundBlurBrightness: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Background Blur Brightness",
      name: "backgroundBlurBrightness",
      fieldType: "slider",
      helpText:
        "Adjust the brightness of a blurred background. Use a number between −255 (darker) and 255 (brighter).",
      isTransformation: false,
      transformationGroup: transformationGroup,
      fieldProps: {
        defaultValue: "0",
        min: -255,
        max: 255,
        step: 5,
      },
      isVisible: ({ backgroundType }) => backgroundType === "blurred",
    }

    return transformation
  },
  backgroundGenerativeFill: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Background Generative Fill",
      name: "backgroundGenerativeFill",
      fieldType: "input",
      transformationGroup: transformationGroup,
      isTransformation: true,
      helpText:
        "When using AI generative background, provide a text prompt describing what should be generated.",
      examples: ["mountain landscape"],
      isVisible: ({ backgroundType }) => backgroundType === "generative_fill",
    }

    return transformation
  },
  backgroundGradient: ({ transformationGroup }) => {
    const transformation: TransformationField = {
      label: "Background Gradient",
      name: "backgroundGradient",
      fieldType: "gradient-picker",
      transformationGroup: transformationGroup,
      isTransformation: true,
      helpText:
        "Create a custom gradient background with your chosen colors and direction.",
      fieldProps: {
        defaultValue: {
          from: "#FFFFFFFF",
          to: "#00000000",
          direction: "bottom",
          stopPoint: 100,
        },
      },
      isVisible: ({ backgroundType, backgroundGradientAutoDominant }) =>
        backgroundType === "gradient" &&
        backgroundGradientAutoDominant !== true,
    }

    return transformation
  },
}

export const background = {
  schemas: {
    backgroundType: z.string().optional(),
    background: z
      .union([z.literal("").transform(() => ""), colorValidator])
      .optional(),
    backgroundGenerativeFill: z.string().optional(),
    backgroundBlurIntensity: z.coerce
      .string({
        invalid_type_error: "Should be a number between 1 and 100 or auto.",
      })
      .optional(),
    backgroundBlurBrightness: z.coerce
      .string({
        invalid_type_error: "Should be a number between -255 and 255.",
      })
      .optional(),
    backgroundDominantAuto: z.coerce
      .boolean({
        invalid_type_error: "Should be a boolean.",
      })
      .optional(),
    backgroundGradientAutoDominant: z.coerce
      .boolean({
        invalid_type_error: "Should be a boolean.",
      })
      .optional(),
    backgroundGradientMode: z.string().optional(),
    backgroundGradientPaletteSize: z.string().optional(),
    backgroundGradient: z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        direction: z
          .union([
            z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .min(0)
              .max(359),
            z.string(),
          ])
          .optional(),
        stopPoint: z
          .union([
            z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .min(1)
              .max(100),
            z.string(),
          ])
          .optional(),
      })
      .optional(),
  },
  getPropsFor: (
    context: BackgroundContext,
  ): {
    schema: Record<string, z.ZodTypeAny>
    transformations: ({
      transformationGroup,
    }: {
      transformationGroup: string | undefined
    }) => TransformationField[]
  } => {
    let schemaToBeReturned: Record<string, z.ZodTypeAny> = {
      backgroundType: background.schemas.backgroundType,
    }

    switch (context) {
      case "root_image":
        // Global transformations: color + gradient support (no bg-dominant)
        schemaToBeReturned = {
          ...schemaToBeReturned,
          background: background.schemas.background,
          backgroundGradientAutoDominant:
            background.schemas.backgroundGradientAutoDominant,
          backgroundGradientMode: background.schemas.backgroundGradientMode,
          backgroundGradientPaletteSize:
            background.schemas.backgroundGradientPaletteSize,
          backgroundGradient: background.schemas.backgroundGradient,
        }
        break
      case "pad_extract":
        // Pad extract: color + gradient + generative fill (no blur)
        schemaToBeReturned = {
          ...schemaToBeReturned,
          background: background.schemas.background,
          backgroundDominantAuto: background.schemas.backgroundDominantAuto,
          backgroundGradientAutoDominant:
            background.schemas.backgroundGradientAutoDominant,
          backgroundGradientMode: background.schemas.backgroundGradientMode,
          backgroundGradientPaletteSize:
            background.schemas.backgroundGradientPaletteSize,
          backgroundGradient: background.schemas.backgroundGradient,
          backgroundGenerativeFill: background.schemas.backgroundGenerativeFill,
        }
        break
      case "pad_resize":
        // Pad resize: all background types supported
        schemaToBeReturned = {
          ...schemaToBeReturned,
          background: background.schemas.background,
          backgroundDominantAuto: background.schemas.backgroundDominantAuto,
          backgroundGradientAutoDominant:
            background.schemas.backgroundGradientAutoDominant,
          backgroundGradientMode: background.schemas.backgroundGradientMode,
          backgroundGradientPaletteSize:
            background.schemas.backgroundGradientPaletteSize,
          backgroundGradient: background.schemas.backgroundGradient,
          backgroundBlurIntensity: background.schemas.backgroundBlurIntensity,
          backgroundBlurBrightness: background.schemas.backgroundBlurBrightness,
          backgroundGenerativeFill: background.schemas.backgroundGenerativeFill,
        }
        break
    }

    // Automatically pick the transformations based on the schema
    const transformationsToBeReturned = (
      transformationGroup: string | undefined,
    ) =>
      Object.entries(backgroundTransformations)
        .filter(([transformationName]) => {
          return schemaToBeReturned[transformationName] !== undefined
        })
        .map(([, transformationFactory]) => {
          return transformationFactory({ context, transformationGroup })
        })

    return {
      schema: schemaToBeReturned,
      transformations: ({
        transformationGroup,
      }: {
        transformationGroup: string
      }) => transformationsToBeReturned(transformationGroup),
    }
  },
}
