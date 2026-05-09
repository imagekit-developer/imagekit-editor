import { describe, expect, it } from "vitest"
import { safeBtoa } from "../utils"
import { buildLayerRawString, type NestedLayer } from "./nestedLayers"

describe("buildLayerRawString", () => {
  describe("text layer (no injected children)", () => {
    it("serializes minimal text with spaces as underscores (i- key)", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "Hello World",
          position: { mode: "none" },
        },
      })
      expect(s).toBe("l-text,i-Hello_World,l-end")
    })

    it("serializes text with typography, size, color, bg, padding, radius, opacity", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "Label",
          width: 300,
          fontSize: 24,
          fontFamily: "Open Sans",
          color: "#FF00AA",
          typography: ["bold", "italic"],
          backgroundColor: "#00000080",
          padding: "10_20",
          radius: 4,
          opacity: 7,
          position: { mode: "none" },
        },
      })
      expect(s).toContain("l-text,i-Label")
      expect(s).toContain("w-300")
      expect(s).toContain("fs-24")
      expect(s).toContain("ff-Open Sans")
      expect(s).toContain("co-FF00AA")
      expect(s).toContain("tg-b_i")
      expect(s).toContain("bg-00000080")
      expect(s).toContain("pa-10_20")
      expect(s).toContain("r-4")
      expect(s).toContain("al-7")
      expect(s).toMatch(/,l-end$/)
    })

    it("maps strikethrough in typography array to tg token", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "S",
          typography: ["strikethrough"],
          position: { mode: "none" },
        },
      })
      expect(s).toContain("tg-strikethrough")
    })

    it("accepts typography as underscore-delimited string (not expanded to b/i)", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "T",
          typography: "b_i",
          position: { mode: "none" },
        },
      })
      expect(s).toContain("tg-b_i")
    })

    it("escapes slashes in fontFamily as @@", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "F",
          fontFamily: "a/b/c",
          position: { mode: "none" },
        },
      })
      expect(s).toContain("ff-a@@b@@c")
    })

    it("uses ie- base64 input when text has characters outside simple overlay charset", () => {
      const text = "Hello!"
      const b64 = safeBtoa(text)
      const s = buildLayerRawString({
        layer: { type: "text", text, position: { mode: "none" } },
      })
      expect(s).toContain("l-text,ie-")
      expect(s).toContain(encodeURIComponent(b64))
      expect(s).not.toContain("i-Hello")
    })

    it("uses ie- when simple text exceeds 2000 chars", () => {
      const text = "a".repeat(2001)
      const b64 = safeBtoa(text)
      const s = buildLayerRawString({
        layer: { type: "text", text, position: { mode: "none" } },
      })
      expect(s).toContain("l-text,ie-")
      expect(s).toContain(encodeURIComponent(b64))
    })

    it("handles empty string text with i- key", () => {
      const s = buildLayerRawString({
        layer: { type: "text", text: "", position: { mode: "none" } },
      })
      expect(s).toBe("l-text,i-,l-end")
    })

    it("position lfo emits lfo-<value>", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "X",
          position: { mode: "lfo", lfo: "top_left" },
        },
      })
      expect(s).toContain("lfo-top_left")
    })

    it("position lfo with empty string omits lfo token", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "X",
          position: { mode: "lfo", lfo: "" },
        },
      })
      expect(s).not.toContain("lfo-")
    })

    it("position topLeft emits lx/ly with N prefix for negative values", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "X",
          position: {
            mode: "topLeft",
            lx: "-10",
            ly: "-5",
            lap: "2",
          },
        },
      })
      expect(s).toContain("lx-N10")
      expect(s).toContain("ly-N5")
      expect(s).toContain("lap-2")
    })

    it("position center emits lxc/lyc with N prefix for leading minus", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "X",
          position: {
            mode: "center",
            lxc: "-12",
            lyc: "bw_div_2",
          },
        },
      })
      expect(s).toContain("lxc-N12")
      expect(s).toContain("lyc-bw_div_2")
    })

    it("omits width/fontSize when empty string", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "Z",
          width: "",
          fontSize: "",
          position: { mode: "none" },
        },
      })
      expect(s).toBe("l-text,i-Z,l-end")
    })

    it("omits optional transforms when undefined", () => {
      const s = buildLayerRawString({
        layer: { type: "text", text: "A", position: { mode: "none" } },
      })
      expect(s).toBe("l-text,i-A,l-end")
    })

    it("does not emit tg- when typography is an empty array", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "T",
          typography: [],
          position: { mode: "none" },
        },
      })
      expect(s).not.toContain("tg-")
    })

    it("maps bold-only typography array to tg-b", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "B",
          typography: ["bold"],
          position: { mode: "none" },
        },
      })
      expect(s).toContain("tg-b")
      expect(s).not.toContain("tg-b_i")
    })
  })

  describe("image layer (no injected children)", () => {
    it("serializes minimal image path with i- key", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "photo.jpg",
          position: { mode: "none" },
        },
      })
      expect(s).toBe("l-image,i-photo.jpg,l-end")
    })

    it("maps path slashes to @@ and strips leading @@", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "/folder/sub/file.png",
          position: { mode: "none" },
        },
      })
      expect(s).toContain("i-folder@@sub@@file.png")
    })

    it("serializes width, height, opacity (o-), bg, radius", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "x.jpg",
          width: 150,
          height: 100,
          opacity: 5,
          backgroundColor: "#CCCCCC",
          radius: 8,
          position: { mode: "none" },
        },
      })
      expect(s).toContain("w-150")
      expect(s).toContain("h-100")
      expect(s).toContain("o-5")
      expect(s).toContain("bg-CCCCCC")
      expect(s).toContain("r-8")
    })

    it("uses ie- when path contains characters outside simple i- charset", () => {
      const imageUrl = "weird name?.jpg"
      const b64 = safeBtoa(imageUrl)
      const s = buildLayerRawString({
        layer: { type: "image", imageUrl, position: { mode: "none" } },
      })
      expect(s).toContain("l-image,ie-")
      expect(s).toContain(encodeURIComponent(b64))
    })

    it("position lfo on image layer", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "a.jpg",
          position: { mode: "lfo", lfo: "bottom_right" },
        },
      })
      expect(s).toContain("lfo-bottom_right")
    })

    it("omits o- when image opacity is not a finite number", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "z.jpg",
          opacity: undefined,
          position: { mode: "none" },
        },
      })
      expect(s).not.toContain("o-")
    })

    it("position center with lap only", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "p.jpg",
          position: { mode: "center", lap: "3" },
        },
      })
      expect(s).toContain("lap-3")
      expect(s).not.toContain("lxc-")
    })
  })

  describe("canvas layer", () => {
    it("serializes primitive canvas (ik_canvas only + l-end)", () => {
      const s = buildLayerRawString({
        layer: { type: "canvas", position: { mode: "none" } },
      })
      expect(s).toBe("l-image,i-ik_canvas,l-end")
    })

    it("serializes w, h, bg, al, r", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: 600,
          height: 200,
          backgroundColor: "#FF0000",
          opacity: 7,
          radius: 20,
          position: { mode: "none" },
        },
      })
      expect(s).toContain("l-image,i-ik_canvas")
      expect(s).toContain("w-600")
      expect(s).toContain("h-200")
      expect(s).toContain("bg-FF0000")
      expect(s).toContain("al-7")
      expect(s).toContain("r-20")
      expect(s).toMatch(/,l-end$/)
    })

    it("includes e-gradient when gradient payload is complete", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: 100,
          height: 100,
          gradient: {
            direction: 90,
            from: "#FFFFFFFF",
            to: "#00000000",
            stopPoint: 50,
          },
          position: { mode: "none" },
        },
      })
      expect(s).toContain("e-gradient-ld-90_from-FFFFFFFF_to-00000000_sp-0.5")
    })

    it("omits e-gradient when from/to/direction incomplete", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: 10,
          height: 10,
          gradient: { from: "#FF0000", to: "#00FF00" },
          position: { mode: "none" },
        },
      })
      expect(s).not.toContain("e-gradient")
    })

    it("serializes gradient with string direction and default stopPoint", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: 1,
          height: 1,
          gradient: {
            direction: "bottom",
            from: "#FF0000",
            to: "#0000FF",
          },
          position: { mode: "none" },
        },
      })
      expect(s).toContain("e-gradient-ld-bottom_from-FF0000_to-0000FF_sp-1")
    })

    it("emits al-0 when canvas opacity is zero", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          opacity: 0,
          position: { mode: "none" },
        },
      })
      expect(s).toContain("al-0")
    })

    it("chains multiple image siblings inside canvas with colon", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: 500,
          height: 400,
          backgroundColor: "CCCCCC",
          position: { mode: "none" },
          children: [
            {
              type: "image",
              imageUrl: "food.jpg",
              width: 150,
              height: 100,
              position: { mode: "lfo", lfo: "top_left" },
            },
            {
              type: "image",
              imageUrl: "food.jpg",
              width: 150,
              height: 100,
              position: { mode: "lfo", lfo: "bottom_right" },
            },
          ],
        },
      })
      expect(s).toContain(
        "l-image,i-food.jpg,w-150,h-100,lfo-top_left,l-end:l-image,i-food.jpg,w-150,h-100,lfo-bottom_right,l-end",
      )
    })

    it("omits w/h when null or empty string", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: "",
          height: null as unknown as number,
          position: { mode: "none" },
        },
      })
      expect(s).not.toContain("w-")
      expect(s).not.toContain("h-")
    })

    it("nests text children comma-separated then colon-chained siblings", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: 500,
          height: 120,
          backgroundColor: "FF0000",
          position: { mode: "none" },
          children: [
            {
              type: "text",
              text: "Top",
              fontSize: 36,
              position: { mode: "lfo", lfo: "top" },
            },
            {
              type: "text",
              text: "Bottom",
              fontSize: 36,
              position: { mode: "lfo", lfo: "bottom" },
            },
          ],
        },
      })
      expect(s).toContain(
        "l-image,i-ik_canvas,w-500,h-120,bg-FF0000,l-text,i-Top,fs-36,lfo-top,l-end:l-text,i-Bottom,fs-36,lfo-bottom,l-end,l-end",
      )
    })

    it("filters falsy entries from canvas children", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          position: { mode: "none" },
          children: [
            undefined as unknown as NestedLayer,
            { type: "text", text: "Only", position: { mode: "none" } },
          ],
        },
      })
      expect(s).toContain("i-Only")
      expect(s.match(/l-text/g)?.length).toBe(1)
    })

    it("nests canvas inside canvas", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          width: 200,
          height: 100,
          backgroundColor: "blue",
          position: { mode: "none" },
          children: [
            {
              type: "canvas",
              width: 100,
              height: 100,
              backgroundColor: "yellow",
              position: { mode: "none" },
            },
          ],
        },
      })
      expect(s).toContain("l-image,i-ik_canvas,w-200,h-100,bg-blue,")
      expect(s).toContain("l-image,i-ik_canvas,w-100,h-100,bg-yellow,l-end")
      expect(s).toMatch(/,l-end$/)
    })

    it("merges children argument over layer.children for canvas", () => {
      const fromLayer: NestedLayer[] = [
        { type: "text", text: "FromLayer", position: { mode: "none" } },
      ]
      const fromArg: NestedLayer[] = [
        { type: "text", text: "FromArg", position: { mode: "none" } },
      ]
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          position: { mode: "none" },
          children: fromLayer,
        },
        children: fromArg,
      })
      expect(s).toContain("FromArg")
      expect(s).not.toContain("FromLayer")
    })

    it("uses layer.children when children argument is undefined", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          position: { mode: "none" },
          children: [
            { type: "text", text: "Child", position: { mode: "none" } },
          ],
        },
      })
      expect(s).toContain("i-Child")
    })

    it("empty children array argument clears nested blocks (overrides layer.children)", () => {
      const s = buildLayerRawString({
        layer: {
          type: "canvas",
          position: { mode: "none" },
          children: [
            { type: "text", text: "Hidden", position: { mode: "none" } },
          ],
        },
        children: [],
      })
      expect(s).toBe("l-image,i-ik_canvas,l-end")
      expect(s).not.toContain("Hidden")
    })
  })

  describe("injected children (text/image parents)", () => {
    it("injects child blocks before parent l-end for text parent", () => {
      const s = buildLayerRawString({
        layer: {
          type: "text",
          text: "Title",
          fontSize: 20,
          position: { mode: "none" },
        },
        children: [
          {
            type: "text",
            text: "Sub",
            fontSize: 12,
            position: { mode: "none" },
          },
        ],
      })
      expect(s).toBe("l-text,i-Title,fs-20,l-text,i-Sub,fs-12,l-end,l-end")
    })

    it("chains multiple injected children with colon", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "card.png",
          width: 400,
          position: { mode: "none" },
        },
        children: [
          {
            type: "text",
            text: "A",
            position: { mode: "lfo", lfo: "top" },
          },
          {
            type: "text",
            text: "B",
            position: { mode: "lfo", lfo: "bottom" },
          },
        ],
      })
      expect(s).toContain(
        "l-image,i-card.png,w-400,l-text,i-A,lfo-top,l-end:l-text,i-B,lfo-bottom,l-end,l-end",
      )
    })

    it("ignores injected children when array is empty", () => {
      const s = buildLayerRawString({
        layer: { type: "text", text: "Solo", position: { mode: "none" } },
        children: [],
      })
      expect(s).toBe("l-text,i-Solo,l-end")
    })

    it("injects nested canvas under image parent", () => {
      const s = buildLayerRawString({
        layer: {
          type: "image",
          imageUrl: "base.jpg",
          position: { mode: "none" },
        },
        children: [
          {
            type: "canvas",
            width: 100,
            height: 50,
            position: { mode: "none" },
            children: [
              { type: "text", text: "In", position: { mode: "none" } },
            ],
          },
        ],
      })
      expect(s).toContain("l-image,i-base.jpg,")
      expect(s).toContain(
        "l-image,i-ik_canvas,w-100,h-50,l-text,i-In,l-end,l-end",
      )
      expect(s).toMatch(/,l-end$/)
    })
  })

  describe("position omitted / undefined", () => {
    it("treats missing position like none for text", () => {
      const s = buildLayerRawString({
        layer: { type: "text", text: "P" },
      })
      expect(s).toBe("l-text,i-P,l-end")
    })
  })
})
