import { z } from "zod/v3"

const IMG_VAR_CODE_REGEX = "(?:iw|ih|iar|cw|ch|car|bw|bh|bar)"
const IMG_OR_NUMBER_OPERAND_REGEX = `(?:\\d+(?:\\.\\d{1,2})?|${IMG_VAR_CODE_REGEX})`
const IMG_VAR_CHAIN_EXPR_REGEX = `^${IMG_VAR_CODE_REGEX}(?:_(?:add|sub|mul|div|mod|pow)_${IMG_OR_NUMBER_OPERAND_REGEX})+$`

const widthNumber = z.coerce
  .number({ invalid_type_error: "Should be a number." })
  .min(0, {
    message: "Width must be a positive number.",
  })

const widthExpr = z.string().regex(new RegExp(IMG_VAR_CHAIN_EXPR_REGEX), {
  message: "Width string must be a valid expression string.",
})

const widthVar = z.string().regex(new RegExp(`^${IMG_VAR_CODE_REGEX}$`), {
  message: "Width must be a valid image variable.",
})

export const widthValidator = z.any().superRefine((val, ctx) => {
  if (widthNumber.safeParse(val).success) {
    return
  }
  if (widthVar.safeParse(val).success) {
    return
  }
  if (widthExpr.safeParse(val).success) {
    return
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Width must be a positive number or a valid expression string.",
  })
})

const heightNumber = z.coerce
  .number({ invalid_type_error: "Should be a number." })
  .min(0, {
    message: "Height must be a positive number.",
  })
const heightExpr = z.string().regex(new RegExp(IMG_VAR_CHAIN_EXPR_REGEX), {
  message: "Height string must be a valid expression string.",
})

const heightVar = z.string().regex(new RegExp(`^${IMG_VAR_CODE_REGEX}$`), {
  message: "Height must be a valid image variable.",
})

export const heightValidator = z.any().superRefine((val, ctx) => {
  if (heightNumber.safeParse(val).success) {
    return
  }
  if (heightVar.safeParse(val).success) {
    return
  }
  if (heightExpr.safeParse(val).success) {
    return
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Height must be a positive number or a valid expression string.",
  })
})

export const colorValidator = z
  .string()
  .regex(/^#?(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/, {
    message: "Enter a valid hex colour code.",
  })

const aspectRatioValueValidator = z
  .string()
  .regex(/^\d+(\.\d{1,2})?-\d+(\.\d{1,2})?$/)

const aspectRatioExpressionValidator = z
  .string()
  .regex(
    new RegExp(
      `^(?:iar|car)(?:_(?:add|sub|mul|div|mod|pow)_${IMG_OR_NUMBER_OPERAND_REGEX})+$`,
    ),
  )

export const aspectRatioValidator = z.any().superRefine((val, ctx) => {
  if (val === undefined || val === "") return
  if (aspectRatioValueValidator.safeParse(val).success) {
    return
  }
  if (aspectRatioExpressionValidator.safeParse(val).success) {
    return
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Aspect ratio must be a valid value or expression string.",
  })
})

const layerXNumber = z.coerce.string().regex(/^[N-]?\d+(\.\d{1,2})?$/)

const layerXExpr = z.string().regex(new RegExp(IMG_VAR_CHAIN_EXPR_REGEX))

export const layerXValidator = z.any().superRefine((val, ctx) => {
  if (val === undefined || val === "") return
  if (layerXNumber.safeParse(val).success) {
    return
  }
  if (layerXExpr.safeParse(val).success) {
    return
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Layer X must be a number or a valid expression string.",
  })
})

const layerYNumber = z.coerce.string().regex(/^[N-]?\d+(\.\d{1,2})?$/)

const layerYExpr = z.string().regex(new RegExp(IMG_VAR_CHAIN_EXPR_REGEX))

export const layerYValidator = z.any().superRefine((val, ctx) => {
  if (val === undefined || val === "") return
  if (layerYNumber.safeParse(val).success) {
    return
  }
  if (layerYExpr.safeParse(val).success) {
    return
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Layer Y must be a number or a valid expression string.",
  })
})

const commonNumber = z.coerce
  .number({ invalid_type_error: "Should be a number." })
  .min(0, {
    message: "Must be a positive number.",
  })
const commonExpr = z.string().regex(new RegExp(IMG_VAR_CHAIN_EXPR_REGEX), {
  message: "String must be a valid expression string.",
})

export const commonNumberAndExpressionValidator = z
  .any()
  .superRefine((val, ctx) => {
    if (commonNumber.safeParse(val).success) {
      return
    }
    if (commonExpr.safeParse(val).success) {
      return
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Must be a positive number or a valid expression string.",
    })
  })

const lineHeightInteger = z.coerce.string().regex(/^\d+$/)

const lineHeightExpr = z.string().regex(new RegExp(IMG_VAR_CHAIN_EXPR_REGEX))

export const lineHeightValidator = z.any().superRefine((val, ctx) => {
  if (val === undefined || val === "") return
  if (lineHeightInteger.safeParse(val).success) {
    return
  }
  if (lineHeightExpr.safeParse(val).success) {
    return
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message:
      "Line height must be a positive integer or a valid expression string.",
  })
})

export const optionalPositiveFloatNumberValidator = z.preprocess(
  (val) => (val === "" || val === undefined || val === null ? undefined : val),
  z.coerce
    .number()
    .positive({ message: "Should be a positive floating point number." })
    .optional(),
)

export const refineUnsharpenMask = (
  val: {
    unsharpenMask?: boolean
    unsharpenMaskRadius?: number
    unsharpenMaskSigma?: number
    unsharpenMaskAmount?: number
    unsharpenMaskThreshold?: number
  },
  ctx: z.RefinementCtx,
) => {
  if (val.unsharpenMask === true) {
    if (!val.unsharpenMaskRadius) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Radius is required when Unsharpen Mask is enabled",
        path: ["unsharpenMaskRadius"],
      })
    }
    if (!val.unsharpenMaskSigma) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sigma is required when Unsharpen Mask is enabled",
        path: ["unsharpenMaskSigma"],
      })
    }
    if (!val.unsharpenMaskAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount is required when Unsharpen Mask is enabled",
        path: ["unsharpenMaskAmount"],
      })
    }
    if (!val.unsharpenMaskThreshold) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Threshold is required when Unsharpen Mask is enabled",
        path: ["unsharpenMaskThreshold"],
      })
    }
  }
}
