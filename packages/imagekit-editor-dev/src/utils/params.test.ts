import { describe, expect, it } from "vitest"
import type { Transformation } from "../store"
import {
  extractInlineVariables,
  getTemplateParams,
  isVariableNameUnique,
  resolveTemplateParams,
  validateVariableName,
} from "./params"

describe("validateVariableName", () => {
  it("accepts valid names", () => {
    expect(validateVariableName("hero_blur").valid).toBe(true)
    expect(validateVariableName("x").valid).toBe(true)
    expect(validateVariableName("bgColor1").valid).toBe(true)
    expect(validateVariableName("A_B_C").valid).toBe(true)
  })

  it("rejects empty string", () => {
    const result = validateVariableName("")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("required")
  })

  it("rejects names starting with a number", () => {
    const result = validateVariableName("1blur")
    expect(result.valid).toBe(false)
    expect(result.error).toContain("start with a letter")
  })

  it("rejects names with spaces", () => {
    const result = validateVariableName("hero blur")
    expect(result.valid).toBe(false)
  })

  it("rejects names with dashes", () => {
    const result = validateVariableName("hero-blur")
    expect(result.valid).toBe(false)
  })

  it("rejects names with special characters", () => {
    expect(validateVariableName("hero@blur").valid).toBe(false)
    expect(validateVariableName("hero.blur").valid).toBe(false)
    expect(validateVariableName("hero$blur").valid).toBe(false)
  })

  it("rejects names exceeding 40 characters", () => {
    const longName = "a".repeat(41)
    const result = validateVariableName(longName)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("40 characters")
  })

  it("accepts names exactly 40 characters", () => {
    const name = "a".repeat(40)
    expect(validateVariableName(name).valid).toBe(true)
  })
})

describe("isVariableNameUnique", () => {
  const transformations: Transformation[] = [
    {
      id: "t1",
      key: "adjust-shadow",
      name: "Shadow",
      type: "transformation",
      value: { shadow: true, shadowBlur: 10 },
      params: { shadowBlur: "hero_blur" },
    },
    {
      id: "t2",
      key: "adjust-background",
      name: "Background",
      type: "transformation",
      value: { background: "#FFF" },
      params: { background: "brand_color" },
    },
  ]

  it("returns true for an unused name", () => {
    expect(
      isVariableNameUnique("new_var", "t1", "shadow", transformations),
    ).toBe(true)
  })

  it("returns false when name is already used by another field", () => {
    expect(
      isVariableNameUnique("hero_blur", "t2", "background", transformations),
    ).toBe(false)
  })

  it("returns true when re-saving the same binding", () => {
    expect(
      isVariableNameUnique("hero_blur", "t1", "shadowBlur", transformations),
    ).toBe(true)
  })

  it("handles transformations without params", () => {
    const noParams: Transformation[] = [
      {
        id: "t3",
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 5 },
      },
    ]
    expect(isVariableNameUnique("any_name", "t3", "blur", noParams)).toBe(true)
  })
})

describe("getTemplateParams", () => {
  it("returns empty array for templates without params", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 5 },
      },
    ]
    expect(getTemplateParams(template)).toEqual([])
  })

  it("extracts all bindings from parameterized template", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "adjust-shadow",
        name: "Shadow",
        type: "transformation",
        value: { shadow: true, shadowBlur: 10, shadowOffsetX: 2 },
        params: { shadowBlur: "blur_val", shadowOffsetX: "offset_x" },
      },
    ]
    const result = getTemplateParams(template)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      variableName: "blur_val",
      fieldName: "shadowBlur",
      transformationKey: "adjust-shadow",
      transformationName: "Shadow",
      defaultValue: 10,
    })
  })
})

describe("resolveTemplateParams", () => {
  const template: Omit<Transformation, "id">[] = [
    {
      key: "adjust-shadow",
      name: "Shadow",
      type: "transformation",
      value: { shadow: true, shadowBlur: 10, shadowOffsetX: 2 },
      params: { shadowBlur: "blur_val" },
    },
    {
      key: "adjust-blur",
      name: "Blur",
      type: "transformation",
      value: { blur: 5 },
    },
  ]

  it("overrides parameterized field values", () => {
    const resolved = resolveTemplateParams(template, { blur_val: 25 })
    expect((resolved[0].value as Record<string, unknown>).shadowBlur).toBe(25)
  })

  it("keeps default when no override provided", () => {
    const resolved = resolveTemplateParams(template, {})
    expect((resolved[0].value as Record<string, unknown>).shadowBlur).toBe(10)
  })

  it("does not touch transformations without params", () => {
    const resolved = resolveTemplateParams(template, { blur_val: 25 })
    expect(resolved[1]).toBe(template[1]) // same reference — untouched
  })

  it("does not mutate original template", () => {
    const orig = JSON.parse(JSON.stringify(template))
    resolveTemplateParams(template, { blur_val: 99 })
    expect(template).toEqual(orig)
  })
})

