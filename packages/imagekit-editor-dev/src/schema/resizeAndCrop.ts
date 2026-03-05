import { z } from "zod/v3"
import type { TransformationField, TransformationSchema } from "."
import { background } from "./background"
import {
  widthValidator,
  heightValidator,
  aspectRatioValidator,
} from "./transformation"

// Help text explaining single dimension vs both dimensions behavior
export const RESIZE_CROP_HELP_TEXT = "If you specify only one dimension (width or height), the other will be adjusted automatically to preserve the aspect ratio and no cropping is applied. When you specify both dimensions, you'd need to choose a cropping strategy to control how the image is resized or cropped."

// The 8 crop/resize modes available (c-maintain_ratio is default and first)
export const RESIZE_CROP_MODES = [
  {
    value: "c-maintain_ratio",
    label: "Resize, crop if needed",
    paramLabel: "c-maintain_ratio",
  },
  {
    value: "cm-pad_resize",
    label: "Resize, don't crop, add padding if needed",
    paramLabel: "cm-pad_resize",
  },
  {
    value: "cm-extract",
    label: "Extract a part of the image",
    paramLabel: "cm-extract",
  },
  {
    value: "cm-pad_extract",
    label: "Extract a region and pad to match dimensions",
    paramLabel: "cm-pad_extract",
  },
  {
    value: "c-force",
    label: "Resize, don't crop, squeeze if needed",
    paramLabel: "c-force",
  },
  {
    value: "c-at_max",
    label: "Resize to contain inside a box, don't crop",
    paramLabel: "c-at_max",
  },
  {
    value: "c-at_max_enlarge",
    label: "Resize to contain inside a box, enlarge image if needed, don't crop",
    paramLabel: "c-at_max_enlarge",
  },
  {
    value: "c-at_least",
    label: "Resize to be bigger than box, don't crop",
    paramLabel: "c-at_least",
  },
] as const

// Maps mode values to crop/cropMode parameters for URL building
export function getDefaultTransformationFromMode(mode: string): Record<string, unknown> {
  switch (mode) {
    case "cm-pad_resize":
      return { cropMode: "pad_resize" as const }
    case "cm-extract":
      return { cropMode: "extract" as const }
    case "cm-pad_extract":
      return { cropMode: "pad_extract" as const }
    case "c-maintain_ratio":
      return { crop: "maintain_ratio" as const }
    case "c-force":
      return { crop: "force" as const }
    case "c-at_max":
      return { crop: "at_max" as const }
    case "c-at_max_enlarge":
      return { crop: "at_max_enlarge" as const }
    case "c-at_least":
      return { crop: "at_least" as const }
    default:
      return {}
  }
}

