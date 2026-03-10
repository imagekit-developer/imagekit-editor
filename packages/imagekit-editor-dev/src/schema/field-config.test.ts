import { describe, expect, it } from "vitest"
import { backgroundTransformations } from "./background"
import {
  getDefaultTransformationFromMode,
  resizeAndCropTransformations,
} from "./resizeAndCrop"

describe("Field Configuration Tests", () => {
  describe("Background Fields - Visibility Logic", () => {
    describe("background field (color picker)", () => {
      it("should be visible for root_image when type is color and auto is off", () => {
        const field = backgroundTransformations.background({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "color",
          backgroundDominantAuto: false,
        })

        expect(visible).toBe(true)
      })

      it("should be hidden for root_image when auto dominant is enabled", () => {
        const field = backgroundTransformations.background({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "color",
          backgroundDominantAuto: true,
        })

        expect(visible).toBe(false)
      })

      it("should be visible for pad_resize when type is color and auto is off", () => {
        const field = backgroundTransformations.background({
          transformationGroup: "background",
          context: "pad_resize",
        })

        const visible = field.isVisible?.({
          backgroundType: "color",
          backgroundDominantAuto: false,
        })

        expect(visible).toBe(true)
      })

      it("should be visible for pad_extract when type is color and auto is off", () => {
        const field = backgroundTransformations.background({
          transformationGroup: "background",
          context: "pad_extract",
        })

        const visible = field.isVisible?.({
          backgroundType: "color",
          backgroundDominantAuto: false,
        })

        expect(visible).toBe(true)
      })
    })

    describe("backgroundGradientMode field", () => {
      it("should be visible when type is gradient and auto dominant is true", () => {
        const field = backgroundTransformations.backgroundGradientMode({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
        })

        expect(visible).toBe(true)
      })

      it("should be hidden when auto dominant is false", () => {
        const field = backgroundTransformations.backgroundGradientMode({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "gradient",
          backgroundGradientAutoDominant: false,
        })

        expect(visible).toBe(false)
      })
    })

    describe("backgroundGradientPaletteSize field", () => {
      it("should be visible when type is gradient and auto dominant is true", () => {
        const field = backgroundTransformations.backgroundGradientPaletteSize({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
        })

        expect(visible).toBe(true)
      })

      it("should be hidden when background type is not gradient", () => {
        const field = backgroundTransformations.backgroundGradientPaletteSize({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "color",
          backgroundGradientAutoDominant: true,
        })

        expect(visible).toBe(false)
      })
    })

    describe("backgroundGradient field (manual gradient)", () => {
      it("should be visible when type is gradient and auto dominant is false", () => {
        const field = backgroundTransformations.backgroundGradient({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "gradient",
          backgroundGradientAutoDominant: false,
        })

        expect(visible).toBe(true)
      })

      it("should be hidden when auto dominant is true", () => {
        const field = backgroundTransformations.backgroundGradient({
          transformationGroup: "background",
          context: "root_image",
        })

        const visible = field.isVisible?.({
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
        })

        expect(visible).toBe(false)
      })
    })
  })

  describe("Resize and Crop Fields - Visibility and Helpers", () => {
    describe("coordinate field visibility", () => {
      it("should show x field for topleft coordinates in extract mode", () => {
        const xField = resizeAndCropTransformations.find((f) => f.name === "x")

        const visible = xField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "topleft",
        })

        expect(visible).toBe(true)
      })

      it("should hide x field when coordinate method is not topleft", () => {
        const xField = resizeAndCropTransformations.find((f) => f.name === "x")

        const visible = xField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
        })

        expect(visible).toBe(false)
      })

      it("should show y field for topleft coordinates in extract mode", () => {
        const yField = resizeAndCropTransformations.find((f) => f.name === "y")

        const visible = yField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "topleft",
        })

        expect(visible).toBe(true)
      })

      it("should show xc field for center coordinates in extract mode", () => {
        const xcField = resizeAndCropTransformations.find((f) => f.name === "xc")

        const visible = xcField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
        })

        expect(visible).toBe(true)
      })

      it("should show yc field for center coordinates in extract mode", () => {
        const ycField = resizeAndCropTransformations.find((f) => f.name === "yc")

        const visible = ycField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
        })

        expect(visible).toBe(true)
      })
    })

    describe("focus field visibility", () => {
      it("should show focusAnchor when focus is anchor", () => {
        const focusAnchorField = resizeAndCropTransformations.find(
          (f) => f.name === "focusAnchor",
        )

        const visible = focusAnchorField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "anchor",
        })

        expect(visible).toBe(true)
      })

      it("should show focusObject when focus is object", () => {
        const focusObjectField = resizeAndCropTransformations.find(
          (f) => f.name === "focusObject",
        )

        const visible = focusObjectField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "object",
        })

        expect(visible).toBe(true)
      })

      it("should show coordinateMethod when focus is coordinates", () => {
        const coordinateMethodField = resizeAndCropTransformations.find(
          (f) => f.name === "coordinateMethod",
        )

        const visible = coordinateMethodField?.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-extract",
          focus: "coordinates",
        })

        expect(visible).toBe(true)
      })
    })

    describe("mode-specific field visibility", () => {
      it("should show focus field for extract mode", () => {
        const focusFields = resizeAndCropTransformations.filter(
          (f) => f.name === "focus",
        )
        // Find the one for extract mode
        const extractFocusField = focusFields.find((f) =>
          f.isVisible?.({
            width: 100,
            height: 100,
            mode: "cm-extract",
          }),
        )

        expect(extractFocusField).toBeDefined()
      })

      it("should show focus field for maintain_ratio crop", () => {
        const focusFields = resizeAndCropTransformations.filter(
          (f) => f.name === "focus",
        )
        // Find the one for maintain_ratio mode
        const maintainRatioFocusField = focusFields.find((f) =>
          f.isVisible?.({
            width: 100,
            height: 100,
            mode: "c-maintain_ratio",
          }),
        )

        expect(maintainRatioFocusField).toBeDefined()
      })
    })
  })

  describe("Helper Functions - getDefaultTransformationfromMode", () => {
    it("should return cropMode pad_resize for cm-pad_resize", () => {
      const result = getDefaultTransformationFromMode("cm-pad_resize")
      expect(result).toEqual({ cropMode: "pad_resize" })
    })

    it("should return cropMode extract for cm-extract", () => {
      const result = getDefaultTransformationFromMode("cm-extract")
      expect(result).toEqual({ cropMode: "extract" })
    })

    it("should return cropMode pad_extract for cm-pad_extract", () => {
      const result = getDefaultTransformationFromMode("cm-pad_extract")
      expect(result).toEqual({ cropMode: "pad_extract" })
    })

    it("should return crop maintain_ratio for c-maintain_ratio", () => {
      const result = getDefaultTransformationFromMode("c-maintain_ratio")
      expect(result).toEqual({ crop: "maintain_ratio" })
    })

    it("should return crop force for c-force", () => {
      const result = getDefaultTransformationFromMode("c-force")
      expect(result).toEqual({ crop: "force" })
    })

    it("should return crop at_max for c-at_max", () => {
      const result = getDefaultTransformationFromMode("c-at_max")
      expect(result).toEqual({ crop: "at_max" })
    })

    it("should return crop at_max_enlarge for c-at_max_enlarge", () => {
      const result = getDefaultTransformationFromMode("c-at_max_enlarge")
      expect(result).toEqual({ crop: "at_max_enlarge" })
    })

    it("should return crop at_least for c-at_least", () => {
      const result = getDefaultTransformationFromMode("c-at_least")
      expect(result).toEqual({ crop: "at_least" })
    })

    it("should return empty object for unknown mode", () => {
      const result = getDefaultTransformationFromMode("unknown-mode")
      expect(result).toEqual({})
    })
  })

  describe("Additional Field Visibility Coverage", () => {
    it("should show DPR field when enabled and width exists", () => {
      const dprField = resizeAndCropTransformations.find((f) => f.name === "dpr")

      const visible = dprField?.isVisible?.({
        dprEnabled: true,
        width: 100,
      })

      expect(visible).toBe(true)
    })

    it("should show DPR field when enabled and height exists", () => {
      const dprField = resizeAndCropTransformations.find((f) => f.name === "dpr")

      const visible = dprField?.isVisible?.({
        dprEnabled: true,
        height: 100,
      })

      expect(visible).toBe(true)
    })

    it("should hide DPR field when not enabled", () => {
      const dprField = resizeAndCropTransformations.find((f) => f.name === "dpr")

      const visible = dprField?.isVisible?.({
        dprEnabled: false,
        width: 100,
      })

      expect(visible).toBe(false)
    })

    it("should show zoom field for face focus in extract mode", () => {
      const zoomField = resizeAndCropTransformations.find((f) => f.name === "zoom")

      const visible = zoomField?.isVisible?.({
        width: 100,
        height: 100,
        mode: "cm-extract",
        focus: "face",
      })

      expect(visible).toBe(true)
    })

    it("should show zoom field for object focus in maintain_ratio", () => {
      const zoomField = resizeAndCropTransformations.find((f) => f.name === "zoom")

      const visible = zoomField?.isVisible?.({
        width: 100,
        height: 100,
        mode: "c-maintain_ratio",
        focus: "object",
      })

      expect(visible).toBe(true)
    })

    it("should hide zoom field for anchor focus", () => {
      const zoomField = resizeAndCropTransformations.find((f) => f.name === "zoom")

      const visible = zoomField?.isVisible?.({
        width: 100,
        height: 100,
        mode: "cm-extract",
        focus: "anchor",
      })

      expect(visible).toBe(false)
    })

    it("should show focus field for c-force mode", () => {
      const focusFields = resizeAndCropTransformations.filter(
        (f) => f.name === "focus",
      )
      // Find the one for force mode (has only auto option)
      const forceField = focusFields.find((f) =>
        f.isVisible?.({
          width: 100,
          height: 100,
          mode: "c-force",
        }),
      )

      expect(forceField).toBeDefined()
      expect(forceField?.fieldProps?.options).toHaveLength(1)
      expect(forceField?.fieldProps?.options?.[0].value).toBe("auto")
    })

    it("should test pad_resize background field wrapper", () => {
      // Find background fields that are visible for pad_resize
      const backgroundFields = resizeAndCropTransformations.filter(
        (f) =>
          f.transformationGroup === "background" ||
          f.name === "backgroundType" ||
          f.name === "background",
      )

      // At least one should be visible for pad_resize with dimensions
      const visibleForPadResize = backgroundFields.some((f) =>
        f.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-pad_resize",
          backgroundType: "color",
        }),
      )

      expect(visibleForPadResize).toBe(true)
    })

    it("should test pad_extract background field wrapper", () => {
      // Find background fields that are visible for pad_extract
      const backgroundFields = resizeAndCropTransformations.filter(
        (f) =>
          f.transformationGroup === "background" ||
          f.name === "backgroundType" ||
          f.name === "background",
      )

      // At least one should be visible for pad_extract with dimensions
      const visibleForPadExtract = backgroundFields.some((f) =>
        f.isVisible?.({
          width: 100,
          height: 100,
          mode: "cm-pad_extract",
          backgroundType: "color",
        }),
      )

      expect(visibleForPadExtract).toBe(true)
    })
  })
})
