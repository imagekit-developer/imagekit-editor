import { describe, expect, it } from "vitest"
import { transformationSchema } from "./schema"
import type { Transformation } from "./store"
import { generateBatchImageUrls, TRANSFORMATION_STATE_VERSION } from "./store"

function findTransformationSchema(key: string) {
  for (const category of transformationSchema) {
    const item = category.items.find((item) => item.key === key)
    if (item) return item
  }
  return null
}

describe("nested layers", () => {
  it("validates nested layers on image and text layer values", () => {
    const imageLayer = findTransformationSchema("layers-image")
    const textLayer = findTransformationSchema("layers-text")

    expect(
      imageLayer?.schema.safeParse({
        imageUrl: "parent.png",
        width: "bw_div_2",
        nestedLayers: [
          {
            key: "layers-text",
            name: "Badge",
            type: "transformation",
            value: {
              text: "Sale",
              fontSize: 24,
              radius: 0,
            },
          },
        ],
      }).success,
    ).toBe(true)

    expect(
      textLayer?.schema.safeParse({
        text: "Parent",
        radius: 0,
        nestedLayers: [
          {
            key: "layers-image",
            name: "Icon",
            type: "transformation",
            value: {
              imageUrl: "icon.png",
              width: 40,
            },
          },
        ],
      }).success,
    ).toBe(true)
  })

  it("serializes nested editor layers into nested ImageKit overlays", async () => {
    const transformations: Array<Omit<Transformation, "id">> = [
      {
        key: "layers-image",
        name: "Parent Image",
        type: "transformation",
        value: {
          imageUrl: "parent.png",
          width: 200,
          nestedLayers: [
            {
              key: "layers-text",
              name: "Child Text",
              type: "transformation",
              value: {
                text: "Sale",
                fontSize: 24,
                radius: 0,
                positionX: "10",
              },
            },
          ],
        } as unknown as Transformation["value"],
        version: TRANSFORMATION_STATE_VERSION,
      },
    ]

    const [url] = await generateBatchImageUrls({
      imageList: ["https://ik.imagekit.io/demo/base.jpg"],
      transformations,
    })

    expect(url).toContain("l-image")
    expect(url).toContain("i-parent.png")
    expect(url).toContain("l-text")
    expect(url).toContain("i-Sale")
  })

  it("omits empty and no-op nested image layer values", async () => {
    const transformations: Array<Omit<Transformation, "id">> = [
      {
        key: "layers-image",
        name: "Parent Image",
        type: "transformation",
        value: {
          imageUrl: "blue_strip.png",
          nestedLayers: [
            {
              key: "layers-image",
              name: "Child Image",
              type: "transformation",
              value: {
                imageUrl:
                  "https://ik.imagekit.io/customeraccountdemo/ajio/gap_logo.png",
                radius: {
                  mode: "uniform",
                  radius: "",
                },
                blur: "0",
                rotation: "0",
              },
            },
          ],
        } as unknown as Transformation["value"],
        version: TRANSFORMATION_STATE_VERSION,
      },
    ]

    const [url] = await generateBatchImageUrls({
      imageList: ["https://ik.imagekit.io/demo/base.jpg"],
      transformations,
    })

    expect(url).not.toContain("r-")
    expect(url).not.toContain("bl-0")
    expect(url).not.toContain("rt-0")
  })
})
