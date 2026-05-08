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
  function normalizeOverlayInput(input: string): string {
    return input.replace(/^\//, "").replaceAll("@@", "/")
  }

  function getOverlayInputs(transformations: unknown[]): string[] {
    return transformations
      .map((t) => (t as any)?.overlay?.input)
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
      .map(normalizeOverlayInput)
  }

  function getOverlayTexts(transformations: unknown[]): string[] {
    return transformations
      .map((t) => (t as any)?.overlay?.text)
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
  }

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

  it("produces the expected transformation string for a complex layers chain (pad_resize + image/canvas/image layers)", () => {
    const template = templateRecord({
      transformations: [
        tplStep("resize_and_crop-resize_and_crop", {
          mode: "cm-pad_resize",
          width: 320,
          height: 450,
          backgroundType: "color",
          backgroundDominantAuto: false,
          background: "#E0E0E0",
        }),
        tplStep("layers-image", {
          imageUrl:
            "creative_automation_hackathon@@sample_images@@female-model-2.jpg",
          width: "bw",
          height: "bh",
        }),
        tplStep("layers-canvas", {
          width: "bw",
          height: 150,
          gradientSwitch: true,
          gradient: {
            direction: "top",
            from: "#00000090",
            to: "#00000000",
            stopPoint: 60,
          },
          lfo: "bottom",
        }),
        tplStep("layers-image", {
          imageUrl:
            "creative_automation_hackathon@@sample_images@@gap_logo.png",
          width: 70,
          height: 80,
          crop: "c-at_max",
          lxc: 60,
          lyc: -50,
        }),
        tplStep("layers-image", {
          imageUrl:
            "creative_automation_hackathon@@sample_images@@h-m-1-logo-black-and-white.png",
          width: 70,
          height: 80,
          crop: "c-at_max",
          trimEnabled: true,
          trimThreshold: 10,
          lxc: 160,
          lyc: -50,
        }),
      ],
    })

    const res = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/base.png",
      template,
      activePresetId: null,
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return

    expect(res.transformationString).toBe(
      [
        "cm-pad_resize,w-320,h-450,bg-E0E0E0",
        `l-image,ie-${encodeURIComponent(btoa("creative_automation_hackathon@@sample_images@@female-model-2.jpg"))},w-bw,h-bh,l-end`,
        "l-image,i-ik_canvas,w-bw,h-150,e-gradient-ld-top_from-00000090_to-00000000_sp-0.6,lfo-bottom,l-end",
        `l-image,ie-${encodeURIComponent(btoa("creative_automation_hackathon@@sample_images@@gap_logo.png"))},lxc-60,lyc-N50,w-70,h-80,c-at_max,l-end`,
        `l-image,ie-${encodeURIComponent(btoa("creative_automation_hackathon@@sample_images@@h-m-1-logo-black-and-white.png"))},lxc-160,lyc-N50,w-70,h-80,c-at_max,t-10,l-end`,
      ].join(":"),
    )
  })

  it("resolves a complex template without variables/presets (Ajio sample) and produces overlays for all layers", () => {
    const template: TemplateRecord = {
      id: "0d45783d-5ef3-4961-9c96-71afd1dd3ef8",
      clientNumber: "demo",
      isPrivate: false,
      isPinned: false,
      name: "Ajio Sample Template 1",
      transformations: [
        {
          type: "transformation",
          name: "Gray background",
          key: "resize_and_crop-resize_and_crop",
          value: {
            mode: "cm-pad_resize",
            width: "320",
            height: "450",
            backgroundType: "color",
            background: "#E0E0E0",
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Model Image",
          key: "layers-image",
          value: {
            imageUrl:
              "/creative_automation_hackathon/sample_images/female-model-2.jpg",
            width: "bw",
            height: "bh",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Black gradient overlay at the bottom using canvas layer",
          key: "layers-canvas",
          value: {
            width: "bw",
            height: "150",
            lfo: "bottom",
            gradientSwitch: true,
            gradient: {
              direction: "top",
              from: "#00000090",
              to: "#00000000",
              stopPoint: 60,
            },
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Gap logo using image layer",
          key: "layers-image",
          value: {
            imageUrl:
              "/creative_automation_hackathon/sample_images/gap_logo.png",
            width: "70",
            height: "80",
            crop: "c-at_max",
            lxc: "60",
            lyc: "N50",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "H&M Logo using image layer",
          key: "layers-image",
          value: {
            imageUrl:
              "/creative_automation_hackathon/sample_images/h-m-1-logo-black-and-white.png",
            width: "70",
            height: "80",
            crop: "c-at_max",
            trimEnabled: true,
            trimThreshold: 10,
            lxc: "160",
            lyc: "N50",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "& more text layer",
          key: "layers-text",
          value: {
            text: "& more",
            width: "100",
            lxc: "260",
            lyc: "N50",
            fontSize: 16,
            fontFamily: "Open Sans",
            color: "#FFFFFF",
            typography: ["bold"],
            padding: { mode: "uniform", padding: 0 },
            opacity: 9,
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Radius",
          key: "adjust-radius",
          value: { radius: { mode: "uniform", radius: 15 } },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Adding white area below the image",
          key: "resize_and_crop-resize_and_crop",
          value: {
            mode: "cm-pad_resize",
            width: "320",
            height: "550",
            focus: "top",
            backgroundType: "color",
            background: "#FFFFFF",
          },
          enabled: true,
          version: "v1",
        } as any,
        {
          type: "transformation",
          name: "JEANS text layer",
          key: "layers-text",
          value: {
            text: "JEANS",
            width: "bw",
            positionY: "N60",
            fontSize: 20,
            fontFamily: "Open Sans",
            color: "#666666",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Min 50% off text layer",
          key: "layers-text",
          value: {
            text: "MIN. 50% OFF*",
            width: "bw",
            lfo: "bottom",
            fontSize: 30,
            fontFamily: "Open Sans",
            typography: ["bold"],
            padding: {
              mode: "individual",
              padding: { top: 20, right: 0, bottom: 20, left: 0 },
            },
            children: [],
          },
          version: "v1",
        },
      ],
      variables: [],
      presets: [],
      createdBy: {
        userId: "demo-user",
        name: "Demo User",
        email: "demo@example.com",
      },
      updatedBy: {
        userId: "demo-user",
        name: "Demo User",
        email: "demo@example.com",
      },
      createdAt: 1778249152111,
      updatedAt: 1778263506313,
    }

    const res = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/base.png",
      template,
      activePresetId: null,
    })

    expect(res.ok).toBe(true)
    if (!res.ok) return

    expect(res.transformationString).not.toContain("{{")
    expect(res.transformationString).not.toContain("__IMAGE_PATH__")

    const overlayInputs = getOverlayInputs(res.ikTransformations as any)
    expect(overlayInputs).toEqual(
      expect.arrayContaining([
        "creative_automation_hackathon/sample_images/female-model-2.jpg",
        "creative_automation_hackathon/sample_images/gap_logo.png",
        "creative_automation_hackathon/sample_images/h-m-1-logo-black-and-white.png",
      ]),
    )

    const overlayTexts = getOverlayTexts(res.ikTransformations as any)
    expect(overlayTexts).toContain("& more")
    expect(overlayTexts).toContain("JEANS")
    try {
      expect(res.transformationString).toContain("MIN. 50% OFF*")
    } catch (error) {
      expect(res.transformationString).toContain(
        encodeURIComponent(btoa("MIN. 50% OFF*")),
      )
    }
    expect(res.transformationString).toContain(
      "cm-pad_resize,w-320,h-450,bg-E0E0E0",
    )
    expect(res.transformationString).toContain(
      "l-image,i-creative_automation_hackathon@@sample_images@@female-model-2.jpg,w-bw,h-bh,l-end",
    )
    expect(res.transformationString).toContain(
      "l-image,i-ik_canvas,w-bw,h-150,e-gradient-ld-top_from-00000090_to-00000000_sp-0.6,lfo-bottom,l-end",
    )
    expect(res.transformationString).toContain(
      "l-image,i-creative_automation_hackathon@@sample_images@@gap_logo.png,lxc-60,lyc-N50,w-70,h-80,c-at_max,l-end",
    )
    expect(res.transformationString).toContain(
      "i-creative_automation_hackathon@@sample_images@@h-m-1-logo-black-and-white.png,lxc-160,lyc-N50,w-70,h-80,c-at_max,t-10,l-end",
    )
    expect(res.transformationString).toContain("r-15")
    expect(res.transformationString).toContain(
      "cm-pad_resize,w-320,h-550,fo-top,bg-FFFFFF",
    )

    // Incomplete strings
    expect(res.transformationString).toContain(
      "l-text,ie-JiBtb3Jl,lxc-260,lyc-N50,w-100,co-FFFFFF,fs-16",
    )
    expect(res.transformationString).toContain(
      "l-text,i-JEANS,ly-N60,w-bw,co-666666,fs-20",
    )
    expect(res.transformationString).toContain(
      "l-text,ie-TUlOLiA1MCUgT0ZGKg%3D%3D,w-bw,fs-30",
    )
  })

  it("resolves Ajio sample template with variables (defaults + preset overrides) without leaving placeholders", () => {
    const saleTextId = "0441b941-8bfd-4032-a233-898d8bbce4e8"
    const productNameId = "f525f8be-2b5a-4b42-afa8-1163dbb95fcd"
    const modelImageId = "0382898f-99d9-4176-9366-e000c2f2b82e"
    const logo1Id = "563917b3-7c84-40ee-b4dc-05d8ff673a0e"

    const template: TemplateRecord = {
      id: "e5cfe82d-844a-4668-94df-dab610af6a50",
      clientNumber: "demo",
      isPrivate: false,
      isPinned: false,
      name: "Ajio Sample Template 1 (with variables)",
      transformations: [
        {
          type: "transformation",
          name: "Gray background",
          key: "resize_and_crop-resize_and_crop",
          value: {
            mode: "cm-pad_resize",
            width: "320",
            height: "450",
            backgroundType: "color",
            background: "#E0E0E0",
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Model Image",
          key: "layers-image",
          value: {
            imageUrl: `{{${modelImageId}}}`,
            width: "bw",
            height: "bh",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Black gradient overlay at the bottom using canvas layer",
          key: "layers-canvas",
          value: {
            width: "bw",
            height: "150",
            lfo: "bottom",
            gradientSwitch: true,
            gradient: {
              direction: "top",
              from: "#00000090",
              to: "#00000000",
              stopPoint: 60,
            },
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "logo 1 using image layer",
          key: "layers-image",
          value: {
            imageUrl: `{{${logo1Id}}}`,
            width: "70",
            height: "80",
            crop: "c-at_max",
            lxc: "60",
            lyc: "N50",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "H&M Logo using image layer",
          key: "layers-image",
          value: {
            imageUrl:
              "/creative_automation_hackathon/sample_images/h-m-1-logo-black-and-white.png",
            width: "70",
            height: "80",
            crop: "c-at_max",
            trimEnabled: true,
            trimThreshold: 10,
            lxc: "160",
            lyc: "N50",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "& more text layer",
          key: "layers-text",
          value: {
            text: "& more",
            width: "100",
            lxc: "260",
            lyc: "N50",
            fontSize: 16,
            fontFamily: "Open Sans",
            color: "#FFFFFF",
            typography: ["bold"],
            padding: { mode: "uniform", padding: 0 },
            opacity: 9,
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Radius",
          key: "adjust-radius",
          value: { radius: { mode: "uniform", radius: 15 } },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Adding white area below the image",
          key: "resize_and_crop-resize_and_crop",
          value: {
            mode: "cm-pad_resize",
            width: "320",
            height: "550",
            focus: "top",
            backgroundType: "color",
            background: "#FFFFFF",
          },
          enabled: true,
          version: "v1",
        } as any,
        {
          type: "transformation",
          name: "JEANS text layer",
          key: "layers-text",
          value: {
            text: `{{${productNameId}}}`,
            width: "bw",
            positionY: "N60",
            fontSize: 20,
            fontFamily: "Open Sans",
            color: "#666666",
            children: [],
          },
          version: "v1",
        },
        {
          type: "transformation",
          name: "Min 50% off text layer",
          key: "layers-text",
          value: {
            text: `{{${saleTextId}}}`,
            width: "bw",
            lfo: "bottom",
            fontSize: 30,
            fontFamily: "Open Sans",
            typography: ["bold"],
            padding: {
              mode: "individual",
              padding: { top: 20, right: 0, bottom: 20, left: 0 },
            },
            children: [],
          },
          version: "v1",
        },
      ],
      variables: [
        {
          id: saleTextId,
          name: "sale_text",
          defaultValue: "MIN. 50% OFF*",
          description:
            "The attention grabbing text that needs to be displayed at the bottom",
        },
        {
          id: productNameId,
          name: "product_name_text",
          defaultValue: "JEANS",
          description: "The actual product in focus",
        },
        {
          id: modelImageId,
          name: "model_image_url",
          defaultValue:
            "/creative_automation_hackathon/sample_images/female-model-2.jpg",
        },
        {
          id: logo1Id,
          name: "logo_1_url",
          defaultValue:
            "/creative_automation_hackathon/sample_images/gap_logo.png",
        },
      ],
      presets: [
        {
          id: "cb184153-e7cf-49a3-abe9-c98c633f822c",
          name: "Flat 75% off",
          valuesByVariableId: { [saleTextId]: "FLAT. 75% OFF*" },
        },
        {
          id: "e8c9d1ea-e5ce-43e0-b27b-d8357c1d09c0",
          name: "New female model with levi logo",
          valuesByVariableId: {
            [saleTextId]: "FLAT. 10% OFF*",
            [productNameId]: "FIT & FLARE DRESS",
            [modelImageId]:
              "/creative_automation_hackathon/sample_images/female-model-100.jpg",
            [logo1Id]:
              "/creative_automation_hackathon/sample_images/levis-logo.jpg",
          },
        },
      ],
      createdBy: {
        userId: "demo-user",
        name: "Demo User",
        email: "demo@example.com",
      },
      updatedBy: {
        userId: "demo-user",
        name: "Demo User",
        email: "demo@example.com",
      },
      createdAt: 1778265491718,
      updatedAt: 1778267266804,
    }

    const defaultsRes = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/base.png",
      template,
      activePresetId: null,
    })

    expect(defaultsRes.ok).toBe(true)
    if (!defaultsRes.ok) return
    expect(defaultsRes.transformationString).not.toContain("{{")

    expect(getOverlayTexts(defaultsRes.ikTransformations as any)).toEqual(
      expect.arrayContaining(["JEANS"]),
    )

    try {
      expect(defaultsRes.transformationString).toContain("MIN. 50% OFF*")
    } catch (error) {
      expect(defaultsRes.transformationString).toContain(
        encodeURIComponent(btoa("MIN. 50% OFF*")),
      )
    }

    expect(getOverlayInputs(defaultsRes.ikTransformations as any)).toEqual(
      expect.arrayContaining([
        "creative_automation_hackathon/sample_images/female-model-2.jpg",
        "creative_automation_hackathon/sample_images/gap_logo.png",
      ]),
    )

    const presetRes = resolveTemplateToAutomationOutput({
      assetUrl: "https://ik.imagekit.io/demo/base.png",
      template,
      activePresetId: "e8c9d1ea-e5ce-43e0-b27b-d8357c1d09c0",
    })

    expect(presetRes.ok).toBe(true)
    if (!presetRes.ok) return
    expect(presetRes.transformationString).not.toContain("{{")

    expect(getOverlayTexts(presetRes.ikTransformations as any)).toEqual(
      expect.arrayContaining(["FIT & FLARE DRESS"]),
    )

    try {
      expect(presetRes.transformationString).toContain("FLAT. 10% OFF*")
    } catch (error) {
      expect(presetRes.transformationString).toContain(
        encodeURIComponent(btoa("FLAT. 10% OFF*")),
      )
    }

    expect(getOverlayInputs(presetRes.ikTransformations as any)).toEqual(
      expect.arrayContaining([
        "creative_automation_hackathon/sample_images/female-model-100.jpg",
        "creative_automation_hackathon/sample_images/levis-logo.jpg",
      ]),
    )
  })
})
