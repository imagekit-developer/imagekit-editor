import { z } from "zod/v3"

const widthNumber = z.coerce.number().min(0, {
  message: "Width must be a positive number",
})

const widthExpr = z
  .string()
  .regex(/^(?:iw|bw|cw)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/, {
    message: "Width string must be a valid expression string",
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
    message: "Width must be a positive number or a valid expression string",
  })
})

const heightNumber = z.coerce.number().min(0, {
  message: "Height must be a positive number",
})
const heightExpr = z
  .string()
  .regex(/^(?:ih|bh|ch)_(?:add|sub|mul|div|mod|pow)_(?:\d+(\.\d{1,2})?)$/, {
    message: "Height string must be a valid expression string",
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
    message: "Height must be a positive number or a valid expression string",
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
    message: "Aspect ratio must be a valid value or expression string",
  })
})

const layerXNumber = z.coerce.number().min(0, {
  message: "Layer X must be a positive number",
})

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
    message: "Layer X must be a positive number or a valid expression string",
  })
})

const layerYNumber = z.coerce.number().min(0, {
  message: "Layer Y must be a positive number",
})

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
    message: "Layer Y must be a positive number or a valid expression string",
  })
})
