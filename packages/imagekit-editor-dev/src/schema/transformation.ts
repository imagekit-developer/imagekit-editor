import { z } from "zod/v3"

const widthNumber = z.coerce.number().min(0, {
  message: "Width must be a positive number",
})

const widthExpr = z
  .string()
  .regex(/^(?:iw|bw|cw)_(?:add|sub|mul|div|mod|pow)_\d+$/, {
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
  .regex(/^(?:ih|bh|ch)_(?:add|sub|mul|div|mod|pow)_\d+$/, {
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
  .regex(/^#?[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$/, {
    message: "Color must be a valid hex color code",
  })
