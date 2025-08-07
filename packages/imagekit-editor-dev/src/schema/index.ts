import type { Transformation } from "@imagekit/javascript"
import { z } from "zod/v3"
import { SIMPLE_OVERLAY_TEXT_REGEX, safeBtoa } from "../utils"
import {
  aspectRatioValidator,
  colorValidator,
  heightValidator,
  widthValidator,
} from "./transformation"

export interface TransformationItem {
  key: string
  name: string
  defaultTransformation: Transformation
  description?: string
  docsLink?: string
  schema: z.ZodTypeAny
  transformations: TransformationField[]
}

export interface TransformationField {
  label: string
  name: string
  fieldType?: "input" | "select" | string
  fieldProps?: Record<string, unknown> & {
    defaultValue?: string | number
    options?: {
      label: string
      value: string
    }[]
    autoOption?: boolean
    min?: number
    max?: number
    step?: number
  }
  helpText?: string
  examples?: string[]
  isTransformation: boolean
  transformationKey?: string
  isVisible?: (value: Record<string, unknown>) => boolean
  transformationGroup?: string
}

export interface TransformationSchema {
  key: string
  name: string
  items: TransformationItem[]
}

export const transformationSchema: TransformationSchema[] = [
  {
    key: "resize",
    name: "Resize",
    items: [
      {
        key: "resize-pad_resize",
        name: "Pad Resize",
        // When using the pad resize crop strategy, ImageKit resizes the image to the
        // requested width and/or height while preserving the original aspect ratio.
        // Any remaining space is filled with a background, which can be a solid
        // colour, a blurred version of the image or a generative fill. This
        // strategy never crops the image content.
        description:
          "Resize an image to fit within the specified width and height while preserving its aspect ratio. Any extra space is padded with a background colour, a blurred version of the image, or an AI-generated fill.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#pad-resize-crop-strategy-cm-pad_resize",
        defaultTransformation: { cropMode: "pad_resize" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            backgroundType: z.string().optional(),
            background: z
              .union([z.literal("").transform(() => ""), colorValidator])
              .optional(),
            backgroundBlurIntensity: z.coerce.string().optional(),
            backgroundBlurBrightness: z.coerce.string().optional(),
            backgroundGenerativeFill: z.string().optional(),
            focus: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          )
          .superRefine((val, ctx) => {
            if (
              val.backgroundType === "blurred" &&
              (!val.width || !val.height)
            ) {
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

            if (
              val.backgroundType === "generative_fill" &&
              (!val.width || !val.height)
            ) {
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
          }),
        transformations: [
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
          {
            label: "Background Type",
            name: "backgroundType",
            fieldType: "select",
            isTransformation: false,
            transformationGroup: "background",
            fieldProps: {
              options: [
                { label: "Color", value: "color" },
                { label: "Blurred", value: "blurred" },
                { label: "Generative Fill", value: "generative_fill" },
              ],
            },
          },
          {
            label: "Background Color",
            name: "background",
            fieldType: "color-picker",
            transformationGroup: "background",
            isTransformation: true,
            isVisible: ({ backgroundType }) => backgroundType === "color",
          },
          {
            label: "Background Blur Intensity",
            name: "backgroundBlurIntensity",
            fieldType: "slider",
            helpText:
              "For blurred backgrounds, choose a blur radius or select 'auto' for a smart default. Width and height are required when using a blurred background.",
            examples: ["auto", "30"],
            isTransformation: true,
            transformationKey: "background",
            transformationGroup: "background",
            fieldProps: {
              defaultValue: "auto",
              min: 0,
              max: 100,
              step: 1,
              autoOption: true,
            },
            isVisible: ({ backgroundType }) => backgroundType === "blurred",
          },
          {
            label: "Background Blur Brightness",
            name: "backgroundBlurBrightness",
            fieldType: "slider",
            helpText:
              "Adjust the brightness of a blurred background. Use a number between −255 (darker) and 255 (brighter).",
            isTransformation: false,
            transformationGroup: "background",
            fieldProps: {
              defaultValue: 0,
              min: -255,
              max: 255,
              step: 5,
            },
            isVisible: ({ backgroundType }) => backgroundType === "blurred",
          },
          {
            label: "Background Generative Fill",
            name: "backgroundGenerativeFill",
            fieldType: "input",
            helpText:
              "When using a generative fill background, enter an optional text prompt describing what should fill the padded area. Width and height are required for generative fill.",
            examples: ["snowy forest"],
            isTransformation: true,
            transformationGroup: "background",
            isVisible: ({ backgroundType }) =>
              backgroundType === "generative_fill",
          },
          {
            label: "Focus",
            name: "focus",
            fieldType: "anchor",
            isTransformation: true,
            transformationKey: "focus",
            fieldProps: {
              positions: ["center", "top", "bottom", "left", "right"],
            },
          },
        ],
      },
      {
        key: "resize-maintain_aspect_ratio",
        name: "Maintain Aspect Ratio",
        // This strategy resizes and crops the image to fit the requested box while
        // preserving the original aspect ratio. It may crop parts of the image
        // (default centre crop) to achieve the final size. You can specify only
        // one dimension (width or height) or an aspect ratio. Focus settings can
        // be used to keep important content in view.
        description:
          "Resize an image to the requested dimensions while preserving its aspect ratio. The image is scaled and cropped as necessary; specify width, height or an aspect ratio, and optionally set a focus area.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#maintain-ratio-crop-strategy-c-maintain_ratio",
        defaultTransformation: { crop: "maintain_ratio" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            aspectRatio: aspectRatioValidator.optional(),
            focus: z.string().optional(),
            focusAnchor: z.string().optional(),
            focusObject: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          )
          .superRefine((val, ctx) => {
            if (val.width && val.height) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Width and height cannot be used together",
                path: [],
              })
            }
            if (val.width && val.height && val.aspectRatio) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "Width, height and aspect ratio cannot be used together",
                path: [],
              })
            }
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
          }),
        transformations: [
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            helpText:
              "Specify the target width. Width and height cannot be used together. Use a decimal, an integer, or an expression.",
            examples: ["0.5", "300", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Specify the target height. Height and width cannot be used together. Use a decimal, an integer, or an expression.",
            examples: ["0.5", "300", "ih_div_2"],
          },
          {
            label: "Aspect Ratio",
            name: "aspectRatio",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "aspectRatio",
            helpText:
              "Enter an aspect ratio as 'width-height' or an expression. Cannot be used alongside both width and height.",
            examples: ["16-9", "4-3", "iar_mul_0.75"],
          },
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
          },
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
            isVisible: ({ focus }) => focus === "anchor",
          },
          {
            label: "Focus Object",
            name: "focusObject",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "focus",
            isVisible: ({ focus }) => focus === "object",
          },
        ],
      },
      {
        key: "resize-forced_crop",
        name: "Forced Crop",
        // Forced crop squeezes the entire image into the requested width and height,
        // ignoring the original aspect ratio. The image is not cropped; instead it
        // is stretched or squashed to exactly fit the provided dimensions.
        description:
          "Resize an image to exactly the specified width and height, distorting the aspect ratio if necessary. The entire original image is preserved without cropping.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#forced-crop-c-force",
        defaultTransformation: { crop: "force" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            focus: z.string().optional(),
            focusAnchor: z.string().optional(),
            focusObject: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            helpText:
              "Specify the exact width of the output. The image will be squashed or stretched to fit this width if both width and height are provided. Use a decimal, integer, or expression.",
            examples: ["0.5", "300", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Specify the exact height of the output. The image will be squashed or stretched to fit this height if both width and height are provided. Use a decimal, integer, or expression.",
            examples: ["0.5", "300", "ih_div_2"],
          },
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
          },
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
            isVisible: ({ focus }) => focus === "anchor",
          },
          {
            label: "Focus Object",
            name: "focusObject",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "focus",
            isVisible: ({ focus }) => focus === "object",
          },
        ],
      },
      {
        key: "resize-max_size",
        name: "Max Size",
        // Max size cropping preserves the aspect ratio and scales the image so
        // that at least one dimension matches the requested size, while the other
        // dimension is equal to or smaller than the requested dimension. It
        // guarantees the output image will never be larger than the requested box.
        description:
          "Resize the image so that it fits within the specified width and/or height. The aspect ratio is preserved and at least one dimension will match the request while the other may be smaller.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#max-size-crop-strategy-c-at_max",
        defaultTransformation: { crop: "at_max" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            helpText:
              "Specify the maximum width. The image will scale down to fit within this width while preserving aspect ratio. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Specify the maximum height. The image will scale down to fit within this height while preserving aspect ratio. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "ih_div_2"],
          },
        ],
      },
      {
        key: "resize-max_size_enlarge",
        name: "Max Size (Enlarge)",
        // The max size (enlarge) strategy behaves like max size cropping but
        // allows the image to be upscaled if the requested dimensions are larger
        // than the original. Aspect ratio is preserved and at least one
        // dimension will match the requested size.
        description:
          "Resize the image so that it fits within the specified dimensions, preserving aspect ratio. If the target size is larger than the original image, the image will be upscaled.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#max-size-enlarge-crop-strategy-c-at_max_enlarge",
        defaultTransformation: { crop: "at_max_enlarge" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            helpText:
              "Specify the maximum width. The image will scale up or down to fit this width while preserving aspect ratio. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Specify the maximum height. The image will scale up or down to fit this height while preserving aspect ratio. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "ih_div_2"],
          },
        ],
      },
      {
        key: "resize-at_least",
        name: "Min-size",
        // The min-size crop strategy resizes the image so that at least one
        // dimension is equal to or greater than the requested dimension. The
        // aspect ratio is preserved and the other dimension may exceed the
        // requested value.
        description:
          "Resize the image so that it meets or exceeds the specified width and/or height. The aspect ratio is preserved and at least one dimension will match or exceed the request.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#min-size-crop-strategy-c-at_least",
        defaultTransformation: { crop: "at_least" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            helpText:
              "Specify the minimum width. The image will scale so that the width is at least this value while preserving aspect ratio. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Specify the minimum height. The image will scale so that the height is at least this value while preserving aspect ratio. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "ih_div_2"],
          },
        ],
      },
    ],
  },
  {
    key: "crop_extract",
    name: "Crop & Extract",
    items: [
      {
        key: "crop_extract-extract",
        name: "Extract",
        // Extract crop cuts out a region of the specified width and height from
        // the original image without scaling. The crop can be centred by default
        // or positioned using focus (anchor or object). If the specified crop
        // area is larger than the original bounds, the operation will fail.
        description:
          "Extract a rectangular region from the original image without resizing. Specify width and height to define the area and optionally choose a focus point or object to position the crop.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#extract-crop-strategy-cm-extract",
        defaultTransformation: { cropMode: "extract" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            focus: z.string().optional(),
            focusAnchor: z.string().optional(),
            focusObject: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            helpText:
              "Specify the width of the region to extract. Use a decimal, an integer, or an expression. The image is not resized; only the specified region is returned.",
            examples: ["0.5", "300", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Specify the height of the region to extract. Use a decimal, an integer, or an expression. The image is not resized; only the specified region is returned.",
            examples: ["0.5", "300", "ih_div_2"],
          },
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
          },
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
            isVisible: ({ focus }) => focus === "anchor",
          },
          {
            label: "Focus Object",
            name: "focusObject",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "focus",
            isVisible: ({ focus }) => focus === "object",
          },
        ],
      },
      {
        key: "crop_extract-pad_extract",
        name: "Pad Extract",
        // Pad extract crops a region from the image like extract, but if the
        // cropped region is smaller than the requested dimensions it pads the
        // remaining area. This allows you to centre or position a subject and
        // fill unused space with a solid colour or generative fill.
        description:
          "Extract a region from the image and pad it to match the requested dimensions. Use a solid colour or an AI-generated fill for the padding and optionally set a focus point.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#pad-extract-crop-strategy-cm-pad_extract",
        defaultTransformation: { cropMode: "pad_extract" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            backgroundType: z.string().optional(),
            background: z
              .union([z.literal("").transform(() => ""), colorValidator])
              .optional(),
            backgroundGenerativeFill: z.string().optional(),
            focus: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            helpText:
              "Specify the width of the extracted region. If the region is smaller than this width, padding will be added. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Specify the height of the extracted region. If the region is smaller than this height, padding will be added. Use a percentage, pixels, or an expression.",
            examples: ["0.5", "300", "ih_div_2"],
          },
          {
            label: "Background Type",
            name: "backgroundType",
            fieldType: "select",
            isTransformation: false,
            fieldProps: {
              options: [
                { label: "Color", value: "color" },
                { label: "Generative Fill", value: "generative_fill" },
              ],
            },
          },
          {
            label: "Background Color",
            name: "background",
            fieldType: "input",
            transformationKey: "background",
            isTransformation: true,
            helpText:
              "When using colour padding, enter a hex code or colour name.",
            examples: ["FFFFFF", "white"],
            isVisible: ({ backgroundType }) => backgroundType === "color",
          },
          {
            label: "Background Generative Fill",
            name: "backgroundGenerativeFill",
            fieldType: "input",
            transformationKey: "aiChangeBackground",
            isTransformation: true,
            helpText:
              "When using AI generative padding, provide a text prompt describing the fill.",
            examples: ["mountain landscape"],
            isVisible: ({ backgroundType }) =>
              backgroundType === "generative_fill",
          },
          {
            label: "Focus",
            name: "focus",
            fieldType: "select",
            isTransformation: true,
            transformationKey: "focus",
            fieldProps: {
              options: [
                { label: "Center", value: "center" },
                { label: "Top Left", value: "top_left" },
                { label: "Top Right", value: "top_right" },
                { label: "Bottom Left", value: "bottom_left" },
                { label: "Bottom Right", value: "bottom_right" },
                { label: "Top", value: "top" },
                { label: "Bottom", value: "bottom" },
                { label: "Left", value: "left" },
                { label: "Right", value: "right" },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    key: "adjust",
    name: "Adjust",
    items: [
      {
        key: "adjust-contrast",
        name: "Contrast",
        // Contrast stretch automatically expands the tonal range of the image
        // making dark areas darker and light areas lighter. This toggle applies
        // ImageKit's e-contrast effect.
        description:
          "Enhance the tonal range of the image automatically by stretching the contrast. Dark areas become darker and light areas become lighter.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#contrast-stretch-e-contrast",
        defaultTransformation: {},
        schema: z
          .object({
            contrast: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Contrast",
            name: "contrast",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "contrast",
            helpText:
              "Toggle to automatically stretch and enhance image contrast.",
          },
        ],
      },
      {
        key: "adjust-shadow",
        name: "Shadow",
        // Adds a non-AI shadow beneath objects in images with a transparent background. You can adjust blur, saturation and positional offsets.
        description:
          "Add a non-AI shadow beneath objects in images with a transparent background. Use blur, saturation and offset controls to customise the shadow.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#shadow-e-shadow",
        defaultTransformation: {},
        // Schema allows toggling the shadow effect and specifying optional blur, saturation and X/Y offsets.
        schema: z
          .object({
            // Toggle to enable or disable the shadow effect
            shadow: z.coerce.boolean().optional(),
            // Optional blur radius for the shadow (0–15). Accepts numeric or string input
            shadowBlur: z.string().optional(),
            // Optional saturation level for the shadow (0–100). Accepts numeric or string input
            shadowSaturation: z.string().optional(),
            // Optional horizontal offset; prefix negative values with N (e.g., N10 for -10%)
            shadowOffsetX: z.string().optional(),
            // Optional vertical offset; prefix negative values with N (e.g., N5 for -5%)
            shadowOffsetY: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some(
                  (v) => v !== undefined && v !== null && v !== "",
                )
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Shadow",
            name: "shadow",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "shadow",
            helpText:
              "Toggle to add a non-AI shadow under objects in the image.",
          },
          {
            label: "Blur",
            name: "shadowBlur",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "shadow",
            helpText:
              "Set the blur radius for the shadow. Higher values create a softer shadow.",
            examples: ["5"],
            fieldProps: {
              min: 0,
              max: 15,
              step: 1,
              defaultValue: 10,
            },
            isVisible: ({ shadow }) => shadow === true,
          },
          {
            label: "Saturation",
            name: "shadowSaturation",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "shadow",
            helpText:
              "Adjust the saturation of the shadow. Higher values produce a darker shadow.",
            examples: ["40"],
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 40,
            },
            isVisible: ({ shadow }) => shadow === true,
          },
          {
            label: "X Offset",
            name: "shadowOffsetX",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "shadow",
            helpText:
              "Enter the horizontal offset as a percentage of the image width. For negative values prefix with 'N'.",
            examples: ["10", "N10"],
            isVisible: ({ shadow }) => shadow === true,
          },
          {
            label: "Y Offset",
            name: "shadowOffsetY",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "shadow",
            helpText:
              "Enter the vertical offset as a percentage of the image height. For negative values prefix with 'N'.",
            examples: ["5", "N5"],
            isVisible: ({ shadow }) => shadow === true,
          },
        ],
      },
      {
        key: "adjust-grayscale",
        name: "Grayscale",
        description: "Convert the image to grayscale (black and white).",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#grayscale-e-grayscale",
        defaultTransformation: {},
        schema: z
          .object({
            grayscale: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Grayscale",
            name: "grayscale",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "grayscale",
            helpText: "Toggle to convert the image to grayscale.",
          },
        ],
      },
      {
        key: "adjust-blur",
        name: "Blur",
        description:
          "Apply a Gaussian blur to the image. Higher values create a stronger blur effect.",
        docsLink: "https://imagekit.io/docs/effects-and-enhancements#blur-bl",
        defaultTransformation: {},
        schema: z
          .object({
            blur: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Blur",
            name: "blur",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "blur",
            helpText:
              "Enter a blur radius to control the intensity of the Gaussian blur.",
            examples: ["10"],
          },
        ],
      },
      {
        key: "adjust-rotate",
        name: "Rotate",
        description:
          "Rotate the image by a specified number of degrees clockwise or counter-clockwise, or automatically rotate based on EXIF orientation.",
        docsLink: "https://imagekit.io/docs/effects-and-enhancements#rotate-rt",
        defaultTransformation: {},
        schema: z
          .object({
            rotate: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Rotate",
            name: "rotate",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "rt",
            helpText:
              "Enter degrees to rotate the image clockwise. Prefix with 'N' for counter-clockwise rotation or use 'auto' to rotate based on EXIF data.",
            examples: ["90", "N45", "auto"],
          },
        ],
      },
      {
        key: "adjust-flip",
        name: "Flip",
        description: "Flip the image horizontally, vertically, or both.",
        docsLink: "https://imagekit.io/docs/effects-and-enhancements#flip-fl",
        defaultTransformation: {},
        schema: z
          .object({
            flip: z.coerce.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Flip",
            name: "flip",
            fieldType: "select",
            isTransformation: true,
            transformationKey: "fl",
            helpText:
              "Choose how to flip the image: horizontally, vertically, or both.",
            examples: ["h", "v", "h_v"],
            fieldProps: {
              options: [
                { label: "Horizontal", value: "h" },
                { label: "Vertical", value: "v" },
                { label: "Both", value: "h_v" },
              ],
            },
          },
        ],
      },
      {
        key: "adjust-radius",
        name: "Radius",
        description:
          "Round the corners of the image. Specify a radius value to control how rounded the corners are, or use 'max' to make the image circular.",
        docsLink: "https://imagekit.io/docs/effects-and-enhancements#radius-r",
        defaultTransformation: {},
        schema: z
          .object({
            radius: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Radius",
            name: "radius",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "r",
            helpText:
              "Enter a positive integer for rounded corners or 'max' for a fully circular output.",
            examples: ["10", "max"],
          },
        ],
      },
      {
        key: "adjust-opacity",
        name: "Opacity",
        description:
          "Adjust the opacity of the image to make it more or less transparent.",
        docsLink: "https://imagekit.io/docs/effects-and-enhancements",
        defaultTransformation: {},
        schema: z
          .object({
            opacity: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Opacity",
            name: "opacity",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "opacity",
            helpText: "Enter an opacity percentage between 0 and 100.",
            examples: ["50"],
          },
        ],
      },
    ],
  },
  {
    key: "effect",
    name: "Effect",
    items: [
      {
        key: "effect-removedotbg",
        name: "Remove Dot Background",
        // This option removes the background using the third-party remove.bg service.
        description:
          "Remove the background of the image using Remove.bg (external service). This isolates the subject and makes the background transparent.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#background-removal-e-removedotbg",
        defaultTransformation: {},
        schema: z
          .object({
            removedotbg: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Remove Background using Remove.bg",
            name: "removedotbg",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "aiRemoveBackgroundExternal",
            helpText:
              "Toggle to remove the background using Remove.bg. Processing may take a few seconds depending on image complexity.",
          },
        ],
      },
      {
        key: "effect-bgremove",
        name: "ImageKit Background Removal",
        description:
          "Remove the background using ImageKit's built-in background removal model. This method is cost-effective compared to Remove.bg.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#imagekit-background-removal-e-bgremove",
        defaultTransformation: {},
        schema: z
          .object({
            bgremove: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Remove Background using ImageKit",
            name: "bgremove",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "aiRemoveBackground",
            helpText:
              "Toggle to remove the background using ImageKit's own background removal.",
          },
        ],
      },
      {
        key: "effect-changebg",
        name: "Change Background",
        description:
          "Replace the background of the image with a new scene described by a text prompt. Use AI to generate a new background.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#change-background-e-changebg",
        defaultTransformation: {},
        schema: z
          .object({
            changebg: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Change Background",
            name: "changebg",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "aiChangeBackground",
            helpText: "Enter a descriptive prompt for the new background.",
            examples: ["snowy mountains", "sunset beach"],
          },
        ],
      },
      {
        key: "effect-edit",
        name: "Edit Image using AI",
        description:
          "Use AI to modify the image based on a descriptive prompt. Add or remove objects or alter colours and textures.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#edit-image-e-edit",
        defaultTransformation: {},
        schema: z
          .object({
            edit: z.string().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Edit Image using AI",
            name: "edit",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "e-edit-prompt",
            helpText: "Enter a prompt describing how to edit the image.",
            examples: ["add sunglasses", "make the sky blue"],
          },
        ],
      },
      {
        key: "effect-dropshadow",
        name: "Drop Shadow",
        description:
          "Add a realistic AI-generated drop shadow around the object. Requires a transparent background; remove the background first for best results.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#ai-drop-shadow-e-dropshadow",
        defaultTransformation: {},
        schema: z
          .object({
            dropshadow: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Drop Shadow",
            name: "dropshadow",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "aiDropShadow",
            helpText:
              "Toggle to add an AI-generated drop shadow. Requires transparent background.",
          },
        ],
      },
      {
        key: "effect-retouch",
        name: "Retouch",
        description: "Improve the quality of the image using AI retouching.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#retouch-e-retouch",
        defaultTransformation: {},
        schema: z
          .object({
            retouch: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Retouch",
            name: "retouch",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "aiRetouch",
            helpText:
              "Toggle to apply AI retouching and enhance image quality.",
          },
        ],
      },
      {
        key: "effect-upscale",
        name: "Upscale",
        description:
          "Increase the resolution of low-resolution images using AI upscaling. The output can be up to 16 MP.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#upscale-e-upscale",
        defaultTransformation: {},
        schema: z
          .object({
            upscale: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Upscale",
            name: "upscale",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "aiUpscale",
            helpText:
              "Toggle to increase resolution of the image using AI upscaling (max 16 MP input).",
          },
        ],
      },
      {
        key: "effect-genvar",
        name: "Generate Variations",
        description:
          "Create a new variation of the original image using AI, altering colours and textures while preserving the structure.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#generate-variations-e-genvar",
        defaultTransformation: {},
        schema: z
          .object({
            genvar: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Generate Variations",
            name: "genvar",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "aiGenerateVariations",
            helpText:
              "Toggle to generate a new variation of the image using AI.",
          },
        ],
      },
    ],
  },
  {
    key: "delivery",
    name: "Delivery",
    items: [
      {
        key: "delivery-format",
        name: "Format",
        description:
          "Specify the output format for the image. Converting formats can reduce file size or improve compatibility.",
        docsLink: "https://imagekit.io/docs/transformations#supported-formats",
        defaultTransformation: {},
        schema: z
          .object({
            format: z.coerce.boolean().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Format",
            name: "format",
            fieldType: "select",
            fieldProps: {
              options: [
                { label: "JPG", value: "jpg" },
                { label: "PNG", value: "png" },
                { label: "WEBP", value: "webp" },
                { label: "AVIF", value: "avif" },
              ],
            },
            isTransformation: true,
            transformationKey: "format",
          },
        ],
      },
      {
        key: "delivery-quality",
        name: "Quality",
        description:
          "Control the compression quality of the output image. Lower values reduce file size but may introduce artefacts; higher values preserve more detail.",
        docsLink: "https://imagekit.io/docs/transformations#quality",
        defaultTransformation: {},
        schema: z
          .object({
            quality: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Quality",
            name: "quality",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "quality",
            fieldProps: {
              defaultValue: 80,
              min: 0,
              max: 100,
              step: 1,
            },
          },
        ],
      },
      {
        key: "delivery-dpr",
        name: "DPR",
        description:
          "Set the device pixel ratio (DPR) to deliver images optimised for high-resolution displays. A higher DPR increases the pixel density of the delivered image.",
        docsLink:
          "https://imagekit.io/docs/transformations#device-pixel-ratio-dpr",
        defaultTransformation: {},
        schema: z
          .object({
            dpr: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              if (
                Object.values(val).some((v) => v !== undefined && v !== null)
              ) {
                return true
              }
              return false
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "DPR",
            name: "dpr",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "dpr",
            fieldProps: {
              defaultValue: 1,
              min: 0,
              max: 5,
              step: 0.1,
            },
          },
        ],
      },
    ],
  },
  // New Layers section: allows adding text and image overlays as layers
  {
    key: "layers",
    name: "Layers",
    items: [
      {
        key: "layers-text",
        name: "Text Layer",
        description:
          "Add a text overlay on top of the base image. Specify text content, font, size, colour, position and optional background or padding.",
        docsLink:
          "https://imagekit.io/docs/add-overlays-on-images#text-overlay-l-text",
        defaultTransformation: {},
        schema: z
          .object({
            text: z.string().optional(),
            color: z.string().optional(),
            fontSize: z.coerce.number().optional(),
            fontFamily: z.string().optional(),
            positionX: z.string().optional(),
            positionY: z.string().optional(),
            anchor: z.string().optional(),
            backgroundColor: z.string().optional(),
            padding: z.coerce.number().optional(),
            opacity: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              return Object.values(val).some(
                (v) => v !== undefined && v !== null && v !== "",
              )
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Text",
            name: "text",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "text",
            transformationGroup: "textLayer",
            helpText: "Enter the text to overlay on the image.",
            examples: ["Hello World"],
          },
          {
            label: "Font Size",
            name: "fontSize",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "fontSize",
            transformationGroup: "textLayer",
            helpText: "Specify the font size of the text.",
            examples: ["24"],
            fieldProps: {
              min: 1,
              max: 100,
              step: 1,
              defaultValue: 24,
            },
          },
          {
            label: "Font Family",
            name: "fontFamily",
            fieldType: "select",
            isTransformation: true,
            transformationKey: "fontFamily",
            transformationGroup: "textLayer",
            helpText: "Choose a font family for the text.",
            fieldProps: {
              options: [
                { label: "Arial", value: "Arial" },
                { label: "Helvetica", value: "Helvetica" },
                { label: "Times New Roman", value: "Times New Roman" },
                { label: "Courier New", value: "Courier New" },
                { label: "Roboto", value: "Roboto" },
              ],
            },
          },
          {
            label: "Colour",
            name: "color",
            fieldType: "color-picker",
            isTransformation: true,
            transformationKey: "fontColor",
            transformationGroup: "textLayer",
            helpText: "Select a colour for the text.",
            examples: ["FFFFFF", "black"],
          },
          {
            label: "Background Colour",
            name: "backgroundColor",
            fieldType: "color-picker",
            isTransformation: true,
            transformationKey: "background",
            transformationGroup: "textLayer",
            helpText: "Set a background colour for the text box.",
            examples: ["FFFFFF", "black"],
          },
          {
            label: "Position Mode",
            name: "positionMode",
            fieldType: "select",
            isTransformation: false,
            fieldProps: {
              options: [
                { label: "Custom (X/Y)", value: "custom" },
                { label: "Anchor", value: "anchor" },
              ],
              defaultValue: "custom",
            },
          },
          {
            label: "Position X",
            name: "positionX",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "x",
            transformationGroup: "textLayer",
            helpText: "Specify horizontal offset for the text.",
            examples: ["10", "iw_div_2"],
            // Show X coordinate only when using custom positioning
            isVisible: ({ positionMode }) => positionMode !== "anchor",
          },
          {
            label: "Position Y",
            name: "positionY",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "y",
            transformationGroup: "textLayer",
            helpText: "Specify vertical offset for the text.",
            examples: ["10", "ih_div_2"],
            // Show Y coordinate only when using custom positioning
            isVisible: ({ positionMode }) => positionMode !== "anchor",
          },
          {
            label: "Anchor",
            name: "anchor",
            fieldType: "anchor",
            isTransformation: true,
            transformationKey: "focus",
            transformationGroup: "textLayer",
            helpText: "Specify the anchor point for the text.",
            fieldProps: {
              positions: [
                "center",
                "top",
                "bottom",
                "left",
                "right",
                "top_left",
                "top_right",
                "bottom_left",
                "bottom_right",
              ],
            },
            // Show anchor selector only when position mode is anchor
            isVisible: ({ positionMode }) => positionMode === "anchor",
          },
          {
            label: "Padding",
            name: "padding",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "padding",
            transformationGroup: "textLayer",
            helpText: "Specify padding around the text (in pixels).",
            examples: ["10"],
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 0,
            },
          },
          {
            label: "Opacity",
            name: "opacity",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "alpha",
            transformationGroup: "textLayer",
            helpText: "Set opacity for the text overlay (0-100).",
            examples: ["80"],
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 100,
            },
          },
        ],
      },
      {
        key: "layers-image",
        name: "Image Layer",
        description:
          "Overlay another image on top of the base image. Position, resize and set opacity for the overlaid image.",
        docsLink:
          "https://imagekit.io/docs/add-overlays-on-images#image-overlay-l-image",
        defaultTransformation: {},
        schema: z
          .object({
            imageUrl: z.string().optional(),
            width: z.string().optional(),
            height: z.string().optional(),
            positionX: z.string().optional(),
            positionY: z.string().optional(),
            anchor: z.string().optional(),
            opacity: z.coerce.number().optional(),
          })
          .refine(
            (val) => {
              return Object.values(val).some(
                (v) => v !== undefined && v !== null && v !== "",
              )
            },
            {
              message: "At least one value is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Image URL",
            name: "imageUrl",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "input",
            transformationGroup: "imageLayer",
            helpText: "Enter the URL or path of the overlay image.",
            examples: ["overlay.png"],
          },
          {
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            transformationGroup: "imageLayer",
            helpText: "Specify the width of the overlay image.",
            examples: ["100", "0.5"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            transformationGroup: "imageLayer",
            helpText: "Specify the height of the overlay image.",
            examples: ["100", "0.5"],
          },
          {
            label: "Position Mode",
            name: "positionMode",
            fieldType: "select",
            isTransformation: false,
            fieldProps: {
              options: [
                { label: "Custom (X/Y)", value: "custom" },
                { label: "Anchor", value: "anchor" },
              ],
              defaultValue: "custom",
            },
          },
          {
            label: "Position X",
            name: "positionX",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "x",
            transformationGroup: "imageLayer",
            helpText: "Specify the horizontal offset for the overlay image.",
            examples: ["10"],
            isVisible: ({ positionMode }) => positionMode !== "anchor",
          },
          {
            label: "Position Y",
            name: "positionY",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "y",
            transformationGroup: "imageLayer",
            helpText: "Specify the vertical offset for the overlay image.",
            examples: ["10"],
            isVisible: ({ positionMode }) => positionMode !== "anchor",
          },
          {
            label: "Anchor",
            name: "anchor",
            fieldType: "anchor",
            isTransformation: true,
            transformationKey: "focus",
            transformationGroup: "imageLayer",
            helpText:
              "Specify the anchor point for positioning the overlay image.",
            fieldProps: {
              positions: [
                "center",
                "top",
                "bottom",
                "left",
                "right",
                "top_left",
                "top_right",
                "bottom_left",
                "bottom_right",
              ],
            },
            // Show anchor selector only when position mode is anchor
            isVisible: ({ positionMode }) => positionMode === "anchor",
          },
          {
            label: "Opacity",
            name: "opacity",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "alpha",
            transformationGroup: "imageLayer",
            helpText: "Set the opacity for the overlay image (0-100).",
            examples: ["80"],
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 100,
            },
          },
        ],
      },
    ],
  },
  // Custom raw transformation section. Allows users to input a raw ImageKit
  // transformation string that will be appended directly to the URL. This is
  // useful for advanced or unsupported transformations.
  {
    key: "advanced",
    name: "Advanced",
    items: [
      {
        key: "advanced-raw",
        name: "Raw Transformation",
        description:
          "Specify a raw ImageKit transformation string to be appended directly to the URL. Use this for advanced or unsupported transformations.",
        docsLink: "https://imagekit.io/docs/transformations",
        defaultTransformation: {},
        schema: z
          .object({
            raw: z.string().optional(),
          })
          .refine(
            (val) => {
              return Object.values(val).some(
                (v) => v !== undefined && v !== null && v !== "",
              )
            },
            {
              message: "Raw transformation is required",
              path: [],
            },
          ),
        transformations: [
          {
            label: "Raw Transformation String",
            name: "raw",
            fieldType: "textarea",
            isTransformation: true,
            transformationKey: "raw",
            helpText:
              "Enter any valid ImageKit transformation string. For example: w-300,h-300,cm-extract,x-10,y-20.",
            examples: ["w-300,h-300,cm-extract,x-10,y-20"],
          },
        ],
      },
    ],
  },
]

