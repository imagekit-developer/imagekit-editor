import { z } from "zod/v3"

const widthNumber = z.coerce
  .number({ invalid_type_error: "Should be a number." })
  .min(0, {
    message: "Width must be a positive number.",
  })

const widthExpr = z
  .string()
  .regex(/^(?:iw|bw|cw)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/, {
    message: "Width string must be a valid expression string.",
  })

export const widthValidator = z.any().superRefine((val, ctx) => {
  if (widthNumber.safeParse(val).success) {
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
const heightExpr = z
  .string()
  .regex(/^(?:ih|bh|ch)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/, {
    message: "Height string must be a valid expression string.",
  })

export const heightValidator = z.any().superRefine((val, ctx) => {
  if (heightNumber.safeParse(val).success) {
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
  .regex(/^(?:iar|car)_(?:add|sub|mul|div|mod|pow)_(\d+(\.\d{1,2})?)$/)

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

const layerXExpr = z
  .string()
  .regex(/^(?:bw|cw)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/)

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

const layerYExpr = z
  .string()
  .regex(/^(?:bh|ch)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/)

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
const commonExpr = z
  .string()
  .regex(
    /^(?:ih|bh|ch|iw|bw|cw)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/,
    {
      message: "String must be a valid expression string.",
    },
  )

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

const overlayBlockExpr = z
  .string()
  .regex(/^(?:bh|bw|bar)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/, {
    message: "String must be a valid expression string.",
  })

export const overlayBlockExprValidator = z.any().superRefine((val, ctx) => {
  if (commonNumber.safeParse(val).success) {
    return
  }
  if (overlayBlockExpr.safeParse(val).success) {
    return
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Must be a positive number or a valid expression string.",
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
