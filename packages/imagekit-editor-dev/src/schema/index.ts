import type { Transformation } from "@imagekit/javascript"
import type {
  OverlayPosition,
  TextOverlay,
  TextOverlayTransformation,
} from "@imagekit/javascript/dist/interfaces"
import { PiFlipHorizontalFill } from "@react-icons/all-files/pi/PiFlipHorizontalFill"
import { PiFlipVerticalFill } from "@react-icons/all-files/pi/PiFlipVerticalFill"
import { RxFontBold } from "@react-icons/all-files/rx/RxFontBold"
import { RxFontItalic } from "@react-icons/all-files/rx/RxFontItalic"
import { RxTextAlignCenter } from "@react-icons/all-files/rx/RxTextAlignCenter"
import { RxTextAlignLeft } from "@react-icons/all-files/rx/RxTextAlignLeft"
import { RxTextAlignRight } from "@react-icons/all-files/rx/RxTextAlignRight"
import { z } from "zod/v3"
import { SIMPLE_OVERLAY_TEXT_REGEX, safeBtoa } from "../utils"
import {
  aspectRatioValidator,
  colorValidator,
  heightValidator,
  layerXValidator,
  layerYValidator,
  widthValidator,
} from "./transformation"

// Based on ImageKit's supported object list
export const DEFAULT_FOCUS_OBJECTS = [
  "person",
  "bicycle",
  "car",
  "motorcycle",
  "airplane",
  "bus",
  "train",
  "truck",
  "boat",
  "trafficLight",
  "fireHydrant",
  "stopSign",
  "parkingMeter",
  "bench",
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
  "backpack",
  "umbrella",
  "handbag",
  "tie",
  "suitcase",
  "frisbee",
  "skis",
  "snowboard",
  "sportsBall",
  "kite",
  "baseballBat",
  "baseballGlove",
  "skateboard",
  "surfboard",
  "tennisRacket",
  "bottle",
  "wineGlass",
  "cup",
  "fork",
  "knife",
  "spoon",
  "bowl",
  "banana",
  "apple",
  "sandwich",
  "orange",
  "broccoli",
  "carrot",
  "hotDog",
  "pizza",
  "donut",
  "cake",
  "chair",
  "couch",
  "pottedPlant",
  "bed",
  "diningTable",
  "toilet",
  "tv",
  "laptop",
  "mouse",
  "remote",
  "keyboard",
  "cellPhone",
  "microwave",
  "oven",
  "toaster",
  "sink",
  "refrigerator",
  "book",
  "clock",
  "vase",
  "scissors",
  "teddyBear",
  "hairDrier",
  "toothbrush",
] as const

export interface TransformationItem {
  key: string
  name: string
  defaultTransformation: Transformation
  description?: string
  docsLink?: string
  schema: z.ZodTypeAny
  transformations: TransformationField[]
  warning?: {
    heading?: string
    message?: string
  }
}