describe("extractInlineVariables", () => {
  it("returns empty array for plain strings", () => {
    expect(extractInlineVariables("hello world")).toEqual([])
    expect(extractInlineVariables("")).toEqual([])
  })

  it("extracts a single variable", () => {
    expect(extractInlineVariables("{{discount}}% off")).toEqual(["discount"])
  })

  it("extracts multiple distinct variables in order", () => {
    expect(extractInlineVariables("Hi {{name}}, save {{discount}}%")).toEqual([
      "name",
      "discount",
    ])
  })

  it("deduplicates repeated variables", () => {
    expect(extractInlineVariables("{{x}} and {{y}} and {{x}} again")).toEqual([
      "x",
      "y",
    ])
  })

  it("ignores invalid marker shapes", () => {
    // Single braces, leading digit, dashes, etc. — all rejected
    expect(extractInlineVariables("{not_a_var} {{1bad}} {{has-dash}}")).toEqual(
      [],
    )
  })

  it("can be called repeatedly without sharing state", () => {
    expect(extractInlineVariables("{{a}}")).toEqual(["a"])
    expect(extractInlineVariables("{{b}}")).toEqual(["b"])
    expect(extractInlineVariables("{{a}}")).toEqual(["a"])
  })
})

describe("getTemplateParams — inline variables", () => {
  it("extracts inline variables from string field values", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "transformation-text_layer",
        name: "Text Layer",
        type: "transformation",
        value: { text: "{{discount}}% off — buy now {{cta}}" },
      },
    ]
    const result = getTemplateParams(template)
    expect(result).toEqual([
      {
        variableName: "discount",
        fieldName: "text",
        transformationKey: "transformation-text_layer",
        transformationName: "Text Layer",
        inline: true,
      },
      {
        variableName: "cta",
        fieldName: "text",
        transformationKey: "transformation-text_layer",
        transformationName: "Text Layer",
        inline: true,
      },
    ])
  })

  it("returns both whole-field and inline bindings", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "transformation-text_layer",
        name: "Text Layer",
        type: "transformation",
        value: { text: "Hi {{name}}", color: "#000" },
        params: { color: "brand_color" },
      },
    ]
    const result = getTemplateParams(template)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      variableName: "brand_color",
      fieldName: "color",
      defaultValue: "#000",
    })
    expect(result[0].inline).toBeUndefined()
    expect(result[1]).toMatchObject({
      variableName: "name",
      fieldName: "text",
      inline: true,
    })
  })

  it("does not double-count: whole-field binding wins over inline", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "transformation-text_layer",
        name: "Text Layer",
        type: "transformation",
        // The string contains a marker AND the field is whole-field bound;
        // we should only emit the whole-field binding.
        value: { text: "{{discount}}% off" },
        params: { text: "headline" },
      },
    ]
    const result = getTemplateParams(template)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      variableName: "headline",
      fieldName: "text",
      defaultValue: "{{discount}}% off",
    })
  })

  it("ignores non-string fields", () => {
    const template: Omit<Transformation, "id">[] = [
      {
        key: "adjust-blur",
        name: "Blur",
        type: "transformation",
        value: { blur: 5, label: "ignored" },
      },
    ]
    expect(getTemplateParams(template)).toEqual([])
  })
})

describe("resolveTemplateParams — inline variables", () => {
  const template: Omit<Transformation, "id">[] = [
    {
      key: "transformation-text_layer",
      name: "Text Layer",
      type: "transformation",
      value: { text: "{{discount}}% off, {{name}}!" },
    },
  ]

  it("substitutes inline markers with overrides", () => {
    const resolved = resolveTemplateParams(template, {
      discount: 25,
      name: "Alice",
    })
    expect((resolved[0].value as Record<string, unknown>).text).toBe(
      "25% off, Alice!",
    )
  })

  it("leaves unresolved markers intact", () => {
    const resolved = resolveTemplateParams(template, { discount: 10 })
    expect((resolved[0].value as Record<string, unknown>).text).toBe(
      "10% off, {{name}}!",
    )
  })

  it("returns the same reference when nothing to substitute", () => {
    const resolved = resolveTemplateParams(template, {})
    expect(resolved[0]).toBe(template[0])
  })

  it("substitutes null/undefined overrides as empty string", () => {
    const resolved = resolveTemplateParams(template, {
      discount: null,
      name: undefined,
    })
    expect((resolved[0].value as Record<string, unknown>).text).toBe("% off, !")
  })

  it("does not mutate original template", () => {
    const orig = JSON.parse(JSON.stringify(template))
    resolveTemplateParams(template, { discount: 99, name: "Bob" })
    expect(template).toEqual(orig)
  })

  it("whole-field binding fully owns the field — no inline substitution applied", () => {
    const tpl: Omit<Transformation, "id">[] = [
      {
        key: "transformation-text_layer",
        name: "Text Layer",
        type: "transformation",
        value: { text: "{{discount}}% off" },
        params: { text: "headline" },
      },
    ]
    const resolved = resolveTemplateParams(tpl, {
      headline: "Black Friday Sale",
      discount: 50,
    })
    expect((resolved[0].value as Record<string, unknown>).text).toBe(
      "Black Friday Sale",
    )
  })

  it("supports inline substitution alongside other transformations' whole-field bindings", () => {
    const tpl: Omit<Transformation, "id">[] = [
      {
        key: "adjust-shadow",
        name: "Shadow",
        type: "transformation",
        value: { shadow: true, shadowBlur: 10 },
        params: { shadowBlur: "blur_val" },
      },
      {
        key: "transformation-text_layer",
        name: "Text Layer",
        type: "transformation",
        value: { text: "Hi {{name}}" },
      },
    ]
    const resolved = resolveTemplateParams(tpl, {
      blur_val: 25,
      name: "Eve",
    })
    expect((resolved[0].value as Record<string, unknown>).shadowBlur).toBe(25)
    expect((resolved[1].value as Record<string, unknown>).text).toBe("Hi Eve")
  })
})
