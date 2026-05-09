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
import { type RefinementCtx, z } from "zod/v3"
import type { PerspectiveObject } from "../components/common/DistortPerspectiveInput"
import type { GradientPickerState } from "../components/common/GradientPicker"
import type { NestedLayer, NestedLayerPosition } from "../layers/nestedLayers"
import { buildLayerRawString } from "../layers/nestedLayers"
import { SIMPLE_OVERLAY_TEXT_REGEX, safeBtoa } from "../utils"
import { gradientStopPointToDecimalExpr } from "../utils/ikGradient"
import { background } from "./background"
import {
  getDefaultTransformationFromMode,
  RESIZE_CROP_HELP_TEXT,
  RESIZE_CROP_MODES,
  resizeAndCropCategory,
} from "./resizeAndCrop"
import {
  colorValidator,
  commonNumberAndExpressionValidator,
  heightValidator,
  layerXValidator,
  layerYValidator,
  lineHeightValidator,
  optionalPositiveFloatNumberValidator,
  refineUnsharpenMask,
  widthValidator,
} from "./transformation"

// Re-export for use by store and components
export {
  RESIZE_CROP_MODES,
  RESIZE_CROP_HELP_TEXT,
  getDefaultTransformationFromMode,
}

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
    isClearable?: boolean
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

const nestedLayerPositionSchema: z.ZodType<NestedLayerPosition> = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("none") }),
    z.object({ mode: z.literal("lfo"), lfo: z.string() }),
    z.object({
      mode: z.literal("topLeft"),
      lx: layerXValidator.optional(),
      ly: layerYValidator.optional(),
      lap: z.string().optional(),
    }),
    z.object({
      mode: z.literal("center"),
      lxc: layerXValidator.optional(),
      lyc: layerYValidator.optional(),
      lap: z.string().optional(),
    }),
  ])
  .default({ mode: "none" })

const nestedTextLayerSchema: z.ZodType<NestedLayer> = z.object({
  type: z.literal("text"),
  text: z.string(),
  width: widthValidator.optional(),
  fontSize: z.union([z.coerce.number(), z.string()]).optional(),
  fontFamily: z.string().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  padding: z.string().optional(),
  radius: z.union([z.literal("max"), z.coerce.number().min(0)]).optional(),
  opacity: z.coerce.number().min(1).max(9).optional(),
  position: nestedLayerPositionSchema.optional(),
})

const nestedImageLayerSchema: z.ZodType<NestedLayer> = z.object({
  type: z.literal("image"),
  imageUrl: z.string(),
  width: widthValidator.optional(),
  height: heightValidator.optional(),
  opacity: z.coerce.number().min(0).max(100).optional(),
  backgroundColor: z.string().optional(),
  radius: z.union([z.literal("max"), z.coerce.number().min(0)]).optional(),
  position: nestedLayerPositionSchema.optional(),
})

const nestedCanvasLayerObjectSchema = z.object({
  type: z.literal("canvas"),
  width: widthValidator.optional(),
  height: heightValidator.optional(),
  backgroundColor: z.string().optional(),
  opacity: z.coerce.number().min(1).max(9).optional(),
  radius: z.union([z.literal("max"), z.coerce.number().min(0)]).optional(),
  gradient: z
    .object({
      direction: z
        .union([z.coerce.number().min(0).max(359), z.string()])
        .optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      stopPoint: z
        .union([z.coerce.number().min(1).max(100), z.string()])
        .optional(),
    })
    .optional(),
  position: nestedLayerPositionSchema.optional(),
  children: z.array(z.lazy(() => nestedLayerSchema)).optional(),
})

const nestedLayerSchema: z.ZodType<NestedLayer> = z.lazy(() =>
  z.discriminatedUnion("type", [
    nestedTextLayerSchema,
    nestedImageLayerSchema,
    nestedCanvasLayerObjectSchema,
  ]),
)

