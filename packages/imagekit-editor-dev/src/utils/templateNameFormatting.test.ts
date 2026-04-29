import { describe, expect, it } from "vitest"
import { formatTemplateNameForUI } from "./index"

describe("formatTemplateNameForUI", () => {
  it("returns plain names unchanged", () => {
    expect(formatTemplateNameForUI("Untitled Template")).toBe(
      "Untitled Template",
    )
    expect(formatTemplateNameForUI("A & B")).toBe("A & B")
    expect(formatTemplateNameForUI("Hello <>")).toBe("Hello <>")
  })

  it("decodes common HTML entities", () => {
    expect(formatTemplateNameForUI("A &amp; B")).toBe("A & B")
    expect(formatTemplateNameForUI("&lt;tag&gt;")).toBe("<tag>")
    expect(formatTemplateNameForUI("She said &quot;hi&quot;")).toBe(
      'She said "hi"',
    )
    expect(formatTemplateNameForUI("It&apos;s ok")).toBe("It's ok")
    expect(formatTemplateNameForUI("a&nbsp;b")).toBe("a b")
  })

  it("decodes numeric entities (decimal + hex)", () => {
    expect(formatTemplateNameForUI("&#60;")).toBe("<")
    expect(formatTemplateNameForUI("&#x3C;")).toBe("<")
    expect(formatTemplateNameForUI("&#62;&#62;")).toBe(">>")
    expect(formatTemplateNameForUI("&#x1F44D;")).toBe("👍")
  })

  it("decodes double-encoded entity sequences", () => {
    expect(formatTemplateNameForUI("&amp;lt;")).toBe("<")
    expect(formatTemplateNameForUI("&amp;lt;&amp;gt;")).toBe("<>")
    expect(formatTemplateNameForUI("Tom &amp;amp; Jerry")).toBe("Tom & Jerry")
  })

  it("handles malformed entities missing semicolons (common in stored template names)", () => {
    expect(formatTemplateNameForUI("&amp;lt&gt;&gt;")).toBe("<>>")

    // Other missing-semicolon variants
    expect(formatTemplateNameForUI("&amp;lt;div&gt")).toBe("<div>")
    expect(formatTemplateNameForUI("A&amp;nbspB")).toBe("A B")
  })

  it("leaves unknown entities as-is", () => {
    expect(formatTemplateNameForUI("&doesNotExist;")).toBe("&doesNotExist;")
    expect(formatTemplateNameForUI("&copy; 2026")).toBe("&copy; 2026")
  })
})
