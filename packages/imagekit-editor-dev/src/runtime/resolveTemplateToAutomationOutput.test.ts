import { buildSrc, buildTransformationString } from "@imagekit/javascript"
import { describe, expect, it } from "vitest"
import type { TemplateRecord } from "../storage/types"
import type { Transformation } from "../store"
import { extractImagePath } from "../utils"
import { resolveTemplateToAutomationOutput } from "./resolveTemplateToAutomationOutput"

function tplStep(
  key: string,
  value: Record<string, unknown>,
): Omit<Transformation, "id"> & { id?: never } {
  return {
    key,
    name: "Test",
    type: "transformation",
    value,
    version: "v1",
  }
}

function templateRecord(
  partial: Partial<TemplateRecord> & Pick<TemplateRecord, "transformations">,
): TemplateRecord {
  return {
    id: "t",
    clientNumber: "demo",
    isPrivate: false,
    isPinned: false,
    name: "Test Template",
    transformations: partial.transformations,
    variables: partial.variables ?? [],
    presets: partial.presets ?? [],
    createdBy: { userId: "u", name: "U", email: "u@example.com" },
    updatedBy: { userId: "u", name: "U", email: "u@example.com" },
    createdAt: 1,
    updatedAt: 2,
  }
}

describe("runtime/resolveTemplateToAutomationOutput", () => {
  it("returns ok=false when a used variable is unresolved", () => {
    const template = templateRecord({
      transformations: [
        tplStep("resize_and_crop-resize_and_crop", {
          width: "{{00000000-0000-0000-0000-0000000000aa}}",
        }),
      ],
      variables: [
        {
          id: "00000000-0000-0000-0000-0000000000aa",
          name: "w",
          defaultValue: "",
        },
      ],
      presets: [],
    })

    const res = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/folder/img.png",
      template,
      activePresetId: null,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error.type).toBe("UNRESOLVED_VARIABLES")
      expect(res.error.unresolved).toEqual([
        { id: "00000000-0000-0000-0000-0000000000aa", name: "w" },
      ])
      expect(res.error.usedVariableIds).toEqual([
        "00000000-0000-0000-0000-0000000000aa",
      ])
    }
  })

  it("applies defaults, optional preset overrides, replaces __IMAGE_PATH__, and produces deterministic url + transformationString", () => {
    const wid = "4ea5c3d5-8cb1-41e8-8b01-c496d71d175d"

    const template = templateRecord({
      transformations: [
        tplStep("resize_and_crop-resize_and_crop", {
          mode: "pad_resize",
          width: "iw_sub_{{4ea5c3d5-8cb1-41e8-8b01-c496d71d175d}}",
          height: "{{4ea5c3d5-8cb1-41e8-8b01-c496d71d175d}}",
        }),
        // Ensure we cover __IMAGE_PATH__ runtime substitution path.
        tplStep("adjust-background", {
          backgroundType: "gradient",
          backgroundGradient: {
            from: "#FFFFFFFF",
            to: "#00000000",
            direction: "bottom",
            stopPoint: 100,
          },
        }),
      ],
      variables: [{ id: wid, name: "width_2", defaultValue: "1000" }],
      presets: [{ id: "p1", name: "P1", valuesByVariableId: { [wid]: "777" } }],
    })

    const assetUrl = "https://ik.imagekit.io/demo/folder-name/img.png"

    const res = resolveTemplateToAutomationOutput({
      assetUrl,
      template,
      activePresetId: "p1",
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return

    // __IMAGE_PATH__ should be replaced (no placeholders remain).
    const imagePath = extractImagePath(assetUrl)
    const raw = res.ikTransformations.map((t) => (t as any).raw).filter(Boolean)
    expect(raw.length).toBeGreaterThanOrEqual(1)
    raw.forEach((r: string) => {
      expect(r).not.toContain("__IMAGE_PATH__")
      expect(r).toContain(`i-${imagePath}`)
    })

    // SDK determinism: these should be exactly derived from returned transformations.
    expect(res.transformationString).toBe(
      buildTransformationString(res.ikTransformations),
    )
    expect(res.finalUrl).toBe(
      buildSrc({
        src: assetUrl,
        urlEndpoint: "does-not-matter",
        transformation: res.ikTransformations,
      }),
    )

    // Also ensure preset override took effect somewhere in the pipeline (string substitution).
    // At minimum, the transformation string should contain "777".
    expect(res.transformationString).toContain("777")
  })

  it("treats empty preset overrides as absent (falls back to default)", () => {
    const id = "00000000-0000-0000-0000-0000000000aa"
    const template = templateRecord({
      transformations: [
        tplStep("resize_and_crop-resize_and_crop", {
          width: "{{00000000-0000-0000-0000-0000000000aa}}",
        }),
      ],
      variables: [{ id, name: "w", defaultValue: "123" }],
      presets: [{ id: "p", name: "P", valuesByVariableId: { [id]: "   " } }],
    })

    const res = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/a.png",
      template,
      activePresetId: "p",
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.transformationString).toContain("123")
  })

  it("resolves sample template variables including nested fields and expression suffixes: nested folder path", () => {
    const widthId = "4ede08f6-9169-4077-a18b-263662877787"
    const heightId = "8970b35b-a139-454b-9124-92740ae3ffce"
    const stopPointId = "5d800c3e-aee1-4c47-ac15-45c0366b22ab"

    const template = templateRecord({
      name: "Resize and Crop Template",
      transformations: [
        tplStep("adjust-background", {
          backgroundType: "gradient",
          backgroundGradient: {
            from: "#F23016FF",
            to: "#F8D624FF",
            direction: "bottom",
            stopPoint: `{{${stopPointId}}}`,
          },
        }),
        tplStep("resize_and_crop-resize_and_crop", {
          mode: "c-maintain_ratio",
          width: `{{${widthId}}}_add_100`,
          height: `{{${heightId}}}`,
        }),
      ],
      variables: [
        { id: widthId, name: "width1", defaultValue: "500" },
        { id: heightId, name: "height1", defaultValue: "750" },
        { id: stopPointId, name: "gradientStopPoint", defaultValue: "100" },
      ],
      presets: [],
    })

    const res = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/folder/img.png",
      template,
      activePresetId: null,
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return

    // Width should retain the expression suffix after substitution.
    expect(res.transformationString).toContain("500_add_100")
    expect(res.transformationString).toContain("750")

    // Nested stopPoint placeholder should be substituted as well (no placeholders/ids remain).
    expect(res.transformationString).not.toContain("{{")
    expect(res.transformationString).not.toContain(widthId)
    expect(res.transformationString).not.toContain(heightId)
    expect(res.transformationString).not.toContain(stopPointId)

    // Ensure the transformation string is deterministic.
    expect(res.transformationString).eql(
      "e-gradient-ld-bottom_from-F23016FF_to-F8D624FF_sp-1:l-image,i-folder@@img.png,t-false,l-end:c-maintain_ratio,w-500_add_100,h-750",
    )
  })

  it("resolves sample template variables including nested fields and expression suffixes: root folder path; future variables (when introduced)", () => {
    const widthId = "4ede08f6-9169-4077-a18b-263662877787"
    const heightId = "8970b35b-a139-454b-9124-92740ae3ffce"
    const stopPointId = "5d800c3e-aee1-4c47-ac15-45c0366b22ab"
    const directionId = "5d800c3e-aee1-4c47-ac15-45c0366b22ac"
    const fromColorId = "5d800c3e-aee1-4c47-ac15-45c0366b22ad"
    const toColorId = "5d800c3e-aee1-4c47-ac15-45c0366b22ae"

    const template = templateRecord({
      name: "Resize and Crop Template",
      transformations: [
        tplStep("adjust-background", {
          backgroundType: "gradient",
          backgroundGradient: {
            from: `{{${fromColorId}}}`,
            to: `{{${toColorId}}}`,
            direction: `{{${directionId}}}`,
            stopPoint: `{{${stopPointId}}}`,
          },
        }),
        tplStep("resize_and_crop-resize_and_crop", {
          mode: "c-maintain_ratio",
          width: `{{${widthId}}}_add_100`,
          height: `{{${heightId}}}`,
        }),
      ],
      variables: [
        { id: widthId, name: "width1", defaultValue: "500" },
        { id: heightId, name: "height1", defaultValue: "750" },
        { id: stopPointId, name: "gradientStopPoint", defaultValue: "100" },
        { id: directionId, name: "gradientDirection", defaultValue: "top" },
        {
          id: fromColorId,
          name: "gradientFromColor",
          defaultValue: "#F23016FF",
        },
        { id: toColorId, name: "gradientToColor", defaultValue: "#F8D624FF" },
      ],
      presets: [],
    })

    const res = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/img.png",
      template,
      activePresetId: null,
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return

    // Width should retain the expression suffix after substitution.
    expect(res.transformationString).toContain("500_add_100")
    expect(res.transformationString).toContain("750")
    expect(res.transformationString).toContain("top")
    expect(res.transformationString).toContain("F23016FF")
    expect(res.transformationString).toContain("F8D624FF")

    // Nested stopPoint placeholder should be substituted as well (no placeholders/ids remain).
    expect(res.transformationString).not.toContain("{{")
    expect(res.transformationString).not.toContain(widthId)
    expect(res.transformationString).not.toContain(heightId)
    expect(res.transformationString).not.toContain(stopPointId)
    expect(res.transformationString).not.toContain(directionId)
    expect(res.transformationString).not.toContain(fromColorId)
    expect(res.transformationString).not.toContain(toColorId)

    // Ensure the transformation string is deterministic.
    expect(res.transformationString).eql(
      "e-gradient-ld-top_from-F23016FF_to-F8D624FF_sp-1:l-image,i-img.png,t-false,l-end:c-maintain_ratio,w-500_add_100,h-750",
    )
  })
})
