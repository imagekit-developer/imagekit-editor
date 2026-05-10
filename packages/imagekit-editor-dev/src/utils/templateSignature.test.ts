import { describe, expect, it } from "vitest"
import type { TemplateRecord } from "../storage"
import { getTemplateSignature } from "./templateSignature"

function makeTemplate(
  transformations: TemplateRecord["transformations"],
): TemplateRecord {
  return {
    id: "tpl_1",
    clientNumber: "client_1",
    isPrivate: false,
    name: "Testing Template",
    transformations,
    isPinned: false,
    createdBy: { userId: "u1", name: "Piyush", email: "piyush@imagekit.io" },
    updatedBy: { userId: "u1", name: "Piyush", email: "piyush@imagekit.io" },
    createdAt: 1,
    updatedAt: 1,
  }
}

describe("getTemplateSignature", () => {
  it("returns an empty variable list for templates without explicit variables", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Color Replace",
          key: "adjust-color-replace",
          version: "v1",
          value: {
            toColor: "#23142c",
            tolerance: 47,
            fromColor: null,
          },
        },
      ]),
    )

    expect(signature.version).toBe(2)
    expect(signature.variables).toEqual([])
    expect(signature.transformations).toEqual([])
  })

  it("emits only explicitly assigned variables with validation metadata", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Color Replace",
          key: "adjust-color-replace",
          version: "v1",
          value: {
            toColor: "#23142c",
            tolerance: 47,
            fromColor: null,
          },
          automationVariables: [
            {
              id: "var-color",
              label: "Brand color",
              fieldName: "toColor",
              valuePath: "toColor",
              fieldType: "color-picker",
            },
            {
              id: "var-tolerance",
              label: "Tolerance",
              fieldName: "tolerance",
              valuePath: "tolerance",
              fieldType: "slider",
            },
          ],
        },
      ] as TemplateRecord["transformations"]),
    )

    expect(signature.variables.map((variable) => variable.label)).toEqual([
      "Brand color",
      "Tolerance",
    ])
    expect(signature.variables[0]).toMatchObject({
      id: "var-color",
      fieldPath: "adjust-color-replace.toColor",
      valuePath: "toColor",
      valueType: "string",
      validation: { color: true },
    })
    expect(signature.variables[1]).toMatchObject({
      id: "var-tolerance",
      fieldPath: "adjust-color-replace.tolerance",
      valueType: "number",
    })
  })

  it("keeps radius variables pinned to the selected individual leaf", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Radius",
          key: "adjust-radius",
          version: "v1",
          value: {
            radius: {
              mode: "individual",
              radius: {
                topLeft: 0,
                topRight: "max",
                bottomRight: 0,
                bottomLeft: "max",
              },
            },
          },
          automationVariables: [
            {
              id: "var-top-left",
              label: "Top left radius",
              fieldName: "radius",
              valuePath: "radius.radius.topLeft",
              fieldType: "radius-input",
            },
          ],
        },
      ]),
    )

    expect(signature.variables).toHaveLength(1)
    expect(signature.variables[0]).toMatchObject({
      fieldPath: "adjust-radius.radius.radius.topLeft",
      valuePath: "radius.radius.topLeft",
      valueType: "number",
      defaultValue: 0,
    })
  })

  it("keeps radius variables pinned to the selected uniform value", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Radius",
          key: "adjust-radius",
          version: "v1",
          value: {
            radius: {
              mode: "uniform",
              radius: 24,
            },
          },
          automationVariables: [
            {
              id: "var-radius",
              label: "Radius",
              fieldName: "radius",
              valuePath: "radius.radius",
              fieldType: "radius-input",
            },
          ],
        },
      ]),
    )

    expect(signature.variables[0]).toMatchObject({
      fieldPath: "adjust-radius.radius.radius",
      valuePath: "radius.radius",
      defaultValue: 24,
    })
    expect(signature.variables[0].signatureNode?.kind).toBe("union")
  })

  it("emits duplicate transformation variables with indexed field paths", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Headline",
          key: "layers-text",
          version: "v1",
          value: { text: "Sale" },
          automationVariables: [
            {
              id: "var-headline",
              label: "Headline",
              fieldName: "text",
              valuePath: "text",
              fieldType: "input",
            },
          ],
        },
        {
          type: "transformation",
          name: "Subtitle",
          key: "layers-text",
          version: "v1",
          value: { text: "Today" },
          automationVariables: [
            {
              id: "var-subtitle",
              label: "Headline",
              fieldName: "text",
              valuePath: "text",
              fieldType: "input",
            },
          ],
        },
      ]),
    )

    expect(signature.variables.map((variable) => variable.fieldPath)).toEqual([
      "transformations.0.layers-text.text",
      "transformations.1.layers-text.text",
    ])
  })

  it("supports explicit nested layer variable paths", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Parent Image",
          key: "layers-image",
          version: "v1",
          value: {
            imageUrl: "parent.png",
            nestedLayers: [
              {
                key: "layers-text",
                name: "Badge",
                type: "transformation",
                value: {
                  text: "Sale",
                  fontSize: 24,
                },
              },
            ],
          },
          automationVariables: [
            {
              id: "var-badge",
              label: "Badge text",
              fieldName: "nestedLayers",
              valuePath: "nestedLayers.0.value.text",
              fieldType: "input",
            },
          ],
        },
      ]),
    )

    expect(signature.variables[0]).toMatchObject({
      fieldPath: "layers-image.nestedLayers.0.value.text",
      defaultValue: "Sale",
      fieldType: "input",
      valueType: "string",
    })
    expect(signature.variables[0].signatureNode?.kind).toBe("string")
  })

  it("marks nested image layer URL variables as image asset sources", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Parent Text",
          key: "layers-text",
          version: "v1",
          value: {
            text: "Sale",
            nestedLayers: [
              {
                key: "layers-image",
                name: "Badge Image",
                type: "transformation",
                value: {
                  imageUrl: "badge.png",
                },
              },
            ],
          },
          automationVariables: [
            {
              id: "var-badge-image",
              label: "Badge image",
              fieldName: "imageUrl",
              valuePath: "nestedLayers.0.value.imageUrl",
              fieldType: "input",
            },
          ],
        },
      ]),
    )

    expect(signature.variables[0]).toMatchObject({
      fieldPath: "layers-text.nestedLayers.0.value.imageUrl",
      defaultValue: "badge.png",
      specialSource: "imageLayer",
    })
  })
})
