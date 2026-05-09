import { describe, expect, it } from "vitest"
import {
  type AnchorPosition,
  type LayerPositionConfig,
  extractLayerPositionConfig,
  getLayerType,
  hasExpressionCoords,
  isExpression,
  isLayerTransformation,
  rectToLayerCoords,
  resolveLayerRect,
} from "./layerGeometry"

describe("isExpression", () => {
  it("detects valid X expressions", () => {
    expect(isExpression("bw_div_2")).toBe(true)
    expect(isExpression("cw_sub_100")).toBe(true)
    expect(isExpression("bw_add_50.5")).toBe(true)
  })

  it("detects valid Y expressions", () => {
    expect(isExpression("bh_mul_3")).toBe(true)
    expect(isExpression("ch_mod_10")).toBe(true)
  })

  it("rejects plain numbers", () => {
    expect(isExpression(100)).toBe(false)
    expect(isExpression("100")).toBe(false)
    expect(isExpression("N50")).toBe(false)
  })

  it("rejects empty/undefined", () => {
    expect(isExpression("")).toBe(false)
    expect(isExpression(undefined)).toBe(false)
    expect(isExpression(null)).toBe(false)
  })
})

describe("hasExpressionCoords", () => {
  it("returns true when topleft X is an expression", () => {
    const config: LayerPositionConfig = {
      positionMethod: "topleft",
      positionX: "bw_div_2",
      positionY: 10,
    }
    expect(hasExpressionCoords(config)).toBe(true)
  })

  it("returns false when topleft values are numbers", () => {
    const config: LayerPositionConfig = {
      positionMethod: "topleft",
      positionX: 20,
      positionY: 30,
    }
    expect(hasExpressionCoords(config)).toBe(false)
  })

  it("returns true when center XC is an expression", () => {
    const config: LayerPositionConfig = {
      positionMethod: "center",
      positionXC: "cw_sub_100",
      positionYC: 0,
    }
    expect(hasExpressionCoords(config)).toBe(true)
  })
})

describe("resolveLayerRect", () => {
  const CANVAS_W = 1080
  const CANVAS_H = 1080

  it("resolves default center anchor with topleft offsets", () => {
    const config: LayerPositionConfig = {
      positionMethod: "topleft",
      positionX: 100,
      positionY: 200,
      layerWidth: 300,
      layerHeight: 150,
    }
    const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
    // anchor center = (540, 540), offset (100, 200)
    expect(rect.x).toBe(640)
    expect(rect.y).toBe(740)
    expect(rect.w).toBe(300)
    expect(rect.h).toBe(150)
  })

  it("resolves top_left anchor with topleft offsets", () => {
    const config: LayerPositionConfig = {
      positionMethod: "topleft",
      positionX: 50,
      positionY: 30,
      anchorPoint: "top_left",
      layerWidth: 200,
      layerHeight: 100,
    }
    const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
    // anchor top_left = (0, 0), offset (50, 30)
    expect(rect.x).toBe(50)
    expect(rect.y).toBe(30)
    expect(rect.w).toBe(200)
    expect(rect.h).toBe(100)
  })

  it("resolves center method with xc/yc offsets", () => {
    const config: LayerPositionConfig = {
      positionMethod: "center",
      positionXC: -100,
      positionYC: 50,
      anchorPoint: "center",
      layerWidth: 200,
      layerHeight: 100,
    }
    const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
    // anchor center = (540, 540), center offset (-100, 50) → layer center (440, 590)
    expect(rect.x).toBe(340) // 440 - 100
    expect(rect.y).toBe(540) // 590 - 50
    expect(rect.w).toBe(200)
    expect(rect.h).toBe(100)
  })

  it("uses focus for positioning when no offsets given", () => {
    const config: LayerPositionConfig = {
      positionMethod: "topleft",
      anchorPoint: "center",
      focus: "top_left",
      layerWidth: 200,
      layerHeight: 100,
    }
    const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
    // anchor center = (540, 540), focus top_left = (0, 0) fraction
    // layer x = 540 - 0*200 = 540, y = 540 - 0*100 = 540
    expect(rect.x).toBe(540)
    expect(rect.y).toBe(540)
  })

  it("handles negative position via N prefix string", () => {
    const config: LayerPositionConfig = {
      positionMethod: "topleft",
      positionX: "N50",
      positionY: 20,
      anchorPoint: "top_left",
      layerWidth: 100,
      layerHeight: 100,
    }
    const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
    expect(rect.x).toBe(-50)
    expect(rect.y).toBe(20)
  })

  it("handles expression coordinates as zero offset", () => {
    const config: LayerPositionConfig = {
      positionMethod: "topleft",
      positionX: "bw_div_2",
      positionY: 0,
      anchorPoint: "center",
      layerWidth: 100,
      layerHeight: 100,
    }
    const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
    // expression is treated as 0 offset
    expect(rect.x).toBe(540)
    expect(rect.y).toBe(540)
  })
})