const baseTransformationSchema: TransformationSchema[] = [
  resizeAndCropCategory,
  {
    key: "adjust",
    name: "Adjust",
    items: [
      {
        key: "adjust-background",
        name: "Background",
        description:
          "Apply a solid color or a gradient background to the image.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#background---bg",
        defaultTransformation: {},
        schema: z.object({
          ...background.getPropsFor("root_image").schema,
        }),
        transformations: [
          ...background
            .getPropsFor("root_image")
            .transformations({ transformationGroup: "background" }),
        ],
      },
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
        key: "adjust-gradient",
        name: "Gradient",
        description: "Add gradient overlay over the image.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#gradient---e-gradient",
        defaultTransformation: {},
        schema: z
          .object({
            gradient: z
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
            gradientSwitch: z.coerce.boolean({
              invalid_type_error: "Should be a boolean.",
            }),
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
            label: "Gradient",
            name: "gradientSwitch",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "gradient",
            helpText: "Toggle to add a gradient overlay over the image.",
          },
          {
            label: "Apply Gradient",
            name: "gradient",
            fieldType: "gradient-picker",
            isTransformation: true,
            transformationKey: "gradient",
            transformationGroup: "gradient",
            isVisible: ({ gradientSwitch }) => gradientSwitch === true,
            fieldProps: {
              defaultValue: {
                from: "#FFFFFFFF",
                to: "#00000000",
                direction: "bottom",
                stopPoint: 100,
              },
            },
          },
        ],
      },
      {
        key: "adjust-distort",
        name: "Distort",
        description: "Distort the image.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#distort---e-distort",
        defaultTransformation: {},
        schema: z
          .object({
            distort: z.coerce.boolean(),
            distortType: z.enum(["perspective", "arc"]).optional(),
            distortPerspective: z
              .object({
                x1: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y1: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                x2: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y2: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                x3: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y3: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                x4: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y4: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
              })
              .optional(),
            distortArcDegree: z
              .string()
              .regex(/^[-N]?\d+$/)
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
          )
          .superRefine((val, ctx) => {
            validatePerspectiveDistort(val, ctx)
          }),
        transformations: [
          {
            label: "Distort",
            name: "distort",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "distort",
            helpText: "Toggle to apply distortion to the image.",
          },
          {
            label: "Distortion Type",
            name: "distortType",
            fieldType: "radio-card",
            isTransformation: false,
            transformationGroup: "distort",
            isVisible: ({ distort }) => distort === true,
            fieldProps: {
              options: [
                { label: "Perspective", value: "perspective" },
                { label: "Arc", value: "arc" },
              ],
              defaultValue: "perspective",
            },
          },
          {
            label: "Distortion Perspective",
            name: "distortPerspective",
            fieldType: "distort-perspective-input",
            isTransformation: false,
            transformationGroup: "distort",
            isVisible: ({ distort, distortType }) =>
              distort === true && distortType === "perspective",
            fieldProps: {
              defaultValue: {
                x1: "",
                y1: "",
                x2: "",
                y2: "",
                x3: "",
                y3: "",
                x4: "",
                y4: "",
              },
            },
          },
          {
            label: "Distortion Arc Degrees",
            name: "distortArcDegree",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "distort",
            isVisible: ({ distort, distortType }) =>
              distort === true && distortType === "arc",
            helpText: "Enter the arc degree for the arc distortion effect.",
            examples: ["15", "30", "-45", "N50"],
            fieldProps: {
              min: -360,
              max: 360,
              step: 5,
              defaultValue: "0",
              inputType: "text",
              skipStepCheck: true,
            },
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
            // z.preprocess normalises legacy string values that were coerced
            // from the array before this fix (e.g. "horizontal",
            // "horizontal,vertical", or corrupted "h,,,o,r,i,z,n,t,a,l,...").
            flip: z.preprocess((val) => {
              if (Array.isArray(val)) return val
              if (typeof val === "string" && val) {
                return val
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s === "horizontal" || s === "vertical")
              }
              return []
            }, z.array(z.enum(["horizontal", "vertical"])).optional()),
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
            radius: z
              .object({
                mode: z.enum(["uniform", "individual"]).optional(),
                radius: z
                  .union([
                    z.literal("max"),
                    z.coerce
                      .number({
                        invalid_type_error: "Should be a number.",
                      })
                      .min(0, {
                        message: "Negative values are not allowed.",
                      }),
                    z.object({
                      topLeft: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                      topRight: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                      bottomRight: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                      bottomLeft: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                    }),
                  ])
                  .optional(),
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
            label: "Radius",
            name: "radius",
            fieldType: "radius-input",
            isTransformation: true,
            transformationGroup: "radius",
            helpText:
              "Enter a positive integer for rounded corners or 'max' for a fully circular output.",
            examples: ["10", "max"],
            fieldProps: {
              defaultValue: {},
            },
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
      {
        key: "adjust-border",
        name: "Border",
        description:
          "Add a border to the image. Specify a border width and color.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#border---b",
        defaultTransformation: {},
        schema: z
          .object({
            borderWidth: commonNumberAndExpressionValidator.optional(),
            borderColor: colorValidator,
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
              message: "Border width and color are required",
              path: [],
            },
          ),

        transformations: [
          {
            label: "Border Width",
            name: "borderWidth",
            fieldType: "input",
            isTransformation: false,
            transformationGroup: "border",
            helpText: "Enter a border width",
            fieldProps: {
              defaultValue: 1,
              min: 1,
              max: 99,
              step: 1,
            },
          },
          {
            label: "Border Color",
            name: "borderColor",
            fieldType: "color-picker",
            isTransformation: false,
            transformationGroup: "border",
            helpText: "Select the color of the border.",
            fieldProps: {
              hideOpacity: true,
              showHexAlpha: false,
              defaultValue: "#000000",
              isClearable: true,
            },
          },
        ],
      },
      {
        key: "adjust-trim",
        name: "Trim",
        description:
          "Trim solid or nearly solid backgrounds from the edges of the image, leaving only the central object.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#trim-edges---t",
        defaultTransformation: {},
        schema: z
          .object({
            trimEnabled: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            trim: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .int()
              .min(1)
              .max(99)
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
            label: "Enable Trim",
            name: "trimEnabled",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "trim",
            helpText:
              "Toggle to trim background edges for images with solid or near-solid backgrounds.",
          },
          {
            label: "Threshold",
            name: "trim",
            fieldType: "slider",
            isTransformation: false,
            transformationGroup: "trim",
            helpText:
              "Trim edges for images with solid or near-solid backgrounds. Use a threshold between 1 and 99.",
            fieldProps: {
              defaultValue: 10,
              min: 1,
              max: 99,
              step: 1,
            },
            isVisible: ({ trimEnabled }) => trimEnabled === true,
          },
        ],
      },
      {
        key: "adjust-color-replace",
        name: "Color Replace",
        description:
          "Replace specific colors in the image with a new color, while preserving the original image's luminance and chroma relationships.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#color-replace---cr",
        defaultTransformation: {},
        schema: z
          .object({
            toColor: colorValidator,
            tolerance: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .int()
              .min(0)
              .max(100)
              .optional(),
            fromColor: z.union([colorValidator, z.literal("")]).optional(),
          })
          .refine(
            (val) => {
              // At least toColor must be provided
              return val.toColor !== undefined && val.toColor !== ""
            },
            {
              message: "To Color is required",
              path: ["toColor"],
            },
          ),
        transformations: [
          {
            label: "From Color",
            examples: ["FFFFFF", "FF0000"],
            name: "fromColor",
            fieldType: "color-picker",
            isTransformation: false,
            fieldProps: {
              hideOpacity: true,
              showHexAlpha: false,
              isClearable: true,
            },
            transformationGroup: "colorReplace",
            helpText:
              "Select the source color you want to replace (optional - if not specified, dominant color will be replaced).",
          },
          {
            label: "Tolerance",
            name: "tolerance",
            fieldType: "slider",
            isTransformation: false,
            transformationGroup: "colorReplace",
            helpText:
              "Set the tolerance for the color replacement. Use a number between 0 and 100. Lower values are more precise, but may not work for all colors. Higher values are more forgiving, but may introduce more color variations.",
            fieldProps: {
              defaultValue: 35,
              min: 0,
              max: 100,
              step: 1,
            },
          },
          {
            label: "To Color",
            name: "toColor",
            fieldType: "color-picker",
            examples: ["FFFFFF", "FF0000"],
            fieldProps: {
              hideOpacity: true,
              showHexAlpha: false,
              isClearable: true,
            },
            isTransformation: false,
            transformationGroup: "colorReplace",
            helpText: "Select the target color to replace with.",
          },
        ],
      },
      {
        key: "adjust-sharpen",
        name: "Sharpen",
        description:
          "Sharpen the image to highlight the edges and finer details within an image.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#sharpen---e-sharpen",
        defaultTransformation: {},
        schema: z
          .object({
            sharpenEnabled: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            sharpen: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .int()
              .min(1)
              .max(99)
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
            label: "Sharpen Image",
            name: "sharpenEnabled",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "sharpen",
            helpText:
              "Toggle to sharpen the image to highlight the edges and finer details within an image.",
          },
          {
            label: "Threshold",
            name: "sharpen",
            fieldType: "slider",
            isTransformation: false,
            transformationGroup: "sharpen",
            helpText:
              "Sharpen the image to highlight the edges and finer details within an image. Control the intensity of this effect using a threshold value between 1% and 99%.",
            fieldProps: {
              min: 1,
              max: 99,
              step: 1,
              defaultValue: 50,
            },
            isVisible: ({ sharpenEnabled }) => sharpenEnabled === true,
          },
        ],
      },
      {
        key: "adjust-unsharpen-mask",
        name: "Unsharpen Mask",
        description:
          "Image sharpening technique that enhances edge contrast to make details appear clearer. Amplifies differences between neighboring pixels without significantly affecting smooth areas.",
        docsLink:
          "https://imagekit.io/docs/effects-and-enhancements#unsharp-mask---e-usm",
        defaultTransformation: {},
        schema: z
          .object({
            unsharpenMaskRadius: z.coerce.number().positive({
              message: "Should be a positive floating point number.",
            }),
            unsharpenMaskSigma: z.coerce.number().positive({
              message: "Should be a positive floating point number.",
            }),
            unsharpenMaskAmount: z.coerce.number().positive({
              message: "Should be a positive floating point number.",
            }),
            unsharpenMaskThreshold: z.coerce.number().positive({
              message: "Should be a positive floating point number.",
            }),
          })
          .refine((val) => {
            if (Object.values(val).some((v) => v !== undefined && v !== null)) {
              return true
            }
            return false
          }),
        transformations: [
          {
            name: "unsharpenMaskRadius",
            fieldType: "input",
            label: "Radius",
            isTransformation: false,
            transformationGroup: "unsharpenMask",
            helpText:
              "Controls how wide the sharpening effect spreads from each edge. Larger values affect broader areas; smaller values focus on fine details.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["1", "8", "15"],
          },
          {
            name: "unsharpenMaskSigma",
            fieldType: "input",
            label: "Sigma",
            isTransformation: false,
            transformationGroup: "unsharpenMask",
            helpText:
              "Defines the amount of blur used to detect edges before sharpening. Higher values smooth more before sharpening; lower values preserve fine textures.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["1", "5", "6"],
          },
          {
            name: "unsharpenMaskAmount",
            fieldType: "input",
            label: "Amount",
            isTransformation: false,
            transformationGroup: "unsharpenMask",
            helpText: "Sets the strength of the sharpening effect.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["0.1", "2", "0.8"],
          },
          {
            name: "unsharpenMaskThreshold",
            fieldType: "input",
            label: "Threshold",
            isTransformation: false,
            transformationGroup: "unsharpenMask",
            helpText: "Set the threshold value for the unsharpen mask.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["0.1", "2", "0.8"],
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
            lxc: layerXValidator.optional(),
            lyc: layerYValidator.optional(),
            lfo: z.string().optional(),
            children: z.array(nestedLayerSchema).optional(),
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
            padding: z.preprocess(
              (val) => (val === "" ? undefined : val),
              z
                .object({
                  mode: z.enum(["uniform", "individual"]).optional(),
                  padding: z
                    .union([
                      z.coerce
                        .number({
                          invalid_type_error: "Should be a number.",
                        })
                        .min(0, {
                          message: "Negative values are not allowed.",
                        }),
                      z.object({
                        top: z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                        right: z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                        bottom: z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                        left: z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      }),
                    ])
                    .optional(),
                })
                .optional(),
            ),
            opacitySwitch: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
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
            radiusSwitch: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            radius: z.preprocess(
              (val) => (val === "" ? undefined : val),
              z
                .union([
                  z.literal("max"),
                  z.coerce
                    .number({
                      invalid_type_error: "Should be a number.",
                    })
                    .min(0),
                ])
                .optional(),
            ),
            lineHeight: lineHeightValidator,
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
            examples: ["10", "-20", "N30", "bw_div_2"],
          },
          {
            label: "Position Y",
            name: "positionY",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "y",
            transformationGroup: "textLayer",
            helpText: "Specify vertical offset for the text.",
            examples: ["10", "-20", "N30", "bh_div_2"],
          },
          {
            label: "Layer Center X",
            name: "lxc",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "lxc",
            transformationGroup: "textLayer",
            helpText:
              "X coordinate (in the base asset) where the layer's center should be placed.",
            examples: ["200", "bw_mul_0.4", "bw_sub_cw"],
          },
          {
            label: "Layer Center Y",
            name: "lyc",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "lyc",
            transformationGroup: "textLayer",
            helpText:
              "Y coordinate (in the base asset) where the layer's center should be placed.",
            examples: ["150", "bh_mul_0.4", "bh_sub_ch"],
          },
          {
            label: "Relative Focus (lfo)",
            name: "lfo",
            fieldType: "anchor",
            isTransformation: true,
            transformationGroup: "textLayer",
            helpText:
              "Position the layer relative to its parent using lfo (default: center).",
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
            fieldProps: {
              isClearable: true,
            },
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
            fieldProps: {
              isClearable: true,
            },
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
            fieldType: "padding-input",
            isTransformation: true,
            transformationKey: "padding",
            transformationGroup: "textLayer",
            helpText: "Specify padding around the text (in pixels).",
            examples: ["10", "20"],
          },
          {
            label: "Line Height",
            name: "lineHeight",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "lineHeight",
            transformationGroup: "textLayer",
            helpText:
              "Specify the line height for the text overlay. Must be a positive integer or a valid expression string.",
            examples: ["1", "3", "bh_div_2"],
          },
          {
            label: "Opacity",
            name: "opacitySwitch",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "textLayer",
            helpText: "Toggle to set text layer opacity (al).",
            fieldProps: {
              defaultValue: false,
            },
          },
          {
            label: "Opacity",
            name: "opacity",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "textLayer",
            helpText: "Set opacity for the text overlay (1-9).",
            fieldProps: {
              min: 1,
              max: 9,
              step: 1,
              defaultValue: 9,
            },
            isVisible: (v) => {
              if (v.opacitySwitch === true) return true
              if (v.opacitySwitch === false) return false
              return (
                typeof v.opacity === "number" &&
                v.opacity >= 1 &&
                v.opacity <= 9
              )
            },
          },
          {
            label: "Radius",
            name: "radiusSwitch",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "textLayer",
            helpText: "Toggle to set corner radius for the text layer.",
            fieldProps: {
              defaultValue: false,
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
            isVisible: (v) => {
              if (v.radiusSwitch === true) return true
              if (v.radiusSwitch === false) return false
              const r = v.radius
              return (
                r === "max" ||
                (typeof r === "number" && Number.isFinite(r) && r > 0)
              )
            },
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
            children: z.array(nestedLayerSchema).optional(),
            crop: z.string().optional(),
            positionX: layerXValidator.optional(),
            positionY: layerYValidator.optional(),
            lxc: layerXValidator.optional(),
            lyc: layerYValidator.optional(),
            lfo: z.string().optional(),
            anchor: z.string().optional(),
            opacityEnabled: z.boolean().optional(),
            opacity: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .optional(),
            backgroundColor: z.string().optional(),
            dprEnabled: z.boolean().optional(),
            dpr: z
              .union([
                z.coerce.number({
                  invalid_type_error: "Should be a number.",
                }),
                z.literal("auto"),
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
            trimEnabled: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            trimThreshold: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .int()
              .min(1)
              .max(99)
              .optional(),
            qualityEnabled: z.boolean().optional(),
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
            borderWidth: commonNumberAndExpressionValidator.optional(),
            borderColor: colorValidator.optional(),
            // Focus + Zoom properties
            focus: z.string().optional(),
            focusAnchor: z.string().optional(),
            focusObject: z.string().optional(),
            coordinateMethod: z.string().optional(),
            x: z.string().optional(),
            y: z.string().optional(),
            xc: z.string().optional(),
            yc: z.string().optional(),
            zoom: z.coerce.number().optional(),

            // Gradient properties
            gradientSwitch: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            gradient: z
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

            // Shadow properties
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

            // Grayscale
            grayscale: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),

            // Distort
            distort: z.coerce.boolean(),
            distortType: z.enum(["perspective", "arc"]).optional(),
            distortPerspective: z
              .object({
                x1: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y1: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                x2: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y2: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                x3: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y3: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                x4: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
                y4: z.union([z.literal(""), z.string().regex(/^[-N]?\d+$/)]),
              })
              .optional(),
            distortArcDegree: z
              .string()
              .regex(/^[-N]?\d+$/)
              .optional(),

            // Radius
            radius: z
              .object({
                mode: z.enum(["uniform", "individual"]).optional(),
                radius: z
                  .union([
                    z.literal("max"),
                    z.coerce
                      .number({
                        invalid_type_error: "Should be a number.",
                      })
                      .min(0, {
                        message: "Negative values are not allowed.",
                      }),
                    z.object({
                      topLeft: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                      topRight: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                      bottomRight: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                      bottomLeft: z.union([
                        z.literal("max"),
                        z.coerce
                          .number({
                            invalid_type_error: "Should be a number.",
                          })
                          .min(0, {
                            message: "Negative values are not allowed.",
                          }),
                      ]),
                    }),
                  ])
                  .optional(),
              })
              .optional(),
            sharpenEnabled: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            sharpen: z.coerce
              .number({
                invalid_type_error: "Should be a number.",
              })
              .int()
              .min(1)
              .max(99)
              .optional(),
            unsharpenMask: z.coerce.boolean().optional(),
            unsharpenMaskRadius:
              optionalPositiveFloatNumberValidator.optional(),
            unsharpenMaskSigma: optionalPositiveFloatNumberValidator.optional(),
            unsharpenMaskAmount:
              optionalPositiveFloatNumberValidator.optional(),
            unsharpenMaskThreshold:
              optionalPositiveFloatNumberValidator.optional(),
          })
          .superRefine((val, ctx) => refineUnsharpenMask(val, ctx))
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

            // DPR for image layers: only valid when either width or height is specified
            if (val.dpr && !(val.width || val.height)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  "DPR can only be used when either width or height is specified",
                path: ["dpr"],
              })
            }

            validatePerspectiveDistort(val, ctx)
          }),
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
            label: "Adjust DPR",
            name: "dprEnabled",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "imageLayer",
            transformationKey: "dprEnabled",
            helpText: "Adjust the DPR of the overlay image.",
            fieldProps: {
              defaultValue: false,
            },
            isVisible: ({ width, height }) => !!(width || height),
          },
          {
            label: "DPR",
            name: "dpr",
            helpText:
              "Set this value to deliver images optimised for high-resolution displays. The value can be between 0.1 and 5.",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "imageLayer",
            transformationKey: "dpr",
            fieldProps: {
              defaultValue: 1,
              autoOption: true,
              min: 0.1,
              max: 5,
              step: 0.1,
            },
            isVisible: ({ dprEnabled, width, height }) =>
              dprEnabled === true && !!(width || height),
          },
          {
            label: "Crop Mode",
            name: "crop",
            fieldType: "select",
            isTransformation: true,
            transformationKey: "crop",
            transformationGroup: "imageLayer",
            helpText: "Crop the overlay image.",
            fieldProps: {
              options: [
                ...RESIZE_CROP_MODES.map((mode) => ({
                  label: `${mode.label} (${mode.paramLabel})`,
                  value: mode.value,
                })),
              ],
              defaultValue: "",
              isClearable: true,
            },
          },
          {
            label: "Focus",
            name: "focus",
            fieldType: "select",
            isTransformation: true,
            transformationGroup: "imageLayer",
            fieldProps: {
              options: [
                { label: "Select one", value: "" },
                { label: "Auto", value: "auto" },
                { label: "Anchor", value: "anchor" },
                { label: "Face", value: "face" },
                { label: "Object", value: "object" },
                { label: "Custom", value: "custom" },
                { label: "Coordinates", value: "coordinates" },
              ],
            },
            helpText:
              "Choose how to position the extracted region in overlay image. Custom uses a saved focus area from Media Library.",
            isVisible: ({ crop }) => crop === "cm-extract",
          },
          // Only for extract crop mode
          {
            label: "Focus Anchor",
            name: "focusAnchor",
            fieldType: "anchor",
            isTransformation: true,
            transformationGroup: "imageLayer",
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
            isVisible: ({ focus, crop }) =>
              focus === "anchor" && crop === "cm-extract",
          },
          // Only for pad_resize crop mode
          {
            label: "Focus",
            name: "focusAnchor",
            fieldType: "anchor",
            isTransformation: true,
            transformationGroup: "imageLayer",
            fieldProps: {
              positions: ["center", "top", "bottom", "left", "right"],
            },
            isVisible: ({ crop }) => crop === "cm-pad_resize",
          },
          {
            label: "Focus Object",
            name: "focusObject",
            fieldType: "select",
            isTransformation: true,
            transformationGroup: "imageLayer",
            fieldProps: {
              isCreatable: false,
            },
            helpText:
              "Select an object to focus on in the overlay image during extraction. The crop will center on this object.",
            isVisible: ({ focus }) => focus === "object",
          },
          {
            label: "Coordinate Method",
            name: "coordinateMethod",
            fieldType: "radio-card",
            isTransformation: false,
            transformationGroup: "imageLayer",
            fieldProps: {
              options: [
                { label: "Top-left (x, y)", value: "topleft" },
                { label: "Center (xc, yc)", value: "center" },
              ],
              defaultValue: "topleft",
            },
            helpText:
              "Choose whether coordinates are relative to the top-left corner or the center of the overlay image.",
            isVisible: ({ focus }) => focus === "coordinates",
          },
          {
            label: "X (Horizontal)",
            name: "x",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "imageLayer",
            helpText:
              "Horizontal position from the top-left of the overlay image. Use an integer or expression.",
            examples: ["100", "iw_mul_0.4"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "topleft",
          },
          {
            label: "Y (Vertical)",
            name: "y",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "imageLayer",
            helpText:
              "Vertical position from the top-left of the overlay image. Use an integer or expression.",
            examples: ["100", "ih_mul_0.4"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "topleft",
          },
          {
            label: "XC (Horizontal Center)",
            name: "xc",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "imageLayer",
            helpText:
              "Horizontal center position of the overlay image. Use an integer or expression.",
            examples: ["200", "iw_mul_0.5"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "center",
          },
          {
            label: "YC (Vertical Center)",
            name: "yc",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "imageLayer",
            helpText:
              "Vertical center position of the overlay image. Use an integer or expression.",
            examples: ["200", "ih_mul_0.5"],
            isVisible: ({ focus, coordinateMethod }) =>
              focus === "coordinates" && coordinateMethod === "center",
          },
          {
            label: "Zoom",
            name: "zoom",
            fieldType: "zoom",
            isTransformation: true,
            transformationGroup: "imageLayer",
            fieldProps: {
              defaultValue: 100,
            },
            helpText:
              "Select the zoom level for the focus area. Higher zoom levels crop closer to the focus point.",
            isVisible: ({ focus }) => focus === "object" || focus === "face",
          },
          {
            label: "Position X",
            name: "positionX",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "x",
            transformationGroup: "imageLayer",
            helpText: "Specify the horizontal offset for the overlay image.",
            examples: ["10", "-20", "N30", "bw_div_2"],
          },
          {
            label: "Position Y",
            name: "positionY",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "y",
            transformationGroup: "imageLayer",
            helpText: "Specify the vertical offset for the overlay image.",
            examples: ["10", "-20", "N30", "bh_div_2"],
          },
          {
            label: "Layer Center X",
            name: "lxc",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "lxc",
            transformationGroup: "imageLayer",
            helpText:
              "X coordinate (in the base asset) where the layer's center should be placed.",
            examples: ["200", "bw_mul_0.4", "bw_sub_cw"],
          },
          {
            label: "Layer Center Y",
            name: "lyc",
            fieldType: "input",
            isTransformation: true,
            transformationKey: "lyc",
            transformationGroup: "imageLayer",
            helpText:
              "Y coordinate (in the base asset) where the layer's center should be placed.",
            examples: ["150", "bh_mul_0.4", "bh_sub_ch"],
          },
          {
            label: "Relative Focus (lfo)",
            name: "lfo",
            fieldType: "anchor",
            isTransformation: true,
            transformationGroup: "imageLayer",
            helpText:
              "Position the layer relative to its parent using lfo (default: center).",
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
          },
          {
            label: "Opacity",
            name: "opacityEnabled",
            fieldType: "switch",
            isTransformation: false,
            transformationKey: "opacityEnabled",
            transformationGroup: "imageLayer",
            helpText: "Toggle to set a custom opacity for the overlay image.",
            fieldProps: {
              defaultValue: false,
            },
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
            isVisible: ({ opacityEnabled }) => opacityEnabled === true,
          },
          {
            label: "Background Color",
            name: "backgroundColor",
            fieldType: "color-picker",
            isTransformation: true,
            transformationKey: "background",
            transformationGroup: "imageLayer",
            helpText: "Set a background color for the overlay image.",
            fieldProps: {
              isClearable: true,
            },
          },
          {
            label: "Radius",
            name: "radius",
            fieldType: "radius-input",
            isTransformation: true,
            transformationGroup: "imageLayer",
            helpText:
              "Set the corner radius for the overlay image. Use 'max' for a circle or oval.",
            examples: ["10", "max"],
            fieldProps: {
              defaultValue: {},
            },
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
            name: "trimEnabled",
            fieldType: "switch",
            isTransformation: false,
            transformationKey: "trimEnabled",
            transformationGroup: "imageLayer",
            helpText: "Control trimming of the overlay image.",
            fieldProps: {
              defaultValue: true,
            },
          },
          {
            label: "Trim Threshold",
            name: "trimThreshold",
            fieldType: "slider",
            isTransformation: true,
            transformationKey: "trimThreshold",
            transformationGroup: "imageLayer",
            helpText:
              "Control the intensity of this effect using a threshold value between 1% and 99%.",
            fieldProps: {
              min: 1,
              max: 99,
              step: 1,
              defaultValue: 10,
            },
            isVisible: ({ trimEnabled }) => trimEnabled === true,
          },
          {
            label: "Quality",
            name: "qualityEnabled",
            fieldType: "switch",
            isTransformation: false,
            transformationKey: "qualityEnabled",
            transformationGroup: "imageLayer",
            helpText:
              "Toggle to set a custom compression quality for the overlay image.",
            fieldProps: {
              defaultValue: false,
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
            isVisible: ({ qualityEnabled }) => qualityEnabled === true,
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
          {
            label: "Border Width",
            name: "borderWidth",
            fieldType: "input",
            isTransformation: false,
            transformationKey: "borderWidth",
            transformationGroup: "imageLayer",
            fieldProps: {
              defaultValue: "",
            },
            helpText:
              "Enter the width of the border or expression of the overlay image.",
            examples: ["10", "ch_div_2"],
          },
          {
            label: "Border Color",
            name: "borderColor",
            fieldType: "color-picker",
            isTransformation: false,
            transformationKey: "borderColor",
            transformationGroup: "imageLayer",
            isVisible: ({ borderWidth }) => (borderWidth as string) !== "",
            helpText: "Select the color of the border of the overlay image.",
            fieldProps: {
              hideOpacity: true,
              showHexAlpha: false,
              defaultValue: "#000000",
              isClearable: true,
            },
          },
          {
            label: "Sharpen Overlay",
            name: "sharpenEnabled",
            fieldType: "switch",
            isTransformation: false,
            transformationKey: "sharpenEnabled",
            transformationGroup: "imageLayer",
            helpText:
              "Toggle to sharpen the overlay image to highlight edges and fine details.",
            fieldProps: {
              defaultValue: false,
            },
          },
          {
            label: "Sharpen Threshold",
            name: "sharpen",
            fieldType: "slider",
            isTransformation: false,
            transformationKey: "sharpen",
            transformationGroup: "imageLayer",
            helpText:
              "Sharpen the overlay image. Control the intensity of this effect using a threshold value between 1% and 99%.",
            fieldProps: {
              min: 1,
              defaultValue: 50,
              max: 99,
              step: 1,
            },
            isVisible: ({ sharpenEnabled }) => sharpenEnabled === true,
          },
          {
            name: "unsharpenMask",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "imageLayer",
            helpText:
              "Toggle to unsharpen the overlay image to remove the edges and finer details within an image.",
            fieldProps: {
              defaultValue: false,
            },
            label: "Unsharpen Mask",
          },
          {
            name: "unsharpenMaskRadius",
            fieldType: "input",
            label: "Radius",
            isTransformation: false,
            transformationGroup: "imageLayer",
            helpText:
              "Controls how wide the sharpening effect spreads from each edge. Larger values affect broader areas; smaller values focus on fine details.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["1", "8", "15"],
            isVisible: ({ unsharpenMask }) => unsharpenMask === true,
          },
          {
            name: "unsharpenMaskSigma",
            fieldType: "input",
            label: "Sigma",
            isTransformation: false,
            transformationGroup: "imageLayer",
            helpText:
              "Defines the amount of blur used to detect edges before sharpening. Higher values smooth more before sharpening; lower values preserve fine textures.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["1", "5", "6"],
            isVisible: ({ unsharpenMask }) => unsharpenMask === true,
          },
          {
            name: "unsharpenMaskAmount",
            fieldType: "input",
            label: "Amount",
            isTransformation: false,
            transformationGroup: "imageLayer",
            helpText: "Sets the strength of the sharpening effect.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["0.1", "2", "0.8"],
            isVisible: ({ unsharpenMask }) => unsharpenMask === true,
          },
          {
            name: "unsharpenMaskThreshold",
            fieldType: "input",
            label: "Threshold",
            isTransformation: false,
            transformationGroup: "imageLayer",
            helpText: "Set the threshold value for the unsharpen mask.",
            fieldProps: {
              defaultValue: "",
            },
            examples: ["0.1", "2", "0.8"],
            isVisible: ({ unsharpenMask }) => unsharpenMask === true,
          },

          {
            label: "Gradient",
            name: "gradientSwitch",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "imageLayer",
            helpText:
              "Toggle to add a gradient overlay over the overlay image.",
          },
          {
            label: "Apply Gradient",
            name: "gradient",
            fieldType: "gradient-picker",
            isTransformation: true,
            transformationKey: "gradient",
            transformationGroup: "imageLayer",
            isVisible: ({ gradientSwitch }) => gradientSwitch === true,
            fieldProps: {
              defaultValue: {
                from: "#FFFFFFFF",
                to: "#00000000",
                direction: "bottom",
                stopPoint: 100,
              },
            },
          },
          {
            label: "Shadow",
            name: "shadow",
            fieldType: "switch",
            isTransformation: true,
            transformationGroup: "imageLayer",
            helpText:
              "Toggle to add a non-AI shadow under objects in the overlay image.",
          },
          {
            label: "Blur",
            name: "shadowBlur",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "imageLayer",
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
            transformationGroup: "imageLayer",
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
            transformationGroup: "imageLayer",
            helpText:
              "Enter the horizontal offset as a percentage of the overlay image width.",
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
            transformationGroup: "imageLayer",
            helpText:
              "Enter the vertical offset as a percentage of the overlay image height.",
            isVisible: ({ shadow }) => shadow === true,
            fieldProps: {
              min: -100,
              max: 100,
              step: 1,
              defaultValue: 2,
            },
          },
          {
            label: "Grayscale",
            name: "grayscale",
            fieldType: "switch",
            isTransformation: true,
            transformationKey: "grayscale",
            transformationGroup: "imageLayer",
            helpText: "Toggle to convert the overlay image to grayscale.",
          },
          {
            label: "Distort",
            name: "distort",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "imageLayer",
            helpText: "Toggle to apply distortion to the overlay image.",
          },
          {
            label: "Distortion Type",
            name: "distortType",
            fieldType: "radio-card",
            isTransformation: false,
            transformationGroup: "imageLayer",
            isVisible: ({ distort }) => distort === true,
            fieldProps: {
              options: [
                { label: "Perspective", value: "perspective" },
                { label: "Arc", value: "arc" },
              ],
              defaultValue: "perspective",
            },
          },
          {
            label: "Distortion Perspective",
            name: "distortPerspective",
            fieldType: "distort-perspective-input",
            isTransformation: false,
            transformationGroup: "imageLayer",
            isVisible: ({ distort, distortType }) =>
              distort === true && distortType === "perspective",
            fieldProps: {
              defaultValue: {
                x1: "",
                y1: "",
                x2: "",
                y2: "",
                x3: "",
                y3: "",
                x4: "",
                y4: "",
              },
            },
          },
          {
            label: "Distortion Arc Degrees",
            name: "distortArcDegree",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "imageLayer",
            isVisible: ({ distort, distortType }) =>
              distort === true && distortType === "arc",
            helpText: "Enter the arc degree for the arc distortion effect.",
            examples: ["15", "30", "-45", "N50"],
            fieldProps: {
              min: -360,
              max: 360,
              step: 5,
              defaultValue: "0",
              inputType: "text",
              skipStepCheck: true,
            },
          },
        ],
      },
      {
        key: "layers-canvas",
        name: "Canvas Layer",
        description:
          "Add a solid/gradient canvas as a layer. You can also nest image/text/canvas layers inside it to build self-contained compositions.",
        docsLink:
          "https://imagekit.io/docs/add-overlays-on-images#nest-text-and-image-layers-inside-canvas",
        defaultTransformation: {},
        schema: z
          .object({
            width: widthValidator.optional(),
            height: heightValidator.optional(),
            backgroundColor: z.string().optional(),
            lfo: z.string().optional(),
            opacitySwitch: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            opacity: z.coerce.number().min(1).max(9).optional(),
            radiusSwitch: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            radius: z
              .union([z.literal("max"), z.coerce.number().min(0)])
              .optional(),
            gradientSwitch: z.coerce
              .boolean({
                invalid_type_error: "Should be a boolean.",
              })
              .optional(),
            gradient: z
              .object({
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
                from: z.string().optional(),
                to: z.string().optional(),
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
            positionX: layerXValidator.optional(),
            positionY: layerYValidator.optional(),
            lxc: layerXValidator.optional(),
            lyc: layerYValidator.optional(),
            children: z.array(nestedLayerSchema).optional(),
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
            label: "Width",
            name: "width",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText: "Specify canvas width.",
            examples: ["300", "bw_div_2"],
          },
          {
            label: "Height",
            name: "height",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText: "Specify canvas height.",
            examples: ["200", "bh_div_2"],
          },
          {
            label: "Background Color",
            name: "backgroundColor",
            fieldType: "color-picker",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText: "Set a solid background color for the canvas.",
            fieldProps: { isClearable: true },
          },
          {
            label: "Relative Focus (lfo)",
            name: "lfo",
            fieldType: "anchor",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText:
              "Position the canvas layer relative to its parent (default: center).",
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
          },
          {
            label: "Opacity",
            name: "opacitySwitch",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "canvasLayer",
            helpText: "Toggle to set canvas opacity (al).",
            fieldProps: {
              defaultValue: false,
            },
          },
          {
            label: "Opacity",
            name: "opacity",
            fieldType: "slider",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText: "Set opacity for the canvas (1-9).",
            fieldProps: { min: 1, max: 9, step: 1, defaultValue: 9 },
            isVisible: ({ opacitySwitch }) => opacitySwitch === true,
          },
          {
            label: "Radius",
            name: "radiusSwitch",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "canvasLayer",
            helpText: "Toggle to set canvas corner radius.",
            fieldProps: {
              defaultValue: false,
            },
          },
          {
            label: "Radius",
            name: "radius",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText: "Corner radius for the canvas (or 'max').",
            isVisible: ({ radiusSwitch }) => radiusSwitch === true,
          },
          {
            label: "Gradient",
            name: "gradientSwitch",
            fieldType: "switch",
            isTransformation: false,
            transformationGroup: "canvasLayer",
            helpText: "Toggle to add a gradient overlay on the canvas layer.",
            fieldProps: {
              defaultValue: false,
            },
          },
          {
            label: "Apply Gradient",
            name: "gradient",
            fieldType: "gradient-picker",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText:
              "Gradient overlay on the canvas. (Uses e-gradient inside the canvas layer.)",
            fieldProps: {
              defaultValue: {
                from: "#FFFFFFFF",
                to: "#00000000",
                direction: "bottom",
                stopPoint: 100,
              },
            },
            isVisible: ({ gradientSwitch }) => gradientSwitch === true,
          },
          {
            label: "Position X",
            name: "positionX",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText: "Horizontal offset for the canvas layer.",
            examples: ["10", "-20", "N30", "bw_div_2"],
          },
          {
            label: "Position Y",
            name: "positionY",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText: "Vertical offset for the canvas layer.",
            examples: ["10", "-20", "N30", "bh_div_2"],
          },
          {
            label: "Layer Center X",
            name: "lxc",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText:
              "X coordinate (in the base asset) where the layer's center should be placed.",
            examples: ["200", "bw_mul_0.4", "bw_sub_cw"],
          },
          {
            label: "Layer Center Y",
            name: "lyc",
            fieldType: "input",
            isTransformation: true,
            transformationGroup: "canvasLayer",
            helpText:
              "Y coordinate (in the base asset) where the layer's center should be placed.",
            examples: ["150", "bh_mul_0.4", "bh_sub_ch"],
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

export const transformationSchema: TransformationSchema[] =
  baseTransformationSchema.map((category) => ({
    ...category,
    items: [...category.items].sort((a, b) => a.name.localeCompare(b.name)),
  }))

export const transformationFormatters: Record<
  string,
  (
    groupValues: Record<string, unknown>,
    transforms: Record<string, unknown>,
  ) => void
> = {
  background: (values, transforms) => {
    let {
      backgroundType,
      backgroundBlurIntensity,
      backgroundBlurBrightness,
      backgroundDominantAuto,
      backgroundGradientAutoDominant,
      backgroundGradientMode,
      backgroundGradientPaletteSize,
      backgroundGradient,
    } = values as Record<string, string | boolean | GradientPickerState>

    if ((backgroundBlurBrightness as string)?.startsWith?.("-")) {
      backgroundBlurBrightness = (backgroundBlurBrightness as string).replace(
        "-",
        "N",
      )
    }

    if (backgroundType === "color") {
      if (backgroundDominantAuto) {
        transforms.background = "dominant"
      } else if (values.background) {
        transforms.background = (values.background as string).replace("#", "")
      }
    } else if (backgroundType === "gradient") {
      if (backgroundGradientAutoDominant) {
        // Use gradient with dominant color detection
        const paletteSize = backgroundGradientPaletteSize || "2"
        const mode = backgroundGradientMode || "dominant"
        transforms.background = `gradient_${mode}_${paletteSize}`
      } else if (backgroundGradient) {
        // Manual gradient using full layer syntax approach
        const gradient = backgroundGradient as GradientPickerState
        const { from, to, direction, stopPoint } = gradient

        // Build the gradient parameters
        const fromColor = from?.replace("#", "") || "FFFFFF"
        const toColor = to?.replace("#", "") || "000000"
        const gradientDirection = direction || "bottom"
        const stopPointDecimal = gradientStopPointToDecimalExpr(stopPoint)

        // Create the full layer syntax with placeholder for image path
        // This will be replaced with actual image path in the store per image
        transforms.raw = `e-gradient-ld-${gradientDirection}_from-${fromColor}_to-${toColor}_sp-${stopPointDecimal}:l-image,i-__IMAGE_PATH__,t-false,l-end`
      }
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
    const {
      focus,
      focusAnchor,
      focusObject,
      x,
      y,
      xc,
      yc,
      coordinateMethod,
      zoom,
    } = values

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
      if (coordinateMethod === "topleft") {
        if (x) transforms.x = x
        if (y) transforms.y = y
      } else if (coordinateMethod === "center") {
        if (xc) transforms.xc = xc
        if (yc) transforms.yc = yc
      }
    }
    if (
      zoom !== undefined &&
      zoom !== null &&
      !Number.isNaN(Number(zoom)) &&
      zoom !== 0
    ) {
      transforms.zoom = (zoom as number) / 100
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
      shadowOffsetX !== "" &&
      typeof shadowOffsetX === "number"
    ) {
      const offsetX = Number(shadowOffsetX)
      if (!Number.isNaN(offsetX) && offsetX < 0) {
        params.push(`x-N${Math.abs(offsetX)}`)
      } else {
        params.push(`x-${offsetX}`)
      }
    }
    // Vertical offset; negative values should include N prefix as part of the value
    if (
      shadowOffsetY !== undefined &&
      shadowOffsetY !== null &&
      shadowOffsetY !== "" &&
      typeof shadowOffsetY === "number"
    ) {
      const offsetY = Number(shadowOffsetY)
      if (!Number.isNaN(offsetY) && offsetY < 0) {
        params.push(`y-N${Math.abs(offsetY)}`)
      } else {
        params.push(`y-${offsetY}`)
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
    const children = Array.isArray((values as any).children)
      ? ((values as any).children as NestedLayer[])
      : []
    const lfo = (values as any).lfo
    const hasLfo = typeof lfo === "string" && lfo.trim() !== ""
    if (children.length > 0 || hasLfo) {
      const os = (values as any).opacitySwitch
      const opacityEnabled =
        os !== false &&
        typeof (values as any).opacity === "number" &&
        (values as any).opacity >= 1 &&
        (values as any).opacity <= 9 &&
        (os === true || os === undefined)
      const rs = (values as any).radiusSwitch
      const r = (values as any).radius
      const radiusEnabled =
        rs === true ||
        (rs === undefined &&
          r !== undefined &&
          r !== "" &&
          (r === "max" || (typeof r === "number" && r > 0)))
      const paddingValue = (values as any).padding as
        | { mode?: string; padding?: unknown }
        | undefined
      let paddingString: string | undefined
      if (paddingValue?.mode === "uniform") {
        const p = paddingValue.padding
        if ((typeof p === "number" || typeof p === "string") && p !== "") {
          paddingString = String(p)
        }
      } else if (paddingValue?.mode === "individual" && paddingValue.padding) {
        const { top, right, bottom, left } = paddingValue.padding as any
        if (
          [top, right, bottom, left].every(
            (n) => typeof n === "number" && Number.isFinite(n),
          )
        ) {
          if (top === right && top === bottom && top === left) {
            paddingString = String(top)
          } else if (top === bottom && right === left) {
            paddingString = `${top}_${right}`
          } else {
            paddingString = `${top}_${right}_${bottom}_${left}`
          }
        }
      }

      transforms.raw = buildLayerRawString({
        layer: {
          type: "text",
          text: String((values as any).text ?? ""),
          width: (values as any).width as any,
          fontSize: (values as any).fontSize as any,
          fontFamily: (values as any).fontFamily as any,
          color: (values as any).color as any,
          typography: (values as any).typography as any,
          backgroundColor: (values as any).backgroundColor as any,
          padding: paddingString,
          radius: radiusEnabled ? (r as any) : undefined,
          opacity: opacityEnabled
            ? ((values as any).opacity as number)
            : undefined,
          position: hasLfo
            ? { mode: "lfo", lfo: String(lfo).trim() }
            : (values as any).positionX || (values as any).positionY
              ? {
                  mode: "topLeft",
                  lx: String((values as any).positionX ?? ""),
                  ly: String((values as any).positionY ?? ""),
                }
              : { mode: "none" },
        },
        children,
      })
      return
    }

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
    if (values.padding && typeof values.padding === "object") {
      const { padding, mode } = values.padding as Record<string, unknown>
      if (
        mode === "uniform" &&
        (typeof padding === "number" || typeof padding === "string") &&
        padding !== ""
      ) {
        overlayTransform.padding = padding
      } else if (
        mode === "individual" &&
        typeof padding === "object" &&
        padding !== null
      ) {
        const { top, right, bottom, left } = padding as {
          top: number
          right: number
          bottom: number
          left: number
        }
        let paddingString: string
        if (top === right && top === bottom && top === left) {
          paddingString = String(top)
        } else if (top === bottom && right === left) {
          paddingString = `${top}_${right}`
        } else {
          paddingString = `${top}_${right}_${bottom}_${left}`
        }
        overlayTransform.padding = paddingString
      }
    }
    if (
      typeof values.lineHeight === "number" ||
      typeof values.lineHeight === "string"
    ) {
      overlayTransform.lineHeight = values.lineHeight
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

    if (typeof values.rotation === "number") {
      if (values.rotation !== 0) {
        overlayTransform.rotation =
          values.rotation < 0
            ? `N${Math.abs(values.rotation)}`
            : values.rotation
      }
    } else if (typeof values.rotation === "string") {
      const t = values.rotation.trim()
      if (t !== "" && t !== "0") {
        const n = Number(t)
        if (!Number.isNaN(n) && t === String(n)) {
          if (n !== 0) {
            overlayTransform.rotation = n < 0 ? `N${Math.abs(n)}` : n
          }
        } else {
          overlayTransform.rotation = values.rotation
        }
      }
    }

    const rsSdk = (values as any).radiusSwitch
    const rSdk = (values as any).radius
    const radiusEnabledSdk =
      rsSdk === true ||
      (rsSdk === undefined &&
        rSdk !== undefined &&
        rSdk !== "" &&
        (rSdk === "max" ||
          (typeof rSdk === "number" && Number.isFinite(rSdk) && rSdk > 0)))
    if (radiusEnabledSdk) {
      if (typeof values.radius === "string" && values.radius === "max") {
        overlayTransform.radius = "max"
      } else if (typeof values.radius === "number") {
        overlayTransform.radius = values.radius
      }
    }

    const osSdk = (values as any).opacitySwitch
    const opacityEnabledSdk =
      osSdk !== false &&
      typeof values.opacity === "number" &&
      values.opacity >= 1 &&
      values.opacity <= 9 &&
      (osSdk === true || osSdk === undefined)
    if (opacityEnabledSdk) {
      overlayTransform.alpha = values.opacity as number
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
      position.x = values.positionX.toString().replace(/^-/, "N")
    }
    if (
      typeof values.positionY === "number" ||
      typeof values.positionY === "string"
    ) {
      position.y = values.positionY.toString().replace(/^-/, "N")
    }
    if (
      (values as any).lxc !== undefined &&
      (values as any).lxc !== null &&
      (values as any).lxc !== ""
    ) {
      // SDK maps this to `lxc` in URL
      position.xCenter = String((values as any).lxc).replace(/^-/, "N")
      // If xCenter is used, x should be ignored
      delete (position as any).x
    }
    if (
      (values as any).lyc !== undefined &&
      (values as any).lyc !== null &&
      (values as any).lyc !== ""
    ) {
      // SDK maps this to `lyc` in URL
      position.yCenter = String((values as any).lyc).replace(/^-/, "N")
      // If yCenter is used, y should be ignored
      delete (position as any).y
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
    const children = Array.isArray((values as any).children)
      ? ((values as any).children as NestedLayer[])
      : []
    const lfo = (values as any).lfo
    const hasLfo = typeof lfo === "string" && lfo.trim() !== ""
    if (children.length > 0 || hasLfo) {
      const opacity =
        (values as any).opacityEnabled === true &&
        (values as any).opacity !== undefined &&
        (values as any).opacity !== ""
          ? Number((values as any).opacity)
          : undefined

      transforms.raw = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: String((values as any).imageUrl ?? ""),
          width: (values as any).width as any,
          height: (values as any).height as any,
          opacity: Number.isFinite(opacity as number)
            ? (opacity as number)
            : undefined,
          backgroundColor: (values as any).backgroundColor as any,
          position: hasLfo
            ? { mode: "lfo", lfo: String(lfo).trim() }
            : (values as any).positionX || (values as any).positionY
              ? {
                  mode: "topLeft",
                  lx: String((values as any).positionX ?? ""),
                  ly: String((values as any).positionY ?? ""),
                }
              : { mode: "none" },
        },
        children,
      })
      return
    }

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

    if (values.opacityEnabled === true && values.opacity !== undefined) {
      overlayTransform.opacity = values.opacity
    }

    if (typeof values.backgroundColor === "string") {
      overlayTransform.background = values.backgroundColor.replace(/^#/, "")
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

    if (values.unsharpenMask === true) {
      overlayTransform["e-usm"] =
        `${values.unsharpenMaskRadius}-${values.unsharpenMaskSigma}-${values.unsharpenMaskAmount}-${values.unsharpenMaskThreshold}`
    }
    if (
      values.trimEnabled === true &&
      typeof values.trimThreshold === "number"
    ) {
      overlayTransform.t = values.trimThreshold
    }
    if (values.dpr && values.dprEnabled === true) {
      overlayTransform.dpr = values.dpr
    }
    if (values.qualityEnabled === true && values.quality !== undefined) {
      overlayTransform.quality = values.quality
    }

    if (values.blur) {
      overlayTransform.blur = values.blur
    }

    if (values.sharpenEnabled === true) {
      if (values.sharpen === 50) {
        overlayTransform.sharpen = ""
      } else {
        overlayTransform.sharpen = values.sharpen
      }
    }
    if (
      values.borderWidth &&
      values.borderColor &&
      typeof values.borderColor === "string"
    ) {
      overlayTransform.b = `${values.borderWidth}_${values.borderColor.replace(/^#/, "")}`
    }
    const { crop, focusAnchor } = values

    transformationFormatters.focus(values, overlayTransform)
    if (crop === "cm-pad_resize") {
      overlayTransform.focus = focusAnchor
    }

    transformationFormatters.gradient(values, overlayTransform)
    transformationFormatters.shadow(values, overlayTransform)
    transformationFormatters.distort(values, overlayTransform)
    transformationFormatters.radius(values, overlayTransform)

    if (values.grayscale) {
      overlayTransform.grayscale = true
    }

    if (Object.keys(overlayTransform).length > 0) {
      overlay.transformation = [overlayTransform]
    }

    // Positioning via x/y or focus anchor
    const position: Record<string, unknown> = {}
    if (values.positionX) {
      position.x = values.positionX.toString().replace(/^-/, "N")
    }
    if (values.positionY) {
      position.y = values.positionY.toString().replace(/^-/, "N")
    }
    if ((values as any).lxc !== undefined && (values as any).lxc !== "") {
      position.xCenter = String((values as any).lxc).replace(/^-/, "N")
      delete position.x
    }
    if ((values as any).lyc !== undefined && (values as any).lyc !== "") {
      position.yCenter = String((values as any).lyc).replace(/^-/, "N")
      delete position.y
    }

    if (Object.keys(position).length > 0) {
      overlay.position = position
    }

    // Assign overlay to transforms
    transforms.overlay = overlay
  },

  canvasLayer: (values, transforms) => {
    const children = Array.isArray((values as any).children)
      ? ((values as any).children as NestedLayer[])
      : []

    const opacityEnabled = (values as any).opacitySwitch === true
    const radiusEnabled = (values as any).radiusSwitch === true
    const gradientEnabled = (values as any).gradientSwitch === true
    const gradient = (values as any).gradient as
      | {
          from?: string
          to?: string
          direction?: string | number
          stopPoint?: string | number
        }
      | undefined

    transforms.raw = buildLayerRawString({
      layer: {
        type: "canvas",
        width: (values as any).width as any,
        height: (values as any).height as any,
        backgroundColor: (values as any).backgroundColor as any,
        opacity:
          opacityEnabled && typeof (values as any).opacity === "number"
            ? (values as any).opacity
            : undefined,
        radius: radiusEnabled ? ((values as any).radius as any) : undefined,
        gradient:
          gradientEnabled && gradient
            ? {
                direction: gradient.direction,
                from: gradient.from,
                to: gradient.to,
                stopPoint: gradient.stopPoint,
              }
            : undefined,
        position: (values as any).lfo
          ? { mode: "lfo", lfo: String((values as any).lfo) }
          : ((values as any).lxc !== undefined && (values as any).lxc !== "") ||
              ((values as any).lyc !== undefined && (values as any).lyc !== "")
            ? {
                mode: "center",
                lxc: String((values as any).lxc ?? ""),
                lyc: String((values as any).lyc ?? ""),
              }
            : (values as any).positionX || (values as any).positionY
              ? {
                  mode: "topLeft",
                  lx: String((values as any).positionX ?? ""),
                  ly: String((values as any).positionY ?? ""),
                }
              : { mode: "none" },
        children,
      },
    })
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
  trim: (values, transforms) => {
    const { trimEnabled, trim } = values as {
      trimEnabled?: boolean
      trim?: "default" | number
    }
    if (!trimEnabled) return

    // Numeric threshold 1–99
    if (typeof trim === "number") {
      const threshold = Math.trunc(trim)
      if (threshold >= 1 && threshold <= 99) {
        transforms.trim = threshold
      }
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
  colorReplace: (values, transforms) => {
    const { fromColor, toColor, tolerance } = values as {
      fromColor?: string
      toColor?: string
      tolerance?: number
    }

    // Color replace requires at least toColor
    if (!toColor || toColor === "") return

    const params: string[] = []

    // Remove # from colors if present
    const cleanToColor = (toColor as string).replace(/^#/, "")
    params.push(cleanToColor)
    if (tolerance !== undefined && tolerance !== null) {
      params.push(String(tolerance))
    }
    // Check if fromColor is provided and not empty
    if (fromColor && fromColor !== "") {
      const cleanFromColor = (fromColor as string).replace(/^#/, "")
      params.push(cleanFromColor)
    }

    transforms.cr = params.join("_")
  },
  border: (values, transforms) => {
    const { borderWidth, borderColor } = values as {
      borderWidth?: string
      borderColor?: string
    }
    if (!borderWidth || !borderColor) return
    const cleanBorderColor = borderColor.replace(/^#/, "")
    transforms.b = `${borderWidth}_${cleanBorderColor}`
  },
  sharpen: (values, transforms) => {
    const { sharpenEnabled, sharpen } = values as {
      sharpenEnabled?: boolean
      sharpen: number
    }
    if (!sharpenEnabled) return
    if (sharpen === 50) {
      transforms.sharpen = ""
    } else {
      transforms.sharpen = sharpen
    }
  },
  unsharpenMask: (values, transforms) => {
    const {
      unsharpenMaskRadius,
      unsharpenMaskSigma,
      unsharpenMaskAmount,
      unsharpenMaskThreshold,
    } = values as {
      unsharpenMaskRadius: number
      unsharpenMaskSigma: number
      unsharpenMaskAmount: number
      unsharpenMaskThreshold: number
    }
    transforms["e-usm"] =
      `${unsharpenMaskRadius}-${unsharpenMaskSigma}-${unsharpenMaskAmount}-${unsharpenMaskThreshold}`
  },
  gradient: (values, transforms) => {
    const { gradient, gradientSwitch } = values as {
      gradient: GradientPickerState
      gradientSwitch: boolean
    }
    if (gradientSwitch && gradient) {
      const { from, to, direction, stopPoint } = gradient
      const stopPointIs100 =
        stopPoint === 100 ||
        (typeof stopPoint === "string" && stopPoint.trim() === "100")
      const isDefaultGradient =
        (from.toUpperCase() === "#FFFFFFFF" ||
          from.toUpperCase() === "#FFFFFF") &&
        to.toUpperCase() === "#00000000" &&
        (direction === "bottom" || direction === 180) &&
        stopPointIs100
      if (isDefaultGradient) {
        transforms.gradient = ""
      } else {
        const fromColor = from.replace("#", "")
        const toColor = to.replace("#", "")
        const stopPointDecimal = gradientStopPointToDecimalExpr(stopPoint)
        const gradientStr = `ld-${direction}_from-${fromColor}_to-${toColor}_sp-${stopPointDecimal}`
        transforms.gradient = gradientStr
      }
    }
  },
  distort: (values, transforms) => {
    if (values.distort) {
      const { distortType, distortPerspective, distortArcDegree } = values
      const distortPrefix = distortType === "perspective" ? "p" : "a"
      if (distortType === "perspective" && distortPerspective) {
        const { x1, y1, x2, y2, x3, y3, x4, y4 } = distortPerspective as Record<
          string,
          string
        >
        const formattedCoords = [x1, y1, x2, y2, x3, y3, x4, y4].map((coord) =>
          coord.toString().replace(/^-/, "N"),
        )
        transforms["e-distort"] =
          `${distortPrefix}-${formattedCoords.join("_")}`
      } else if (
        distortType === "arc" &&
        distortArcDegree !== undefined &&
        distortArcDegree !== null
      ) {
        transforms["e-distort"] =
          `${distortPrefix}-${distortArcDegree.toString().replace(/^-/, "N")}`
      }
    }
  },
  radius: (values, transforms) => {
    if (values.radius) {
      const { radius, mode } = values.radius as Record<string, unknown>
      if (
        mode === "uniform" &&
        (typeof radius === "number" || typeof radius === "string")
      ) {
        transforms.radius = radius
      } else if (
        mode === "individual" &&
        typeof radius === "object" &&
        radius !== null
      ) {
        const { topLeft, topRight, bottomRight, bottomLeft } = radius as {
          topLeft: number | "max"
          topRight: number | "max"
          bottomRight: number | "max"
          bottomLeft: number | "max"
        }
        if (
          topLeft === topRight &&
          topLeft === bottomRight &&
          topLeft === bottomLeft
        ) {
          transforms.radius = topLeft
        } else {
          transforms.radius = `${topLeft}_${topRight}_${bottomRight}_${bottomLeft}`
        }
      }
    }
  },
}

function validatePerspectiveDistort(
  value: {
    distortPerspective?: PerspectiveObject
    distort?: boolean
    distortType?: string
  } & Record<string, unknown>,
  ctx: RefinementCtx,
) {
  const { distort, distortType } = value

  // If distort is not enabled, skip all additional validation
  if (!distort) {
    return
  }

  // Perspective distortion: require all coordinates and ensure they are valid
  if (distortType === "perspective") {
    const distortPerspective = value.distortPerspective as
      | PerspectiveObject
      | undefined

    if (!distortPerspective) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Perspective coordinates are required.",
        path: ["distortPerspective"],
      })
      return
    }

    const entries = Object.entries(
      distortPerspective as Record<string, unknown>,
    )

    const allNonEmpty = entries.every(([, v]) => v !== "" && v != null)

    if (!allNonEmpty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All perspective coordinates are required.",
        path: ["distortPerspective"],
      })
      return
    }

    const coords = entries.reduce(
      (acc, [key, raw]) => {
        const numString = String(raw).toUpperCase().replace(/^N/, "-")
        const parsed = Number.parseInt(numString, 10)

        if (!Number.isFinite(parsed)) {
          acc.__invalid = true
          return acc
        }

        ;(acc as Record<string, number>)[key] = parsed
        return acc
      },
      {} as Record<string, number> & { __invalid?: boolean },
    )

    if (coords.__invalid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Perspective coordinates must be valid integers.",
        path: ["distortPerspective"],
      })
      return
    }

    const { x1, y1, x2, y2, x3, y3, x4, y4 } = coords as unknown as Record<
      keyof PerspectiveObject,
      number
    >

    const isTopLeftValid = x1 < x2 && x1 < x3 && y1 < y3 && y1 < y4
    const isTopRightValid = x2 > x1 && x2 > x4 && y2 < y3 && y2 < y4
    const isBottomRightValid = x3 > x4 && x3 > x1 && y3 > y1 && y3 > y2
    const isBottomLeftValid = x4 < x3 && x4 < x2 && y4 > y1 && y4 > y2

    const isValid =
      isTopLeftValid &&
      isTopRightValid &&
      isBottomRightValid &&
      isBottomLeftValid

    if (!isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Perspective coordinates are invalid.",
        path: ["distortPerspective"],
      })
    }
  }

  // Arc distortion: require a non-zero degree value
  if (distortType === "arc") {
    const rawDegree = (value as Record<string, unknown>).distortArcDegree

    if (rawDegree === undefined || rawDegree === null || rawDegree === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Arc degree is required.",
        path: ["distortArcDegree"],
      })
      return
    }

    const numString = String(rawDegree).toUpperCase().replace(/^N/, "-")
    const degree = Number.parseInt(numString, 10)

    if (!Number.isFinite(degree) || degree === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Arc degree must be a non-zero value.",
        path: ["distortArcDegree"],
      })
    }
  }
}
