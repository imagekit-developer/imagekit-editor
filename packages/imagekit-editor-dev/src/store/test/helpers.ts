import type { Transformation } from "../types"
import { TRANSFORMATION_STATE_VERSION } from "../types"

export const SAMPLE_URL = "https://ik.imagekit.io/demo/tr:f-auto/sample.jpg"

export function borderTransform(): Omit<Transformation, "id"> {
  return {
    key: "adjust-border",
    name: "Border",
    type: "transformation",
    value: { borderWidth: 2, borderColor: "#000000" },
    version: TRANSFORMATION_STATE_VERSION,
  }
}

export function resizeTransform(): Omit<Transformation, "id"> {
  return {
    key: "resize_and_crop-resize_and_crop",
    name: "Resize",
    type: "transformation",
    value: {
      width: 100,
      height: 100,
      mode: "cm-pad_extract",
    },
    version: TRANSFORMATION_STATE_VERSION,
  }
}