describe("rectToLayerCoords", () => {
  const CANVAS_W = 1080
  const CANVAS_H = 1080

  it("round-trips topleft with center anchor", () => {
    const coords = rectToLayerCoords(
      { x: 640, y: 740, w: 300, h: 150 },
      CANVAS_W,
      CANVAS_H,
      "topleft",
      "center",
    )
    expect(coords.positionX).toBe(100)
    expect(coords.positionY).toBe(200)
    expect(coords.positionXC).toBeUndefined()
    expect(coords.positionYC).toBeUndefined()
  })

  it("round-trips center mode with center anchor", () => {
    const coords = rectToLayerCoords(
      { x: 340, y: 540, w: 200, h: 100 },
      CANVAS_W,
      CANVAS_H,
      "center",
      "center",
    )
    // center of rect = (440, 590), anchor = (540, 540)
    expect(coords.positionXC).toBe(-100)
    expect(coords.positionYC).toBe(50)
    expect(coords.positionX).toBeUndefined()
    expect(coords.positionY).toBeUndefined()
  })

  it("round-trips topleft with top_left anchor", () => {
    const coords = rectToLayerCoords(
      { x: 50, y: 30, w: 200, h: 100 },
      CANVAS_W,
      CANVAS_H,
      "topleft",
      "top_left",
    )
    expect(coords.positionX).toBe(50)
    expect(coords.positionY).toBe(30)
  })

  it("full round-trip: resolve → rectToLayerCoords", () => {
    const anchors: AnchorPosition[] = [
      "center",
      "top_left",
      "top_right",
      "bottom_left",
      "bottom_right",
      "top",
      "bottom",
      "left",
      "right",
    ]

    for (const anchorPoint of anchors) {
      const config: LayerPositionConfig = {
        positionMethod: "topleft",
        positionX: 42,
        positionY: -17,
        anchorPoint,
        layerWidth: 200,
        layerHeight: 100,
      }
      const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
      const coords = rectToLayerCoords(
        rect,
        CANVAS_W,
        CANVAS_H,
        "topleft",
        anchorPoint,
      )
      expect(coords.positionX).toBe(42)
      expect(coords.positionY).toBe(-17)
    }
  })

  it("full round-trip center mode across all anchors", () => {
    const anchors: AnchorPosition[] = [
      "center",
      "top_left",
      "top_right",
      "bottom_left",
      "bottom_right",
      "top",
      "bottom",
      "left",
      "right",
    ]

    for (const anchorPoint of anchors) {
      const config: LayerPositionConfig = {
        positionMethod: "center",
        positionXC: 75,
        positionYC: -30,
        anchorPoint,
        layerWidth: 200,
        layerHeight: 100,
      }
      const rect = resolveLayerRect(config, CANVAS_W, CANVAS_H)
      const coords = rectToLayerCoords(
        rect,
        CANVAS_W,
        CANVAS_H,
        "center",
        anchorPoint,
      )
      expect(coords.positionXC).toBe(75)
      expect(coords.positionYC).toBe(-30)
    }
  })
})

describe("extractLayerPositionConfig", () => {
  it("extracts position fields from a layer value", () => {
    const value = {
      text: "Hello",
      layerPositionMethod: "center",
      positionXC: 10,
      positionYC: 20,
      layerAnchorPoint: "top_left",
      width: 300,
      height: 150,
    }
    const config = extractLayerPositionConfig(value)
    expect(config.positionMethod).toBe("center")
    expect(config.positionXC).toBe(10)
    expect(config.positionYC).toBe(20)
    expect(config.anchorPoint).toBe("top_left")
    expect(config.layerWidth).toBe(300)
    expect(config.layerHeight).toBe(150)
  })

  it("defaults to topleft when no method specified", () => {
    const config = extractLayerPositionConfig({})
    expect(config.positionMethod).toBe("topleft")
  })
})

describe("isLayerTransformation", () => {
  it("identifies layer keys", () => {
    expect(isLayerTransformation("layers-text")).toBe(true)
    expect(isLayerTransformation("layers-image")).toBe(true)
    expect(isLayerTransformation("layers-solid-color")).toBe(true)
  })

  it("rejects non-layer keys", () => {
    expect(isLayerTransformation("adjust-blur")).toBe(false)
    expect(isLayerTransformation("resize_and_crop-resize_and_crop")).toBe(false)
    expect(isLayerTransformation("layers")).toBe(false)
  })
})

describe("getLayerType", () => {
  it("returns correct types", () => {
    expect(getLayerType("layers-text")).toBe("text")
    expect(getLayerType("layers-image")).toBe("image")
    expect(getLayerType("layers-solid-color")).toBe("solid-color")
  })

  it("returns null for non-layer", () => {
    expect(getLayerType("adjust-blur")).toBeNull()
  })
})