export const transformationFormatters: Record<
  string,
  (
    groupValues: Record<string, unknown>,
    transforms: Record<string, unknown>,
  ) => void
> = {
  background: (values, transforms) => {
    const {
      backgroundType,
      backgroundBlurIntensity,
      backgroundBlurBrightness,
    } = values

    if (backgroundType === "color" && values.background) {
      transforms.background = (values.background as string).replace("#", "")
    } else if (backgroundType === "blurred") {
      if (backgroundBlurIntensity === "auto" && !backgroundBlurBrightness) {
        transforms.background = "blurred_auto"
      } else if (
        backgroundBlurIntensity === "auto" &&
        backgroundBlurBrightness
      ) {
        transforms.background = `blurred_auto_${backgroundBlurBrightness}`
      } else if (!Number.isNaN(Number(backgroundBlurIntensity))) {
        if (backgroundBlurBrightness) {
          transforms.background = `blurred_${backgroundBlurIntensity}_${backgroundBlurBrightness}`
        } else {
          transforms.background = `blurred_${backgroundBlurIntensity}`
        }
      } else {
        transforms.background = "blurred"
      }
    } else if (backgroundType === "generative_fill") {
      if (!values.backgroundGenerativeFill) {
        transforms.background = "genfill"
      } else {
        if (
          SIMPLE_OVERLAY_TEXT_REGEX.test(
            values.backgroundGenerativeFill as string,
          )
        ) {
          transforms.background = `genfill-prompt-${values.backgroundGenerativeFill}`
        } else {
          transforms.background = `genfill-prompte-${encodeURIComponent(safeBtoa(values.backgroundGenerativeFill as string))}`
        }
      }
    }
  },
  focus: (values, transforms) => {
    const { focus, focusAnchor, focusObject } = values

    if (focus === "auto" || focus === "face") {
      transforms.focus = focus
    } else if (focus === "anchor") {
      transforms.focus = focusAnchor
    } else if (focus === "object") {
      transforms.focus = focusObject
    }
  },
  shadow: (values, transforms) => {
    const {
      shadow,
      shadowBlur,
      shadowSaturation,
      shadowOffsetX,
      shadowOffsetY,
    } = values as Record<string, any>

    // Only apply the shadow transformation when the switch is enabled
    if (!shadow) return
    const params: string[] = []
    // Blur parameter (0-15)
    if (shadowBlur !== undefined && shadowBlur !== null && shadowBlur !== "") {
      params.push(`bl-${shadowBlur}`)
    }
    // Saturation parameter (0-100)
    if (
      shadowSaturation !== undefined &&
      shadowSaturation !== null &&
      shadowSaturation !== ""
    ) {
      params.push(`st-${shadowSaturation}`)
    }
    // Horizontal offset; negative values should include N prefix as part of the value
    if (
      shadowOffsetX !== undefined &&
      shadowOffsetX !== null &&
      shadowOffsetX !== ""
    ) {
      params.push(`x-${shadowOffsetX}`)
    }
    // Vertical offset; negative values should include N prefix as part of the value
    if (
      shadowOffsetY !== undefined &&
      shadowOffsetY !== null &&
      shadowOffsetY !== ""
    ) {
      params.push(`y-${shadowOffsetY}`)
    }
    // Compose the final transform string
    transforms.shadow = params.length > 0 ? `${params.join("_")}` : ""
  } /**
   * Formatter for text overlays. Constructs an overlay object for the SDK based
   * on the provided group values. The resulting object is assigned to the
   * `overlay` key on the transforms object. Supported fields include text
   * content, colour, font size, font family, position offsets or anchor, background
   * colour, padding, and opacity. Opacity values (0–100) are mapped to the
   * SDK's alpha range (1–9).
   */,
  textLayer: (values, transforms) => {
    const overlay: any = { type: "text" }

    // Text content
    if (values.text) {
      overlay.text = values.text
    }
    // Always let the SDK decide encoding based on content
    overlay.encoding = "auto"

    // Build the overlay transformation object (styling options)
    const overlayTransform: any = {}
    if (values.color) {
      // Remove leading '#' if present
      const col = (values.color as string).replace(/^#/, "")
      overlayTransform.fontColor = col
    }
    if (
      values.fontSize !== undefined &&
      values.fontSize !== null &&
      values.fontSize !== ""
    ) {
      overlayTransform.fontSize = values.fontSize
    }
    if (values.fontFamily) {
      overlayTransform.fontFamily = values.fontFamily
    }
    if (values.backgroundColor) {
      const bg = (values.backgroundColor as string).replace(/^#/, "")
      overlayTransform.background = bg
    }
    if (
      values.padding !== undefined &&
      values.padding !== null &&
      values.padding !== ""
    ) {
      overlayTransform.padding = values.padding
    }
    // Convert opacity percentage (0–100) to alpha (1–9)
    if (
      values.opacity !== undefined &&
      values.opacity !== null &&
      values.opacity !== ""
    ) {
      const op = Number(values.opacity)
      if (!Number.isNaN(op)) {
        // Map 0–100 to 1–9: 0% => 1, 100% => 9
        const alpha = Math.min(9, Math.max(1, Math.round((op / 100) * 8) + 1))
        overlay.alpha = alpha
      }
    }
    // Assign the transformation array only if there are styling properties
    if (Object.keys(overlayTransform).length > 0) {
      overlay.transformation = [overlayTransform]
    }

    // Positioning: use x/y coordinates or focus if anchor is provided
    const position: any = {}
    if (values.positionX) {
      position.x = values.positionX
    }
    if (values.positionY) {
      position.y = values.positionY
    }
    if (values.anchor) {
      position.focus = values.anchor
    }
    if (Object.keys(position).length > 0) {
      overlay.position = position
    }

    // Attach overlay to transforms
    transforms.overlay = overlay
  },

  /**
   * Formatter for image overlays. Constructs an overlay object for the SDK based
   * on the provided group values. The resulting object is assigned to the
   * `overlay` key on the transforms object. Supported fields include input
   * URL/path, width, height, position offsets or anchor, and opacity. Width and
   * height are applied via the overlay's transformation array. Opacity values
   * (0–100) are mapped to the SDK's alpha range (1–9).
   */
  imageLayer: (values, transforms) => {
    const overlay: any = { type: "image" }

    // Input path to the overlay image
    if (values.imageUrl) {
      // Remove any leading slash; the SDK will handle path encoding
      overlay.input = (values.imageUrl as string).replace(/^\//, "")
    }

    // Build overlay transformation for sizing
    const overlayTransform: any = {}
    if (
      values.width !== undefined &&
      values.width !== null &&
      values.width !== ""
    ) {
      overlayTransform.width = values.width
    }
    if (
      values.height !== undefined &&
      values.height !== null &&
      values.height !== ""
    ) {
      overlayTransform.height = values.height
    }
    if (Object.keys(overlayTransform).length > 0) {
      overlay.transformation = [overlayTransform]
    }

    // Positioning via x/y or focus anchor
    const position: any = {}
    if (values.positionX) {
      position.x = values.positionX
    }
    if (values.positionY) {
      position.y = values.positionY
    }
    if (values.anchor) {
      position.focus = values.anchor
    }
    if (Object.keys(position).length > 0) {
      overlay.position = position
    }

    // Opacity mapping
    if (
      values.opacity !== undefined &&
      values.opacity !== null &&
      values.opacity !== ""
    ) {
      const op = Number(values.opacity)
      if (!Number.isNaN(op)) {
        const alpha = Math.min(9, Math.max(1, Math.round((op / 100) * 8) + 1))
        overlay.alpha = alpha
      }
    }

    // Assign overlay to transforms
    transforms.overlay = overlay
  },
}
