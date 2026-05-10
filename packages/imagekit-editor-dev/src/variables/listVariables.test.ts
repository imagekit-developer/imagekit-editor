import { describe, expect, it } from "vitest"
import type { Transformation } from "../store"
import { buildVariablesSchema, listVariables } from "./listVariables"

/**
 * These tests mirror how a host actually consumes `buildVariablesSchema`:
 * they start from a `transformations` array shaped exactly like what
 * `editorRef.current?.getTemplate()` returns (or what the host gets back
 * from its storage layer after a save+reload round-trip), then run the
 * documented `safeParse` flow on a candidate overrides row.
 *
 * Persisted templates routinely have `id === undefined` on each step (the
 * host strips runtime ids before persisting), so the fixtures here omit
 * `id` to match the real-world shape.
 */

// Cast helper so fixtures look like the JSON a host actually receives —
// no synthetic ids, no editor-internal fields. The cast is intentional:
// `Transformation` requires `id` and `type` for in-editor state, but the
// public contract for `buildVariablesSchema` accepts the persisted shape.
const asTemplate = (t: object[]): Transformation[] => t as Transformation[]

describe("buildVariablesSchema (host usage)", () => {
  it("validates a CSV-style row of overrides against the template", () => {
    // What a host sees after `getTemplate(id)` / `editorRef.getTemplate()`.
    const template = {
      transformations: asTemplate([
        {
          key: "layers-text",
          name: "Text Layer",
          type: "transformation",
          value: {
            text: { $var: "headline", label: "Headline" },
            typography: [{ $var: "fontStyle", label: "Font Style" }],
          },
        },
      ]),
    }

    // Documented host flow:
    const schema = buildVariablesSchema(template.transformations)

    // A well-formed row → success, with typed `data`.
    const ok = schema.safeParse({
      headline: "Sale ends today",
      fontStyle: ["bold", "italic"],
    })
    expect(ok.success).toBe(true)

    // A row with a value violating the field's Zod type → failure.
    const bad = schema.safeParse({
      headline: "Sale ends today",
      fontStyle: ["galat bat"], // not in z.enum(["bold","italic"])
    })
    expect(bad.success).toBe(false)
  })

  it("resolves variables against the correct step when steps share neither id nor position 0", () => {
    // Regression: the previous id-based lookup collapsed to the first step
    // in the array whenever ids were absent. Putting a non-layer step
    // first proves variables in a later step still find the right schema.
    const template = {
      transformations: asTemplate([
        {
          key: "resize-and-crop",
          name: "Resize",
          type: "transformation",
          value: {},
        },
        {
          key: "layers-text",
          name: "Text Layer",
          type: "transformation",
          value: {
            typography: [{ $var: "fontStyle", label: "Font Style" }],
          },
        },
      ]),
    }

    const schema = buildVariablesSchema(template.transformations)

    expect(schema.safeParse({ fontStyle: ["bold"] }).success).toBe(true)
    expect(schema.safeParse({ fontStyle: ["galat bat"] }).success).toBe(false)
  })

  it("listVariables returns descriptors a host can use to build CSV columns", () => {
    const template = {
      transformations: asTemplate([
        {
          key: "layers-text",
          name: "Text Layer",
          type: "transformation",
          value: {
            text: { $var: "headline", label: "Headline" },
          },
        },
      ]),
    }

    const variables = listVariables(template.transformations)
    expect(variables).toHaveLength(1)
    expect(variables[0].name).toBe("headline")
    expect(variables[0].label).toBe("Headline")
    expect(variables[0].fieldName).toBe("text")
    // `field` carries the editor's TransformationField so the host can
    // render the right override input.
    expect(variables[0].field.name).toBe("text")
  })

  it("omits unresolved variables from the schema rather than collapsing to z.unknown", () => {
    const template = {
      transformations: asTemplate([
        {
          key: "layers-text",
          name: "Text Layer",
          type: "transformation",
          value: {
            // Field name not declared on layers-text — host shouldn't be
            // able to silently push a value through.
            nonExistentField: { $var: "ghost", label: "Ghost" },
          },
        },
      ]),
    }
    const schema = buildVariablesSchema(template.transformations)
    expect(Object.keys(schema.shape)).toEqual([])
  })
})