// Schema with top-level validation and mode-specific refinements
export const resizeAndCropSchema = z
  .object({
    // Mode dropdown - only visible when both dimensions are set
    mode: z.string().optional(),
    
    // Dimensions - always visible
    width: widthValidator.optional(),
    height: heightValidator.optional(),
    
    // Aspect ratio - for maintain_ratio mode
    aspectRatio: aspectRatioValidator.optional(),
    
    // Focus fields - for pad_resize, maintain_ratio, extract, force (auto only)
    focus: z.string().optional(),
    focusAnchor: z.string().optional(),
    focusObject: z.string().optional(),
    zoom: z.coerce.number().optional(),
    // Only valid when either width or height is specified
    dpr: z
      .union([
        z.coerce
          .number({
            invalid_type_error: "Should be a number.",
          })
          .optional(),
        z.literal("auto"),
      ])
      .optional(),
    
    // Coordinates for extract mode
    coordinateMethod: z.string().optional(),
    x: z.string().optional(),
    y: z.string().optional(),
    xc: z.string().optional(),
    yc: z.string().optional(),
    
    // Background fields for pad_resize and pad_extract
    ...background.getPropsFor("pad_resize").schema,
  })
  .refine(
    (val) => {
      // Top-level validation 1: At least one of width or height required
      return val.width || val.height
    },
    {
      message: "At least one of width or height is required",
      path: [],
    }
  )
  .refine(
    (val) => {
      // Top-level validation 2: When both dimensions are set, mode is required
      if (val.width && val.height) {
        return !!val.mode
      }
      return true
    },
    {
      message: "Mode is required when both width and height are specified",
      path: ["mode"],
    }
  )
  .superRefine((val, ctx) => {
    // DPR validation - can only be used when either width or height is specified
    if (val.dpr && !(val.width || val.height)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DPR can only be used when either width or height is specified",
        path: ["dpr"],
      })
    }

    // Mode-specific validations (only when mode is set)
    if (!val.mode) return
    
    // cm-pad_resize specific validations
    if (val.mode === "cm-pad_resize") {
      // If backgroundType is blurred or generative_fill, both dimensions required
      const backgroundType = (val as any).backgroundType
      if (backgroundType === "blurred" && (!val.width || !val.height)) {
        if (!val.width) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required for blurred background",
            path: ["width"],
          })
        }
        if (!val.height) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required for blurred background",
            path: ["height"],
          })
        }
      }
      if (backgroundType === "generative_fill" && (!val.width || !val.height)) {
        if (!val.width) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required for generative fill background",
            path: ["width"],
          })
        }
        if (!val.height) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required for generative fill background",
            path: ["height"],
          })
        }
      }
    }
    
    // cm-extract specific validations
    if (val.mode === "cm-extract") {
      if (val.focus === "object" && !val.focusObject) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Focus object is required",
          path: ["focusObject"],
        })
      }
      if (val.focus === "anchor" && !val.focusAnchor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Focus anchor is required",
          path: ["focusAnchor"],
        })
      }
      if (val.focus === "coordinates") {
        if (val.coordinateMethod === "topleft") {
          if (!val.x && !val.y) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "At least one coordinate (x or y) is required",
              path: [],
            })
          }
        } else if (val.coordinateMethod === "center") {
          if (!val.xc && !val.yc) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "At least one coordinate (xc or yc) is required",
              path: [],
            })
          }
        }
      }
    }
    
    // Aspect ratio validation (applies at top level, not mode-specific)
    if (val.aspectRatio && !val.width && !val.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aspect ratio must be used with either width or height",
        path: ["aspectRatio"],
      })
    }
    
    // c-maintain_ratio specific validations
    if (val.mode === "c-maintain_ratio") {
      // Focus validations
      if (val.focus === "object" && !val.focusObject) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Focus object is required",
          path: ["focusObject"],
        })
      }
      if (val.focus === "anchor" && !val.focusAnchor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Focus anchor is required",
          path: ["focusAnchor"],
        })
      }
    }
  })

