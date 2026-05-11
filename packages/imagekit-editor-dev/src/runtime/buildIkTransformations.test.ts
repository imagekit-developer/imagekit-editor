import { describe, expect, it } from "vitest"
import type { Transformation } from "../store"
import { buildIkTransformations } from "./buildIkTransformations"

function step(
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

describe("runtime/buildIkTransformations", () => {
  it("maps simple schema fields into ImageKit transformation keys (resize_and_crop)", () => {
    const out = buildIkTransformations([
      step("resize_and_crop-resize_and_crop", {
        width: "1200",
        height: "800",
        mode: "pad_resize",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    // Schema-driven keys; w/h should exist when provided.
    expect(t.w ?? t.width).toBeDefined()
    expect(t.h ?? t.height).toBeDefined()
  })

  it("generates raw layer syntax for manual gradient background (with __IMAGE_PATH__ placeholder)", () => {
    const out = buildIkTransformations([
      step("adjust-background", {
        backgroundType: "gradient",
        backgroundGradientAutoDominant: false,
        backgroundGradient: {
          from: "#FFFFFFFF",
          to: "#00000000",
          direction: "bottom",
          stopPoint: 100,
        },
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(typeof t.raw).toBe("string")
    expect(t.raw).toContain("i-__IMAGE_PATH__")
  })

  it("omits empty-string values so they don't become transformations", () => {
    const out = buildIkTransformations([
      step("resize_and_crop-resize_and_crop", {
        width: "",
        height: "",
        mode: "",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    // Should not emit width/height keys when values are empty.
    expect("w" in t || "width" in t).toBe(false)
    expect("h" in t || "height" in t).toBe(false)
  })

  it("builds a text overlay object (text layer) with complex styling + positioning rules", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Hello World",
        width: "300",
        fontSize: 32,
        fontFamily: "Open Sans",
        color: "#FF00AA",
        backgroundColor: "#00000080",
        innerAlignment: "center",
        padding: {
          mode: "individual",
          padding: { top: 10, right: 20, bottom: 10, left: 20 },
        },
        lineHeight: "3",
        typography: ["bold", "italic"],
        flip: ["horizontal", "vertical"],
        rotation: -15,
        // x/y should be ignored if center coords are present
        positionX: -12,
        positionY: 9,
        lxc: "bw_div_2",
        lyc: "bh_sub_ch",
        opacitySwitch: true,
        opacity: 7,
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(t.raw).toBeUndefined()
    expect(t.overlay).toEqual({
      type: "text",
      text: "Hello World",
      encoding: "auto",
      transformation: [
        {
          width: "300",
          fontColor: "FF00AA",
          fontSize: 32,
          fontFamily: "Open Sans",
          background: "00000080",
          padding: "10_20",
          lineHeight: "3",
          flip: "h_v",
          rotation: "N15",
          alpha: 7,
          typography: "b_i",
          innerAlignment: "center",
        },
      ],
      position: {
        xCenter: "bw_div_2",
        yCenter: "bh_sub_ch",
      },
    })
  })

  it("includes typography (bold) on SDK overlay when text layer uses lfo", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Bold text",
        typography: ["bold"],
        lfo: "center",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(t.raw).toBeUndefined()
    expect(t.overlay?.position?.focus).toBe("center")
    expect(t.overlay?.transformation?.[0]?.typography).toBe("b")
  })

  it("includes typography (italics) on SDK overlay when text layer uses lfo", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Italic text",
        typography: ["italic"],
        lfo: "center",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(t.raw).toBeUndefined()
    expect(t.overlay?.position?.focus).toBe("center")
    expect(t.overlay?.transformation?.[0]?.typography).toBe("i")
  })

  it("includes typography (bold and italics) on SDK overlay when text layer uses lfo", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Bold and Italic text",
        typography: ["bold", "italic"],
        lfo: "center",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(t.raw).toBeUndefined()
    expect(t.overlay?.position?.focus).toBe("center")
    expect(t.overlay?.transformation?.[0]?.typography).toBe("b_i")
  })

  it("does not emit alpha/radius on text overlay when opacity/radius switches are off", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Hello",
        lfo: "center",
        opacitySwitch: false,
        opacity: 9,
        radiusSwitch: false,
        radius: 0,
      }),
    ])
    const tr = (out[0] as any).overlay?.transformation?.[0]
    expect(tr?.alpha).toBeUndefined()
    expect(tr?.radius).toBeUndefined()
  })

  it("emits alpha and radius on text overlay when switches are on (with lfo)", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Hi",
        lfo: "top",
        opacitySwitch: true,
        opacity: 5,
        radiusSwitch: true,
        radius: 3,
      }),
    ])
    const tr = (out[0] as any).overlay?.transformation?.[0]
    expect(tr?.alpha).toBe(5)
    expect(tr?.radius).toBe(3)
  })

  it("SDK text overlay omits alpha when opacitySwitch is false even if opacity is set", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "X",
        fontSize: 14,
        opacitySwitch: false,
        opacity: 9,
        positionX: 1,
        positionY: 2,
      }),
    ])
    const t = out[0] as any
    const tr = t.overlay?.transformation?.[0] as
      | Record<string, unknown>
      | undefined
    expect(tr).toBeDefined()
    expect(tr?.alpha).toBeUndefined()
  })

  it("legacy text layer without opacitySwitch still emits alpha when opacity is in range", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Legacy",
        fontSize: 14,
        opacity: 8,
        positionX: 0,
        positionY: 0,
      }),
    ])
    const tr = (out[0] as any).overlay?.transformation?.[0]
    expect(tr?.alpha).toBe(8)
  })

  it("legacy text layer without opacitySwitch still emits alpha when opacity is in range (with lfo)", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "LegacyRaw",
        lfo: "center",
        opacity: 4,
      }),
    ])
    const tr = (out[0] as any).overlay?.transformation?.[0]
    expect(tr?.alpha).toBe(4)
  })

  it("omits rotation from SDK text overlay when angle is 0 (avoids rt-0 in URL)", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Flat",
        fontSize: 14,
        rotation: 0,
        positionX: 0,
        positionY: 0,
      }),
    ])
    const tr = (out[0] as any).overlay?.transformation?.[0]
    expect(tr?.rotation).toBeUndefined()
  })

  it("omits rotation from SDK text overlay when angle is default string 0", () => {
    const out = buildIkTransformations([
      step("layers-text", {
        text: "Flat2",
        fontSize: 14,
        rotation: "0",
        positionX: 0,
        positionY: 0,
      }),
    ])
    const tr = (out[0] as any).overlay?.transformation?.[0]
    expect(tr?.rotation).toBeUndefined()
  })

  it("builds an image overlay object (image layer) with crop/focus + nested formatter outputs", () => {
    const out = buildIkTransformations([
      step("layers-image", {
        imageUrl: "/folder/overlay.png",
        width: 120,
        height: "80",
        opacityEnabled: true,
        opacity: 6,
        backgroundColor: "#FFFFFF",
        flip: ["horizontal"],
        crop: "cm-pad_resize",
        focusAnchor: "top",
        rotation: 45,
        unsharpenMask: true,
        unsharpenMaskRadius: 2,
        unsharpenMaskSigma: 1,
        unsharpenMaskAmount: 150,
        unsharpenMaskThreshold: 3,
        trimEnabled: true,
        trimThreshold: 12,
        dprEnabled: true,
        dpr: "auto",
        qualityEnabled: true,
        quality: 70,
        blur: 8,
        sharpenEnabled: true,
        sharpen: 50,
        borderWidth: "4",
        borderColor: "#00FF00",
        // also exercise gradient/shadow/distort/radius formatters in the overlay pipeline
        gradientSwitch: true,
        gradient: {
          from: "#FFFFFFFF",
          to: "#00000000",
          direction: "bottom",
          stopPoint: 100,
        },
        shadow: true,
        shadowBlur: 2,
        shadowOffsetX: -5,
        shadowOffsetY: 6,
        distort: true,
        distortType: "arc",
        distortArcDegree: 12,
        radiusSwitch: true,
        radius: 8,
        grayscale: true,
        positionX: -10,
        positionY: 20,
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(t.raw).toBeUndefined()

    // Lock the key behaviors without overfitting to every formatter's exact output string.
    expect(t.overlay?.type).toBe("image")
    expect(t.overlay?.input).toBe("folder/overlay.png")
    expect(t.overlay?.position).toEqual({ x: "N10", y: "20" })

    const tr = t.overlay?.transformation?.[0] as Record<string, unknown>
    expect(tr).toBeDefined()
    expect(tr.width).toBe(120)
    expect(tr.height).toBe("80")
    expect(tr.opacity).toBe(6)
    expect(tr.background).toBe("FFFFFF")
    expect(tr.flip).toBe("h")
    expect(tr.cropMode).toBe("pad_resize")
    expect(tr.focus).toBe("top")
    expect(tr.rotation).toBe(45)
    expect(tr["e-usm"]).toBe("2-1-150-3")
    expect(tr.t).toBe(12)
    expect(tr.dpr).toBe("auto")
    expect(tr.quality).toBe(70)
    expect(tr.blur).toBe(8)
    // sharpen=50 is treated as "no-op" and serialized as empty string in current logic
    expect(tr.sharpen).toBe("")
    expect(tr.b).toBe("4_00FF00")
    expect(tr.grayscale).toBe(true)
  })

  it("builds a canvas layer overlay with position precedence (lfo over coordinates) + optional switches", () => {
    const out = buildIkTransformations([
      step("layers-canvas", {
        width: 640,
        height: 480,
        backgroundColor: "#112233",
        opacitySwitch: true,
        opacity: 7,
        radiusSwitch: true,
        radius: "max",
        gradientSwitch: true,
        gradient: {
          from: "#FFFFFFFF",
          to: "#00000000",
          direction: 90,
          stopPoint: 50,
        },
        // position precedence: lfo > center(lxc/lyc) > topLeft
        positionX: 10,
        positionY: 20,
        lxc: "bw_div_2",
        lyc: "bh_div_2",
        lfo: "center",
      }),
    ])

    expect(out).toHaveLength(1)
    const t = out[0] as any
    expect(t.raw).toBeUndefined()
    expect(t.overlay?.type).toBe("solidColor")
    expect(t.overlay?.color).toBe("112233")
    expect(t.overlay?.position).toEqual({ focus: "center" })
    const tr = t.overlay?.transformation?.[0] as Record<string, unknown>
    expect(tr?.width).toBe(640)
    expect(tr?.height).toBe(480)
    expect(tr?.alpha).toBe(7)
    expect(tr?.radius).toBe("max")
    expect(typeof tr?.gradient).toBe("string")
    expect(tr?.gradient?.length ?? 0).toBeGreaterThan(0)
  })
})
