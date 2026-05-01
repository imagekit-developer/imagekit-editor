import { describe, expect, it } from "vitest"
import { transformationFormatters } from "./index"

describe("Transformation Formatters", () => {
  describe("background formatter", () => {
    it("should format color background with dominant auto", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "color",
          backgroundDominantAuto: true,
        },
        transforms,
      )
      expect(transforms.background).toBe("dominant")
    })

    it("should format gradient background with auto dominant", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
          backgroundGradientPaletteSize: "4",
          backgroundGradientMode: "contrast",
        },
        transforms,
      )
      expect(transforms.background).toBe("gradient_contrast_4")
    })

    it("should format gradient background with default values", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
        },
        transforms,
      )
      expect(transforms.background).toBe("gradient_dominant_2")
    })

    it("should format manual gradient background", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "gradient",
          backgroundGradientAutoDominant: false,
          backgroundGradient: {
            from: "#FF0000",
            to: "#0000FF",
            direction: "top",
            stopPoint: 50,
          },
        },
        transforms,
      )
      expect(transforms.raw).toContain("e-gradient")
      expect(transforms.raw).toContain("from-FF0000")
      expect(transforms.raw).toContain("to-0000FF")
    })

    it("should format blurred background with auto intensity", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "blurred",
          backgroundBlurIntensity: "auto",
        },
        transforms,
      )
      expect(transforms.background).toBe("blurred_auto")
    })

    it("should format blurred background with auto intensity and brightness", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "blurred",
          backgroundBlurIntensity: "auto",
          backgroundBlurBrightness: "50",
        },
        transforms,
      )
      expect(transforms.background).toBe("blurred_auto_50")
    })

    it("should format blurred background with numeric intensity", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "blurred",
          backgroundBlurIntensity: "10",
        },
        transforms,
      )
      expect(transforms.background).toBe("blurred_10")
    })

    it("should format blurred background with intensity and brightness", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "blurred",
          backgroundBlurIntensity: "10",
          backgroundBlurBrightness: "20",
        },
        transforms,
      )
      expect(transforms.background).toBe("blurred_10_20")
    })

    it("should handle negative blur brightness", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "blurred",
          backgroundBlurIntensity: "10",
          backgroundBlurBrightness: "-20",
        },
        transforms,
      )
      expect(transforms.background).toBe("blurred_10_N20")
    })

    it("should format generative fill background without prompt", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "generative_fill",
        },
        transforms,
      )
      expect(transforms.background).toBe("genfill")
    })

    it("should format generative fill with simple text prompt", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "generative_fill",
          backgroundGenerativeFill: "beach",
        },
        transforms,
      )
      expect(transforms.background).toBe("genfill-prompt-beach")
    })

    it("should format generative fill with complex prompt", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "generative_fill",
          backgroundGenerativeFill: "beach with palm trees!",
        },
        transforms,
      )
      expect(transforms.background).toContain("genfill-prompte-")
    })

    it("should format color background with manual color", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "color",
          backgroundDominantAuto: false,
          background: "#FF5733",
        },
        transforms,
      )
      expect(transforms.background).toBe("FF5733")
    })

    it("should default to blurred when intensity is invalid", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(
        {
          backgroundType: "blurred",
          backgroundBlurIntensity: "invalid",
        },
        transforms,
      )
      expect(transforms.background).toBe("blurred")
    })
  })

  describe("focus formatter", () => {
    it("should format focus with anchor", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.focus(
        {
          focus: "anchor",
          focusAnchor: "top_left",
        },
        transforms,
      )
      expect(transforms.focus).toBe("top_left")
    })

    it("should format focus with object", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.focus(
        {
          focus: "object",
          focusObject: "face",
        },
        transforms,
      )
      expect(transforms.focus).toBe("face")
    })

    it("should format focus with auto", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.focus(
        {
          focus: "auto",
        },
        transforms,
      )
      expect(transforms.focus).toBe("auto")
    })

    it("should format focus with center coordinates", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.focus(
        {
          focus: "coordinates",
          coordinateMethod: "center",
          xc: "100",
          yc: "200",
        },
        transforms,
      )
      expect(transforms.xc).toBe("100")
      expect(transforms.yc).toBe("200")
    })

    it("should format focus with topleft coordinates", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.focus(
        {
          focus: "coordinates",
          coordinateMethod: "topleft",
          x: "50",
          y: "75",
        },
        transforms,
      )
      expect(transforms.x).toBe("50")
      expect(transforms.y).toBe("75")
    })

    it("should format focus with zoom", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.focus(
        {
          focus: "auto",
          zoom: 150,
        },
        transforms,
      )
      expect(transforms.zoom).toBe(1.5)
    })
  })

  describe("shadow formatter", () => {
    it("should format shadow with all parameters", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.shadow(
        {
          shadow: true,
          shadowBlur: 10,
          shadowSaturation: 50,
          shadowOffsetX: 5,
          shadowOffsetY: 8,
        },
        transforms,
      )
      expect(transforms.shadow).toBe("bl-10_st-50_x-5_y-8")
    })

    it("should skip shadow when disabled", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.shadow(
        {
          shadow: false,
        },
        transforms,
      )
      expect(transforms.shadow).toBeUndefined()
    })

    it("should handle negative shadow offsets", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.shadow(
        {
          shadow: true,
          shadowOffsetX: -5,
          shadowOffsetY: -10,
        },
        transforms,
      )
      expect(transforms.shadow).toContain("x-N5")
      expect(transforms.shadow).toContain("y-N10")
    })

    it("should format shadow with only blur", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.shadow(
        {
          shadow: true,
          shadowBlur: 15,
        },
        transforms,
      )
      expect(transforms.shadow).toBe("bl-15")
    })
  })
})