// Transformation fields array
export const resizeAndCropTransformations: TransformationField[] = [
  // 1. Width (always visible)
  {
    label: "Width",
    name: "width",
    fieldType: "input",
    isTransformation: true,
    transformationKey: "width",
    helpText:
      "Specify the output width. Use a decimal between 0 and 1, an integer greater than 1 for pixel units, or an expression.",
    examples: ["0.5 (50%)", "300", "iw_div_2"],
  },
  
  // 2. Height (always visible)
  {
    label: "Height",
    name: "height",
    fieldType: "input",
    isTransformation: true,
    transformationKey: "height",
    helpText:
      "Specify the output height. Use a decimal between 0 and 1, an integer greater than 1, or an expression.",
    examples: ["0.5", "300", "ih_div_2"],
  },
  
  // 3. Aspect Ratio (visible when at least one dimension is set)
  {
    label: "Aspect Ratio",
    name: "aspectRatio",
    fieldType: "input",
    isTransformation: true,
    transformationKey: "aspectRatio",
    helpText:
      "Enter an aspect ratio as 'width-height' or an expression. Must be used with either width or height. Note: If both width and height are specified, aspect ratio is ignored.",
    examples: ["16-9", "4-3", "iar_mul_0.75"],
    isVisible: ({ width, height }) => !!(width || height),
    fieldProps: {
      disabled: false, // Will be controlled by form logic
    },
  },
  
  // 4. Mode dropdown (visible only when both dimensions are set)
  {
    label: "What kind of output?",
    name: "mode",
    fieldType: "select",
    isTransformation: false,
    transformationGroup: "resize_crop_mode",
    fieldProps: {
      options: RESIZE_CROP_MODES.map((mode) => ({
        label: `${mode.label} (${mode.paramLabel})`,
        value: mode.value,
      })),
      defaultValue: "c-maintain_ratio",
    },
    helpText: "Choose how the image should be resized or cropped when both dimensions are specified.",
    isVisible: ({ width, height }) => !!(width && height),
  },
  {
    label: "DPR",
    name: "dpr",
    fieldType: "slider",
    isTransformation: true,
    transformationKey: "dpr",
    helpText:
      "Set this value to deliver images optimised for high-resolution displays. The value can be between 0.1 and 5.",
    fieldProps: {
      defaultValue: 1,
      autoOption: true,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    isVisible: ({ width, height }) => !!(width || height),
  },
  
  // 5. Focus (for pad_resize - anchor only for padding position)
  {
    label: "Focus",
    name: "focus",
    fieldType: "anchor",
    isTransformation: true,
    transformationKey: "focus",
    fieldProps: {
      positions: ["center", "top", "bottom", "left", "right"],
    },
    helpText: "Position the image within the padded area.",
    isVisible: ({ width, height, mode }) => 
      !!(width && height && mode === "cm-pad_resize"),
  },
  
  // 6. Focus select (for maintain_ratio - 4 options)
  {
    label: "Focus",
    name: "focus",
    fieldType: "select",
    isTransformation: true,
    transformationGroup: "focus",
    fieldProps: {
      options: [
        { label: "Auto", value: "auto" },
        { label: "Anchor", value: "anchor" },
        { label: "Face", value: "face" },
        { label: "Object", value: "object" },
      ],
    },
    helpText:
      "Choose how to position the crop. Auto detects the most important part, anchor uses fixed positions, face/object focuses on detected subjects.",
    isVisible: ({ width, height, mode }) => 
      !!(width && height && mode === "c-maintain_ratio"),
  },
  
  // 7. Focus select (for extract - 6 options including Custom and Coordinates)
  {
    label: "Focus",
    name: "focus",
    fieldType: "select",
    isTransformation: true,
    transformationGroup: "focus",
    fieldProps: {
      options: [
        { label: "Auto", value: "auto" },
        { label: "Anchor", value: "anchor" },
        { label: "Face", value: "face" },
        { label: "Object", value: "object" },
        { label: "Custom", value: "custom" },
        { label: "Coordinates", value: "coordinates" },
      ],
    },
    helpText:
      "Choose how to position the extracted region. Custom uses a saved focus area from Media Library.",
    isVisible: ({ width, height, mode }) => 
      !!(width && height && mode === "cm-extract"),
  },
  
  // 8. Focus select for force (auto only)
  {
    label: "Focus",
    name: "focus",
    fieldType: "select",
    isTransformation: true,
    transformationGroup: "focus",
    fieldProps: {
      options: [
        { label: "Auto", value: "auto" },
      ],
    },
    helpText:
      "Automatically detect the most important part of the image.",
    isVisible: ({ width, height, mode }) => 
      !!(width && height && mode === "c-force"),
  },
  
  // 9. Focus Anchor (for extract and maintain_ratio)
  {
    label: "Focus Anchor",
    name: "focusAnchor",
    fieldType: "anchor",
    isTransformation: true,
    transformationGroup: "focus",
    fieldProps: {
      options: [
        { label: "Center", value: "center" },
        { label: "Top", value: "top" },
        { label: "Bottom", value: "bottom" },
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
        { label: "Top Left", value: "top_left" },
        { label: "Top Right", value: "top_right" },
        { label: "Bottom Left", value: "bottom_left" },
        { label: "Bottom Right", value: "bottom_right" },
      ],
    },
    isVisible: ({ width, height, mode, focus }) =>
      !!(width && height && (mode === "cm-extract" || mode === "c-maintain_ratio") && focus === "anchor"),
  },
  
  // 10. Focus Object (for extract and maintain_ratio)
  {
    label: "Focus Object",
    name: "focusObject",
    fieldType: "select",
    isTransformation: true,
    transformationGroup: "focus",
    fieldProps: {
      isCreatable: false,
    },
    helpText:
      "Select an object to focus on. The crop will center on this object.",
    isVisible: ({ width, height, mode, focus }) =>
      !!(width && height && (mode === "cm-extract" || mode === "c-maintain_ratio") && focus === "object"),
  },
  
  // 11. Zoom (for face/object focus in extract and maintain_ratio)
  {
    label: "Zoom",
    name: "zoom",
    fieldType: "zoom",
    isTransformation: true,
    transformationGroup: "focus",
    fieldProps: {
      defaultValue: 100,
    },
    helpText:
      "Select the zoom level for the focus area. Higher zoom levels crop closer to the focus point.",
    isVisible: ({ width, height, mode, focus }) =>
      !!(width && height && (mode === "cm-extract" || mode === "c-maintain_ratio") && (focus === "object" || focus === "face")),
  },
  
  // 12. Coordinate Method (for extract with coordinates)
  {
    label: "Coordinate Method",
    name: "coordinateMethod",
    fieldType: "radio-card",
    isTransformation: false,
    transformationGroup: "focus",
    fieldProps: {
      options: [
        { label: "Top-left (x, y)", value: "topleft" },
        { label: "Center (xc, yc)", value: "center" },
      ],
      defaultValue: "topleft",
    },
    helpText:
      "Choose whether coordinates are relative to the top-left corner or the center of the image.",
    isVisible: ({ width, height, mode, focus }) =>
      !!(width && height && mode === "cm-extract" && focus === "coordinates"),
  },
  
  // 13-16. Coordinate fields (x, y, xc, yc for extract)
  {
    label: "X (Horizontal)",
    name: "x",
    fieldType: "input",
    isTransformation: true,
    transformationGroup: "focus",
    helpText:
      "Horizontal position from the top-left. Use an integer or expression.",
    examples: ["100", "iw_mul_0.4"],
    isVisible: ({ width, height, mode, focus, coordinateMethod }) =>
      !!(width && height && mode === "cm-extract" && focus === "coordinates" && coordinateMethod === "topleft"),
  },
  {
    label: "Y (Vertical)",
    name: "y",
    fieldType: "input",
    isTransformation: true,
    transformationGroup: "focus",
    helpText:
      "Vertical position from the top-left. Use an integer or expression.",
    examples: ["100", "ih_mul_0.4"],
    isVisible: ({ width, height, mode, focus, coordinateMethod }) =>
      !!(width && height && mode === "cm-extract" && focus === "coordinates" && coordinateMethod === "topleft"),
  },
  {
    label: "XC (Horizontal Center)",
    name: "xc",
    fieldType: "input",
    isTransformation: true,
    transformationGroup: "focus",
    helpText:
      "Horizontal center position. Use an integer or expression.",
    examples: ["200", "iw_mul_0.5"],
    isVisible: ({ width, height, mode, focus, coordinateMethod }) =>
      !!(width && height && mode === "cm-extract" && focus === "coordinates" && coordinateMethod === "center"),
  },
  {
    label: "YC (Vertical Center)",
    name: "yc",
    fieldType: "input",
    isTransformation: true,
    transformationGroup: "focus",
    helpText: "Vertical center position. Use an integer or expression.",
    examples: ["200", "ih_mul_0.5"],
    isVisible: ({ width, height, mode, focus, coordinateMethod }) =>
      !!(width && height && mode === "cm-extract" && focus === "coordinates" && coordinateMethod === "center"),
  },
  
  // 17. Background fields (for pad_resize mode)
  // These will be spread from background.getPropsFor("pad_resize")
  // We need to add them with isVisible checks for pad_resize mode
]

// Add background fields for pad_resize with mode visibility
const padResizeBackgroundFields = background.getPropsFor("pad_resize").transformations({ transformationGroup: "background" })
padResizeBackgroundFields.forEach((field) => {
  const originalIsVisible = field.isVisible
  resizeAndCropTransformations.push({
    ...field,
    isVisible: (values: Record<string, unknown>) => {
      const { width, height, mode } = values
      if (!width || !height || mode !== "cm-pad_resize") return false
      if (originalIsVisible) {
        return originalIsVisible(values)
      }
      return true
    },
  })
})

// Add background fields for pad_extract with mode visibility
const padExtractBackgroundFields = background.getPropsFor("pad_extract").transformations({ transformationGroup: "background" })
padExtractBackgroundFields.forEach((field) => {
  const originalIsVisible = field.isVisible
  resizeAndCropTransformations.push({
    ...field,
    isVisible: (values: Record<string, unknown>) => {
      const { width, height, mode } = values
      if (!width || !height || mode !== "cm-pad_extract") return false
      if (originalIsVisible) {
        return originalIsVisible(values)
      }
      return true
    },
  })
})

// Export the category
export const resizeAndCropCategory: TransformationSchema = {
  key: "resize_and_crop",
  name: "Resize and Crop",
  items: [
    {
      key: "resize_and_crop-resize_and_crop",
      name: "Resize and Crop",
      description:
        "Resize and crop images with flexible options. Specify one dimension to auto-scale, or both dimensions with a cropping strategy for precise control.",
      docsLink:
        "https://imagekit.io/docs/image-resize-and-crop#crop-crop-modes--focus",
      defaultTransformation: {},
      schema: resizeAndCropSchema,
      transformations: resizeAndCropTransformations,
    },
  ],
}
