import { describe, expect, it } from "vitest"
import type { TemplateRecord } from "../storage"
import { getTemplateSignature, type SignatureNode } from "./templateSignature"

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

function objectFields(node: SignatureNode): Record<string, SignatureNode> {
  expect(node.kind).toBe("object")
  return node.kind === "object" ? node.fields : {}
}

describe("getTemplateSignature", () => {
  it("keeps color replace values that differ from defaults", () => {
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
      ] as TemplateRecord["transformations"]),
    )

    const transformation = signature.transformations[0]
    const fields = objectFields(transformation.value)

    expect(Object.keys(fields).sort()).toEqual(["toColor", "tolerance"])
    expect(fields.toColor.kind).toBe("string")
    expect(fields.tolerance.kind).toBe("number")
    expect(fields.fromColor).toBeUndefined()
  })

  it("drops color replace values that are null or equal to defaults", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Color Replace",
          key: "adjust-color-replace",
          version: "v1",
          value: {
            toColor: "#23142c",
            tolerance: 35,
            fromColor: "",
          },
        },
      ]),
    )

    const transformation = signature.transformations[0]
    const fields = objectFields(transformation.value)

    expect(Object.keys(fields)).toEqual(["toColor"])
  })

  it("emits only the selected individual radius branch", () => {
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
        },
      ]),
    )

    const radiusFields = objectFields(signature.transformations[0].value)
    const radiusGroup = radiusFields.radius
    const radiusGroupFields = objectFields(radiusGroup)
    const radiusValueFields = objectFields(radiusGroupFields.radius)

    expect(radiusGroupFields.mode).toBeUndefined()
    expect(Object.keys(radiusValueFields).sort()).toEqual([
      "bottomLeft",
      "bottomRight",
      "topLeft",
      "topRight",
    ])
  })

  it("emits scalar radius in uniform mode and omits the default mode selector", () => {
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
        },
      ]),
    )

    const radiusFields = objectFields(signature.transformations[0].value)
    const radiusGroupFields = objectFields(radiusFields.radius)
    const radiusValue = radiusGroupFields.radius

    expect(radiusGroupFields.mode).toBeUndefined()
    expect(radiusValue.kind).toBe("union")
    expect(radiusValue.kind === "union" ? radiusValue.options : []).toEqual([
      { kind: "literal", value: "max" },
      { kind: "number" },
    ])
  })

  it("omits transformations when no non-default values remain", () => {
    const signature = getTemplateSignature(
      makeTemplate([
        {
          type: "transformation",
          name: "Color Replace",
          key: "adjust-color-replace",
          version: "v1",
          value: {
            toColor: null,
            tolerance: 35,
            fromColor: "",
          },
        },
      ] as TemplateRecord["transformations"]),
    )

    expect(signature.transformations).toEqual([])
  })
})