export interface TransformationField {
  label: string
  name: string
  fieldType?: "input" | "select" | string
  fieldProps?: Record<string, unknown> & {
    defaultValue?: string | number | unknown
    options?: {
      label: string
      icon?: React.ReactNode
      value: string
    }[]
    autoOption?: boolean
    isCreatable?: boolean
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
        // color, a blurred version of the image or a generative fill. This
        // strategy never crops the image content.
        description:
          "Resize an image to fit within the specified width and height while preserving its aspect ratio. Any extra space is padded with a background color, a blurred version of the image, or an AI-generated fill.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#pad-resize-crop-strategy---cm-pad_resize",
        defaultTransformation: { cropMode: "pad_resize" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            backgroundType: z.string().optional(),
            background: z
              .union([z.literal("").transform(() => ""), colorValidator])
              .optional(),
            backgroundBlurIntensity: z.coerce
              .string({
                invalid_type_error:
                  "Should be a number between 1 and 100 or auto.",
              })
              .optional(),
            backgroundBlurBrightness: z.coerce
              .string({
                invalid_type_error: "Should be a number between -255 and 255.",
              })
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
              defaultValue: "0",
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
          "https://imagekit.io/docs/image-resize-and-crop#maintain-ratio-crop-strategy---c-maintain_ratio",
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
            fieldType: "select",
            isTransformation: true,
            transformationGroup: "focus",
            fieldProps: {
              isCreatable: false,
            },
            helpText:
              "Select an object to focus on. The crop will center on this object.",
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
          "https://imagekit.io/docs/image-resize-and-crop#forced-crop-strategy---c-force",
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
            fieldType: "select",
            isTransformation: true,
            transformationGroup: "focus",
            fieldProps: {
              isCreatable: false,
            },
            helpText:
              "Select an object to focus on. The crop will center on this object.",
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
          "https://imagekit.io/docs/image-resize-and-crop#max-size-cropping-strategy---c-at_max",
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
          "https://imagekit.io/docs/image-resize-and-crop#max-size-enlarge-cropping-strategy---c-at_max_enlarge",
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
        name: "Min Size",
        // The min-size crop strategy resizes the image so that at least one
        // dimension is equal to or greater than the requested dimension. The
        // aspect ratio is preserved and the other dimension may exceed the
        // requested value.
        description:
          "Resize the image so that it meets or exceeds the specified width and/or height. The aspect ratio is preserved and at least one dimension will match or exceed the request.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#min-size-cropping-strategy---c-at_least",
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
          "https://imagekit.io/docs/image-resize-and-crop#extract-crop-strategy---cm-extract",
        defaultTransformation: { cropMode: "extract" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            focus: z.string().optional(),
            focusAnchor: z.string().optional(),
            focusObject: z.string().optional(),
            coordinateMethod: z.string().optional(),
            x: z.string().optional(),
            y: z.string().optional(),
            xc: z.string().optional(),
            yc: z.string().optional(),
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
              const hasXY = val.x || val.y
              const hasXCYC = val.xc || val.yc

              if (hasXY && hasXCYC) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Choose either x/y or xc/yc, not both",
                  path: [],
                })
              }

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
          }),
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
                { label: "Custom", value: "custom" },
                { label: "Coordinates", value: "coordinates" },
              ],
            },
            helpText:
              "Choose how to position the extracted region. Custom uses a saved focus area from Media Library.",
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
            fieldType: "select",
            isTransformation: true,
            transformationGroup: "focus",
            fieldProps: {
              isCreatable: false,
            },
            helpText:
              "Select an object to focus on during extraction. The crop will center on this object.",
            isVisible: ({ focus }) => focus === "object",
          },
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
            isVisible: ({ focus }) => focus === "coordinates",
          },
          {
            label: "X (Horizontal)",
            name: "x",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "focus",
            helpText:
              "Horizontal position from the top-left. Use an integer or expression (e.g., iw_mul_0.4).",
            examples: ["100", "iw_mul_0.4"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "topleft",
          },
          {
            label: "Y (Vertical)",
            name: "y",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "focus",
            helpText:
              "Vertical position from the top-left. Use an integer or expression (e.g., ih_mul_0.4).",
            examples: ["100", "ih_mul_0.4"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "topleft",
          },
          {
            label: "XC (Horizontal Center)",
            name: "xc",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "focus",
            helpText:
              "Horizontal center position. Use an integer or expression (e.g., iw_mul_0.5).",
            examples: ["200", "iw_mul_0.5"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "center",
          },
          {
            label: "YC (Vertical Center)",
            name: "yc",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "focus",
            helpText:
              "Vertical center position. Use an integer or expression (e.g., ih_mul_0.5).",
            examples: ["200", "ih_mul_0.5"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "center",
          },
        ],
      },
      {
        key: "crop_extract-pad_extract",
        name: "Pad Extract",
        // Pad extract crops a region from the image like extract, but if the
        // cropped region is smaller than the requested dimensions it pads the
        // remaining area. This allows you to centre or position a subject and
        // fill unused space with a solid color or generative fill.
        description:
          "Extract a region from the image and pad it to match the requested dimensions. Use a solid color or an AI-generated fill for the padding and optionally set a focus point.",
        docsLink:
          "https://imagekit.io/docs/image-resize-and-crop#pad-extract-crop-strategy---cm-pad_extract",
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
            transformationGroup: "background",
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
            fieldType: "color-picker",
            transformationGroup: "background",
            isTransformation: true,
            helpText: "When using color padding, enter a hex code.",
            examples: ["FFFFFF", "FF0000"],
            isVisible: ({ backgroundType }) => backgroundType === "color",
          },
          {
            label: "Background Generative Fill",
            name: "backgroundGenerativeFill",
            fieldType: "input",
            transformationGroup: "background",
            isTransformation: true,
            helpText:
              "When using AI generative padding, provide a text prompt describing the fill.",
            examples: ["mountain landscape"],
            isVisible: ({ backgroundType }) =>
              backgroundType === "generative_fill",
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
          "https://imagekit.io/docs/effects-and-enhancements#contrast-stretch---e-contrast",
        defaultTransformation: {},
        schema: z
          .object({
            contrast: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
            transformationKey: "contrastStretch",
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
          "https://imagekit.io/docs/effects-and-enhancements#shadow---e-shadow",
        defaultTransformation: {},
        // Schema allows toggling the shadow effect and specifying optional blur, saturation and X/Y offsets.
        schema: z
          .object({
            shadow: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            shadowBlur: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            shadowSaturation: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            shadowOffsetX: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            shadowOffsetY: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
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
            label: "Shadow",
            name: "shadow",
            fieldType: "switch",
            isTransformation: true,
            transformationGroup: "shadow",
            helpText:
              "Toggle to add a non-AI shadow under objects in the image.",
          },
          {
            label: "Blur",
            name: "shadowBlur",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "shadow",
            helpText:
              "Set the blur radius for the shadow. Higher values create a softer shadow.",
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
            transformationGroup: "shadow",
            helpText:
              "Adjust the saturation of the shadow. Higher values produce a darker shadow.",
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 30,
            },
            isVisible: ({ shadow }) => shadow === true,
          },
          {
            label: "X Offset",
            name: "shadowOffsetX",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "shadow",
            helpText:
              "Enter the horizontal offset as a percentage of the image width.",
            isVisible: ({ shadow }) => shadow === true,
            fieldProps: {
              min: -100,
              max: 100,
              step: 1,
              defaultValue: 2,
            },
          },
          {
            label: "Y Offset",
            name: "shadowOffsetY",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "shadow",
            helpText:
              "Enter the vertical offset as a percentage of the image height.",
            isVisible: ({ shadow }) => shadow === true,
            fieldProps: {
              min: -100,
              max: 100,
              step: 1,
              defaultValue: 2,
            },
          },
        ],
      },
      {
        key: "adjust-grayscale",
        name: "Grayscale",
        description: "Convert the image to grayscale (black and white).",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#grayscale---e-grayscale",
        defaultTransformation: {},
        schema: z
          .object({
            grayscale: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
        docsLink: "https://imagekit.io/docs/effects-and-enhancements#blur---bl",
        defaultTransformation: {},
        schema: z
          .object({
            blur: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
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
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "blur",
            helpText:
              "Enter a blur radius to control the intensity of the Gaussian blur. Possible values include integers between 1 and 100.",
            examples: ["10"],
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 10,
            },
          },
        ],
      },
      {
        key: "adjust-rotate",
        name: "Rotate",
        description:
          "Rotate the image by a specified number of degrees clockwise or counter-clockwise, or automatically rotate based on EXIF orientation.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#rotate---rt",
        defaultTransformation: {},
        schema: z
          .object({
            rotate: z
              .union([
                z.literal("auto"),
                z.coerce.number({
                  invalid_type_error: "Should be a number.",
                }),
              ])
              .optional(),
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
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "rt",
            transformationGroup: "rotate",
            helpText:
              "Specify rotation angle in degrees (positive for clockwise, negative for counter-clockwise). Select 'auto' to use the image's EXIF orientation data.",
            fieldProps: {
              min: -180,
              max: 180,
              step: 1,
              defaultValue: "auto",
              autoOption: true,
            },
          },
        ],
      },
      {
        key: "adjust-flip",
        name: "Flip",
        description: "Flip the image horizontally, vertically, or both.",
        docsLink: "https://imagekit.io/docs/effects-and-enhancements#flip---fl",
        defaultTransformation: {},
        schema: z
          .object({
            flip: z.coerce
              .string({
                invalid_type_error: "Should be a string.",
              })
              .optional(),
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
            fieldType: "checkbox-card",
            isTransformation: true,
            transformationKey: "fl",
            transformationGroup: "flip",
            helpText:
              "Choose how to flip the image: horizontally, vertically, or both.",
            fieldProps: {
              options: [
                {
                  label: "Horizontal",
                  icon: PiFlipHorizontalFill,
                  value: "horizontal",
                },
                {
                  label: "Vertical",
                  icon: PiFlipVerticalFill,
                  value: "vertical",
                },
              ],
              columns: 2,
              defaultValue: [],
            },
          },
        ],
      },
      {
        key: "adjust-radius",
        name: "Radius",
        description:
          "Round the corners of the image. Specify a radius value to control how rounded the corners are, or use 'max' to make the image circular.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#radius---r",
        defaultTransformation: {},
        schema: z
          .object({
            radius: z.union([
              z.literal("max"),
              z.coerce
                .number({
                  invalid_type_error: "Should be a number.",
                })
                .min(0),
            ]),
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
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#opacity---o",
        defaultTransformation: {},
        schema: z
          .object({
            opacity: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
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
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "opacity",
            helpText: "Enter an opacity percentage between 0 and 100.",
            examples: ["50"],
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
            },
          },
        ],
      },
    ],
  },
  {
    key: "ai",
    name: "AI Transformations",
    items: [
      {
        key: "ai-removedotbg",
        name: "Remove Background using Remove.bg",
        // This option removes the background using the third-party remove.bg service.
        description:
          "Remove the background of the image using Remove.bg (external service). This isolates the subject and makes the background transparent.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#background-removal-e-removedotbg",
        defaultTransformation: {},
        schema: z
          .object({
            removedotbg: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to apply Remove Background using Remove.bg to {imageList.length} items. ",
        },
      },
      {
        key: "ai-bgremove",
        name: "Remove Background using ImageKit AI",
        description:
          "Remove the background using ImageKit's built-in background removal model. This method is cost-effective compared to Remove.bg.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#imagekit-background-removal-e-bgremove",
        defaultTransformation: {},
        schema: z
          .object({
            bgremove: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
            label: "Remove Background using ImageKit AI",
            name: "bgremove",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "aiRemoveBackground",
            helpText:
              "Toggle to remove the background using ImageKit's own background removal.",
          },
        ],
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to apply Remove Background using ImageKit AI to {imageList.length} items. ",
        },
      },
      {
        key: "ai-changebg",
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
            transformationGroup: "aiChangeBackground",
            helpText: "Enter a descriptive prompt for the new background.",
            examples: ["snowy mountains", "sunset beach"],
          },
        ],
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to apply Change Background to {imageList.length} items. ",
        },
      },
      {
        key: "ai-edit",
        name: "Edit Image using AI",
        description:
          "Use AI to modify the image based on a descriptive prompt. Add or remove objects or alter colors and textures.",
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
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to apply Edit Image using AI to {imageList.length} items. ",
        },
      },
      {
        key: "ai-dropshadow",
        name: "Drop Shadow",
        description:
          "Add a realistic AI-generated drop shadow around the object. Requires a transparent background; remove the background first for best results.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#ai-drop-shadow-e-dropshadow",
        defaultTransformation: {},
        schema: z
          .object({
            dropshadow: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to apply Drop Shadow to {imageList.length} items. ",
        },
      },
      {
        key: "ai-retouch",
        name: "Retouch",
        description: "Improve the quality of the image using AI retouching.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#retouch-e-retouch",
        defaultTransformation: {},
        schema: z
          .object({
            retouch: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to apply Retouch to {imageList.length} items. ",
        },
      },
      {
        key: "ai-upscale",
        name: "Upscale",
        description:
          "Increase the resolution of low-resolution images using AI upscaling. The output can be up to 16 MP.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#upscale-e-upscale",
        defaultTransformation: {},
        schema: z
          .object({
            upscale: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to apply Upscale to {imageList.length} items. ",
        },
      },
      {
        key: "ai-genvar",
        name: "Generate Variations",
        description:
          "Create a new variation of the original image using AI, altering colors and textures while preserving the structure.",
        docsLink:
          "https://imagekit.io/docs/ai-transformations#generate-variations-of-an-image-e-genvar",
        defaultTransformation: {},
        schema: z
          .object({
            genvar: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
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
            transformationKey: "aiVariation",
            helpText:
              "Toggle to generate a new variation of the image using AI.",
          },
        ],
        warning: {
          heading: "This action consumes AI credits.",
          message:
            "You are about to generate variations of {imageList.length} items. ",
        },
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
        docsLink: "https://imagekit.io/docs/image-optimization#format---f",
        defaultTransformation: {},
        schema: z
          .object({
            format: z.string().optional(),
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
        docsLink: "https://imagekit.io/docs/image-optimization#quality---q",
        defaultTransformation: {},
        schema: z
          .object({
            quality: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
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
        docsLink: "https://imagekit.io/docs/image-resize-and-crop#dpr---dpr",
        defaultTransformation: {},
        schema: z
          .object({
            dpr: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
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
            helpText:
              "Set this value to deliver images optimised for high-resolution displays. The value can be between 0.1 and 5.",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "dpr",
            fieldProps: {
              defaultValue: 1,
              min: 0.1,
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
          "Add a text overlay on top of the base image. Specify text content, font, size, color, position and optional background or padding.",
        docsLink:
          "https://imagekit.io/docs/add-overlays-on-images#add-text-over-image",
        defaultTransformation: {},
        schema: z
          .object({
            text: z.string(),
            width: widthValidator.optional(),
            positionX: layerXValidator.optional(),
            positionY: layerYValidator.optional(),
            fontSize: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            fontFamily: z.string().optional(),
            color: z.string().optional(),
            innerAlignment: z
              .enum(["left", "right", "center"])
              .default("center"),
            padding: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            opacity: z
              .union([
                z.coerce
                  .number({
                    invalid_type_error: "Should be a number.",
                  })
                  .min(1)
                  .max(10),
                z.literal(""),
              ])
              .optional(),
            typography: z
              .array(z.enum(["bold", "italic"]).optional())
              .optional(),
            backgroundColor: z.string().optional(),
            radius: z.union([
              z.literal("max"),
              z.coerce
                .number({
                  invalid_type_error: "Should be a number.",
                })
                .min(0),
            ]),
            flip: z
              .array(z.enum(["horizontal", "vertical"]).optional())
              .optional(),
            rotation: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
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
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "width",
            transformationGroup: "textLayer",
            helpText: "Specify the width of the overlaid text.",
            examples: ["300", "bw_div_2"],
          },
          {
            label: "Position X",
            name: "positionX",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "x",
            transformationGroup: "textLayer",
            helpText: "Specify horizontal offset for the text.",
            examples: ["10", "bw_div_2"],
          },
          {
            label: "Position Y",
            name: "positionY",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "y",
            transformationGroup: "textLayer",
            helpText: "Specify vertical offset for the text.",
            examples: ["10", "bh_div_2"],
          },
          {
            label: "Font Size",
            name: "fontSize",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "fontSize",
            transformationGroup: "textLayer",
            helpText: "Specify the font size of the text.",
            examples: ["24", "12"],
            fieldProps: {
              defaultValue: "14",
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
                { label: "AbrilFatFace", value: "AbrilFatFace" },
                { label: "Amaranth", value: "Amaranth" },
                { label: "Arvo", value: "Arvo" },
                { label: "Audiowide", value: "Audiowide" },
                { label: "Chivo", value: "Chivo" },
                { label: "Crimson Text", value: "Crimson Text" },
                { label: "exo", value: "exo" },
                { label: "Fredoka One", value: "Fredoka One" },
                { label: "Gravitas One", value: "Gravitas One" },
                { label: "Kanit", value: "Kanit" },
                { label: "Lato", value: "Lato" },
                { label: "Lobster", value: "Lobster" },
                { label: "Lora", value: "Lora" },
                { label: "Monoton", value: "Monoton" },
                { label: "Montserrat", value: "Montserrat" },
                { label: "PT Mono", value: "PT Mono" },
                { label: "PT_Serif", value: "PT_Serif" },
                { label: "Open Sans", value: "Open Sans" },
                { label: "Roboto", value: "Roboto" },
                { label: "Old Standard", value: "Old Standard" },
                { label: "Ubuntu", value: "Ubuntu" },
                { label: "Vollkorn", value: "Vollkorn" },
              ],
              defaultValue: "Open Sans",
            },
          },
          {
            label: "Typography",
            name: "typography",
            fieldType: "checkbox-card",
            isTransformation: true,
            transformationKey: "typography",
            transformationGroup: "textLayer",
            helpText: "Set the typography of the text.",
            fieldProps: {
              options: [
                { label: "Bold", icon: RxFontBold, value: "bold" },
                { label: "Italic", icon: RxFontItalic, value: "italic" },
              ],
              defaultValue: [],
              columns: 2,
            },
          },
          {
            label: "Color",
            name: "color",
            fieldType: "color-picker",
            isTransformation: true,
            transformationKey: "fontColor",
            transformationGroup: "textLayer",
            helpText: "Select a color for the text.",
            examples: ["FFFFFF", "FF0000"],
          },
          {
            label: "Background Color",
            name: "backgroundColor",
            fieldType: "color-picker",
            isTransformation: true,
            transformationKey: "background",
            transformationGroup: "textLayer",
            helpText: "Set a background color for the text box.",
            examples: ["FFFFFF", "FF0000"],
          },
          {
            label: "Inner Alignment",
            name: "innerAlignment",
            fieldType: "radio-card",
            isTransformation: true,
            transformationKey: "innerAlignment",
            transformationGroup: "textLayer",
            helpText: "Choose the alignment of the text within the text box.",
            fieldProps: {
              options: [
                { label: "Left", icon: RxTextAlignLeft, value: "left" },
                { label: "Center", icon: RxTextAlignCenter, value: "center" },
                { label: "Right", icon: RxTextAlignRight, value: "right" },
              ],
              defaultValue: "center",
            },
          },
          {
            label: "Padding",
            name: "padding",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "padding",
            transformationGroup: "textLayer",
            helpText: "Specify padding around the text (in pixels).",
            examples: ["10", "20"],
          },
          {
            label: "Opacity",
            name: "opacity",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "textLayer",
            helpText: "Set opacity for the text overlay (0-10).",
            fieldProps: {
              min: 1,
              max: 10,
              step: 1,
              defaultValue: 10,
            },
          },
          {
            label: "Radius",
            name: "radius",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "radius",
            transformationGroup: "textLayer",
            helpText:
              "Set the radius for the corner of the text overlay. Set to 'max' for circle or oval.",
          },
          {
            label: "Flip",
            name: "flip",
            fieldType: "checkbox-card",
            isTransformation: true,
            transformationKey: "flip",
            transformationGroup: "textLayer",
            helpText: "Flip the text overlay horizontally or vertically.",
            fieldProps: {
              options: [
                {
                  label: "Horizontal",
                  icon: PiFlipHorizontalFill,
                  value: "horizontal",
                },
                {
                  label: "Vertical",
                  icon: PiFlipVerticalFill,
                  value: "vertical",
                },
              ],
              columns: 2,
              defaultValue: [],
            },
          },
          {
            label: "Rotation",
            name: "rotation",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "rotation",
            transformationGroup: "textLayer",
            helpText: "Rotate the text overlay (in degrees).",
            fieldProps: {
              min: -180,
              max: 180,
              step: 1,
              defaultValue: "0",
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
          "https://imagekit.io/docs/add-overlays-on-images#add-images-over-image",
        defaultTransformation: {},
        schema: z
          .object({
            imageUrl: z.string().optional(),
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            crop: z.string().optional(),
            positionX: layerXValidator.optional(),
            positionY: layerYValidator.optional(),
            anchor: z.string().optional(),
            opacity: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            backgroundColor: z.string().optional(),
            radius: z
              .union([
                z.literal("max"),
                z.coerce
                  .number({
                    invalid_type_error: "Should be a number.",
                  })
                  .min(0),
              ])
              .optional(),
            flip: z
              .array(z.enum(["horizontal", "vertical"]).optional())
              .optional(),
            rotation: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            trim: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            quality: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            blur: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
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
            examples: ["100", "iw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            transformationGroup: "imageLayer",
            helpText: "Specify the height of the overlay image.",
            examples: ["100", "ih_div_2"],
          },
          {
            label: "Crop",
            name: "crop",
            fieldType: "select",
            isTransformation: true,
            transformationKey: "crop",
            transformationGroup: "imageLayer",
            helpText: "Crop the overlay image.",
            fieldProps: {
              options: [
                { label: "Select one", value: "" },
                { label: "Force", value: "c-force" },
                { label: "At max", value: "c-at_max" },
                { label: "At least", value: "c-at_least" },
                { label: "Extract", value: "cm-extract" },
                { label: "Pad Resize", value: "cm-pad_resize" },
              ],
              defaultValue: "",
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
          },
          {
            label: "Opacity",
            name: "opacity",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "opacity",
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
          {
            label: "Background Color",
            name: "backgroundColor",
            fieldType: "color-picker",
            isTransformation: true,
            transformationKey: "background",
            transformationGroup: "imageLayer",
            helpText: "Set a background color for the overlay image.",
          },
          {
            label: "Radius",
            name: "radius",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "radius",
            transformationGroup: "imageLayer",
            helpText:
              "Set the corner radius for the overlay image. Use 'max' for a circle or oval.",
          },
          {
            label: "Flip",
            name: "flip",
            fieldType: "checkbox-card",
            isTransformation: true,
            transformationKey: "flip",
            transformationGroup: "imageLayer",
            helpText: "Flip the overlay image horizontally or vertically.",
            fieldProps: {
              options: [
                {
                  label: "Horizontal",
                  icon: PiFlipHorizontalFill,
                  value: "horizontal",
                },
                {
                  label: "Vertical",
                  icon: PiFlipVerticalFill,
                  value: "vertical",
                },
              ],
              columns: 2,
              defaultValue: [],
            },
          },
          {
            label: "Rotation",
            name: "rotation",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "rotation",
            transformationGroup: "imageLayer",
            helpText: "Rotate the overlay image (in degrees).",
            fieldProps: {
              min: -180,
              max: 180,
              step: 1,
              defaultValue: "0",
            },
          },
          {
            label: "Trim",
            name: "trim",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "trim",
            transformationGroup: "imageLayer",
            helpText: "Control trimming of the overlay image.",
            fieldProps: {
              defaultValue: true,
            },
          },
          {
            label: "Quality",
            name: "quality",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "quality",
            transformationGroup: "imageLayer",
            helpText: "Set the compression quality of the overlay image.",
            fieldProps: {
              min: 0,
              max: 100,
              step: 1,
              defaultValue: 80,
            },
          },
          {
            label: "Blur",
            name: "blur",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "blur",
            transformationGroup: "imageLayer",
            helpText: "Apply a Gaussian blur to the overlay image.",
            fieldProps: {
              min: 1,
              max: 100,
              step: 1,
              defaultValue: "0",
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
        docsLink: "https://imagekit.io/docs/image-transformation",
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
            helpText: "Enter any valid ImageKit transformation string.",
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
    let { backgroundType, backgroundBlurIntensity, backgroundBlurBrightness } =
      values as Record<string, string>

    if (backgroundBlurBrightness?.startsWith("-")) {
      backgroundBlurBrightness = backgroundBlurBrightness.replace("-", "N")
    }

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
    const { focus, focusAnchor, focusObject, x, y, xc, yc } = values

    if (focus === "auto" || focus === "face") {
      transforms.focus = focus
    } else if (focus === "anchor") {
      transforms.focus = focusAnchor
    } else if (focus === "object") {
      transforms.focus = focusObject
    } else if (focus === "custom") {
      transforms.focus = "custom"
    } else if (focus === "coordinates") {
      // Handle coordinate-based focus
      // x/y are top-left coordinates, xc/yc are center coordinates
      if (x) transforms.x = x
      if (y) transforms.y = y
      if (xc) transforms.xc = xc
      if (yc) transforms.yc = yc
    }
  },
  shadow: (values, transforms) => {
    const {
      shadow,
      shadowBlur,
      shadowSaturation,
      shadowOffsetX,
      shadowOffsetY,
    } = values as Record<string, unknown>

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
      if (shadowOffsetX < 0) {
        params.push(`x-N${Math.abs(shadowOffsetX)}`)
      } else {
        params.push(`x-${shadowOffsetX}`)
      }
    }
    // Vertical offset; negative values should include N prefix as part of the value
    if (
      shadowOffsetY !== undefined &&
      shadowOffsetY !== null &&
      shadowOffsetY !== ""
    ) {
      if (shadowOffsetY < 0) {
        params.push(`y-N${Math.abs(shadowOffsetY)}`)
      } else {
        params.push(`y-${shadowOffsetY}`)
      }
    }
    // Compose the final transform string
    transforms.shadow = params.length > 0 ? `${params.join("_")}` : ""
  } /**
   * Formatter for text overlays. Constructs an overlay object for the SDK based
   * on the provided group values. The resulting object is assigned to the
   * `overlay` key on the transforms object. Supported fields include text
   * content, color, font size, font family, position offsets or anchor, background
   * color, padding, and opacity. Opacity values (0–100) are mapped to the
   * SDK's alpha range (1–9).
   */,
  textLayer: (values, transforms) => {
    const overlay: TextOverlay = { type: "text", text: "" }

    if (typeof values.text === "string") {
      overlay.text = values.text
    }

    overlay.encoding = "auto"

    const overlayTransform: TextOverlayTransformation = {}

    if (typeof values.width === "number" || typeof values.width === "string") {
      overlayTransform.width = values.width
    }

    if (typeof values.color === "string") {
      // Remove leading '#' if present
      const col = (values.color as string).replace(/^#/, "")
      overlayTransform.fontColor = col
    }
    if (
      typeof values.fontSize === "number" ||
      typeof values.fontSize === "string"
    ) {
      overlayTransform.fontSize = values.fontSize
    }
    if (typeof values.fontFamily === "string") {
      overlayTransform.fontFamily = values.fontFamily
    }
    if (typeof values.backgroundColor === "string") {
      const bg = (values.backgroundColor as string).replace(/^#/, "")
      overlayTransform.background = bg
    }
    if (
      typeof values.padding === "number" ||
      typeof values.padding === "string"
    ) {
      overlayTransform.padding = values.padding
    }

    if (Array.isArray(values.flip) && values.flip.length > 0) {
      const flip = []
      if (values.flip.includes("horizontal")) {
        flip.push("h")
      }
      if (values.flip.includes("vertical")) {
        flip.push("v")
      }

      overlayTransform.flip = flip.join("_") as "h" | "v" | "h_v" | "v_h"
    }

    if (
      typeof values.rotation === "number" ||
      typeof values.rotation === "string"
    ) {
      overlayTransform.rotation =
        (values.rotation as number) < 0
          ? `N${Math.abs(values.rotation as number)}`
          : (values.rotation as number)
    }

    if (typeof values.radius === "string" && values.radius === "max") {
      overlayTransform.radius = "max"
    } else if (typeof values.radius === "number") {
      overlayTransform.radius = values.radius
    }

    if (typeof values.opacity === "number") {
      if (values.opacity !== 10) {
        overlayTransform.alpha = values.opacity / 10
      }
    }

    if (typeof values.innerAlignment === "string") {
      overlayTransform.innerAlignment = values.innerAlignment as
        | "center"
        | "left"
        | "right"
    }

    if (Array.isArray(values.typography) && values.typography.length > 0) {
      const typography = []
      if (values.typography.includes("bold")) {
        typography.push("b")
      }
      if (values.typography.includes("italic")) {
        typography.push("i")
      }
      overlayTransform.typography = typography.join("_") as "b" | "i" | "b_i"
    }

    // Assign the transformation array only if there are styling properties
    if (Object.keys(overlayTransform).length > 0) {
      overlay.transformation = [overlayTransform]
    }

    // Positioning: use x/y coordinates or focus if anchor is provided
    const position: OverlayPosition = {}
    if (
      typeof values.positionX === "number" ||
      typeof values.positionX === "string"
    ) {
      position.x = values.positionX
    }
    if (
      typeof values.positionY === "number" ||
      typeof values.positionY === "string"
    ) {
      position.y = values.positionY
    }
    if (Object.keys(position).length > 0) {
      overlay.position = position
    }

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
    const overlay: Record<string, unknown> = { type: "image" }

    // Input path to the overlay image
    if (values.imageUrl) {
      // Remove any leading slash; the SDK will handle path encoding
      overlay.input = (values.imageUrl as string).replace(/^\//, "")
    }

    // Build overlay transformation for sizing
    const overlayTransform: Record<string, unknown> = {}
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

    if (values.opacity) {
      overlayTransform.opacity = values.opacity
    }

    if (typeof values.backgroundColor === "string") {
      overlayTransform.background = values.backgroundColor.replace(/^#/, "")
    }

    if (values.radius === "max") {
      overlayTransform.radius = "max"
    } else if (values.radius as number) {
      overlayTransform.radius = values.radius as number
    }

    if ((values.flip as Array<string>)?.length) {
      const flip = []
      if ((values.flip as Array<string>).includes("horizontal")) {
        flip.push("h")
      }
      if ((values.flip as Array<string>).includes("vertical")) {
        flip.push("v")
      }

      overlayTransform.flip = flip.join("_")
    }

    if (values.crop && typeof values.crop === "string") {
      if (values.crop.startsWith("c-")) {
        overlayTransform.crop = values.crop.replace("c-", "")
      } else {
        overlayTransform.cropMode = values.crop.replace("cm-", "")
      }
    }

    if (values.rotation) {
      overlayTransform.rotation = values.rotation
    }

    if (typeof values.trim === "boolean") {
      overlayTransform.trim = values.trim
    }

    if (values.quality) {
      overlayTransform.quality = values.quality
    }

    if (values.blur) {
      overlayTransform.blur = values.blur
    }

    if (Object.keys(overlayTransform).length > 0) {
      overlay.transformation = [overlayTransform]
    }

    // Positioning via x/y or focus anchor
    const position: Record<string, unknown> = {}
    if (values.positionX) {
      position.x = values.positionX
    }
    if (values.positionY) {
      position.y = values.positionY
    }

    if (Object.keys(position).length > 0) {
      overlay.position = position
    }

    // Assign overlay to transforms
    transforms.overlay = overlay
  },
  flip: (values, transforms) => {
    if ((values.flip as Array<string>)?.length) {
      const flip = []
      if ((values.flip as Array<string>).includes("horizontal")) {
        flip.push("h")
      }
      if ((values.flip as Array<string>).includes("vertical")) {
        flip.push("v")
      }

      transforms.flip = flip.join("_")
    }
  },
  aiChangeBackground: (values, transforms) => {
    if (values.changebg) {
      if (SIMPLE_OVERLAY_TEXT_REGEX.test(values.changebg as string)) {
        transforms.aiChangeBackground = `prompt-${values.changebg as string}`
      } else {
        transforms.aiChangeBackground = `prompte-${encodeURIComponent(safeBtoa(values.changebg as string))}`
      }
    }
  },
  rotate: (values, transforms) => {
    if (typeof values.rotate === "number") {
      if (values.rotate < 0) {
        transforms.rotation = `N${Math.abs(values.rotate)}`
      } else {
        transforms.rotation = values.rotate
      }
    } else if (values.rotate === "auto") {
      transforms.rotation = "auto"
    }
  },
}
