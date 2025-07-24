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
        defaultTransformation: { cropMode: "pad_resize" },
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
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
            helpText: "Enter 'auto' or a number between 0 and 100",
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
            helpText: "Enter a number between -255 and 255",
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
            helpText: "(Optional) Enter a prompt for generative fill",
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
        defaultTransformation: { crop: "maintain_ratio" },
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            // TODO: aspectRatio is always required fix it
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
                path: [],
              })
            }
            if (val.focus === "anchor" && !val.focusAnchor) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Focus anchor is required",
                path: [],
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Aspect Ratio",
            name: "aspectRatio",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "aspectRatio",
            helpText:
              "Enter the aspect ratio in the format 'width-height' (e.g., 16-9 or 4-3) or an expression string (e.g., iar_add_16_9, etc.)",
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
      // TODO: DONE TILL HERE
      {
        key: "resize-forced_crop",
        name: "Forced Crop",
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
        ],
      },
      {
        key: "resize-max_size_enlarge",
        name: "Max Size (Enlarge)",
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
        ],
      },
      {
        key: "resize-at_least",
        name: "Min-size",
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
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
        defaultTransformation: { cropMode: "extract" },
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
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
        defaultTransformation: { cropMode: "pad_extract" },
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "height",
            helpText:
              "Enter a decimal between 0 and 1 (e.g., 0.5 for 50%) or an integer greater than 1 (e.g., 100 for 100px) or an expression string (e.g., iw, ih, iw_div_2, etc.)",
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
            isVisible: ({ backgroundType }) => backgroundType === "color",
          },
          {
            label: "Background Generative Fill",
            name: "backgroundGenerativeFill",
            fieldType: "input",
            transformationKey: "aiChangeBackground",
            isTransformation: true,
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
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable contrast",
          },
        ],
      },
      {
        key: "adjust-shadow",
        name: "Shadow",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
        schema: z
          .object({
            shadow: z.string().optional(),
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
            fieldType: "input",
            isTransformation: true,
            transformationKey: "shadow",
            helpText: "Enter shadow value",
          },
        ],
      },
      {
        key: "adjust-grayscale",
        name: "Grayscale",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable grayscale",
          },
        ],
      },
      {
        key: "adjust-blur",
        name: "Blur",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enter blur value",
          },
        ],
      },
      {
        key: "adjust-rotate",
        name: "Rotate",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enter rotate value",
          },
        ],
      },
      {
        key: "adjust-flip",
        name: "Flip",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable flip",
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
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enter radius value",
          },
        ],
      },
      {
        key: "adjust-opacity",
        name: "Opacity",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enter opacity value",
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
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable remove background using Remove.bg",
          },
        ],
      },
      {
        key: "effect-bgremove",
        name: "ImageKit Background Removal",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable remove background using ImageKit",
          },
        ],
      },
      {
        key: "effect-changebg",
        name: "Change Background",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enter background prompt",
          },
        ],
      },
      {
        key: "effect-edit",
        name: "Edit Image using AI",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enter edit prompt",
          },
        ],
      },
      {
        key: "effect-dropshadow",
        name: "Drop Shadow",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable drop shadow",
          },
        ],
      },
      {
        key: "effect-retouch",
        name: "Retouch",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable retouch",
          },
        ],
      },
      {
        key: "effect-upscale",
        name: "Upscale",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable upscale",
          },
        ],
      },
      {
        key: "effect-genvar",
        name: "Generate Variations",
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
            helpText: "Enable or disable generate variations",
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
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
        defaultTransformation: {},
        description: "Lorem ipsum dolar sit amit",
        docsLink: "https://docs.imagekit.io/",
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
}
