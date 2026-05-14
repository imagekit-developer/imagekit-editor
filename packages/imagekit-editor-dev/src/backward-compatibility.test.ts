import { describe, expect, it } from "vitest"
import { transformationFormatters, transformationSchema } from "./schema"
import type { Transformation } from "./store"
import { TRANSFORMATION_STATE_VERSION } from "./store"

/**
 * V1 Template Fixtures
 * These represent real saved templates from v1 of the editor.
 * Tests ensure these templates continue to work even after UI/schema changes.
 */

// Simple single transformation template
const V1_BASIC_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "adjust-background",
    name: "Background",
    type: "transformation",
    value: {
      backgroundType: "color",
      background: "#FFFFFF",
    },
    version: "v1",
  },
]

// Multiple common transformations
const V1_COMMON_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "resize_and_crop-resize_and_crop",
    name: "Resize and Crop",
    type: "transformation",
    value: {
      width: 800,
      height: 600,
      mode: "pad_resize",
    },
    version: "v1",
  },
  {
    key: "adjust-background",
    name: "Background",
    type: "transformation",
    value: {
      backgroundType: "color",
      background: "#E8E8E8",
    },
    version: "v1",
  },
  {
    key: "adjust-rotate",
    name: "Rotate",
    type: "transformation",
    value: {
      rotate: 90,
    },
    version: "v1",
  },
]

// Complex template with gradient background
const V1_GRADIENT_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "adjust-background",
    name: "Background",
    type: "transformation",
    value: {
      backgroundType: "gradient",
      backgroundGradient: {
        from: "#FFFFFFFF",
        to: "#00000000",
        direction: "bottom",
        stopPoint: 100,
      },
    },
    version: "v1",
  },
]

// AI transformations
const V1_AI_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "ai-bgremove",
    name: "Remove Background",
    type: "transformation",
    value: {
      bgremove: true,
    },
    version: "v1",
  },
  {
    key: "ai-changebg",
    name: "Change Background",
    type: "transformation",
    value: {
      changebg: "beach sunset",
    },
    version: "v1",
  },
]

// Delivery optimizations
const V1_DELIVERY_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "delivery-quality",
    name: "Quality",
    type: "transformation",
    value: {
      quality: 80,
    },
    version: "v1",
  },
  {
    key: "delivery-format",
    name: "Format",
    type: "transformation",
    value: {
      format: "webp",
    },
    version: "v1",
  },
]

// Layer transformations
const V1_LAYER_TEXT_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "layers-text",
    name: "Text",
    type: "transformation",
    value: {
      text: "Hello World",
      fontSize: 48,
      fontColor: "#000000",
      x: 50,
      y: 50,
      fontFamily: "arial",
    },
    version: "v1",
  },
]

// Advanced adjustments
const V1_ADVANCED_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "adjust-contrast",
    name: "Contrast",
    type: "transformation",
    value: {
      contrast: true,
    },
    version: "v1",
  },
  {
    key: "adjust-blur",
    name: "Blur",
    type: "transformation",
    value: {
      blur: 10,
    },
    version: "v1",
  },
  {
    key: "adjust-radius",
    name: "Corner Radius",
    type: "transformation",
    value: {
      radius: {
        radius: 20,
      },
    },
    version: "v1",
  },
]

// Comprehensive template with many transformations
const V1_COMPREHENSIVE_TEMPLATE: Omit<Transformation, "id">[] = [
  {
    key: "resize_and_crop-resize_and_crop",
    name: "Resize and Crop",
    type: "transformation",
    value: {
      width: 1200,
      height: 800,
      mode: "pad_resize",
    },
    version: "v1",
  },
  {
    key: "adjust-background",
    name: "Background",
    type: "transformation",
    value: {
      backgroundType: "color",
      background: "#FAFAFA",
    },
    version: "v1",
  },
  {
    key: "adjust-radius",
    name: "Corner Radius",
    type: "transformation",
    value: {
      radius: {
        radius: 15,
      },
    },
    version: "v1",
  },
  {
    key: "adjust-border",
    name: "Border",
    type: "transformation",
    value: {
      border: 5,
      borderColor: "#333333",
    },
    version: "v1",
  },
  {
    key: "delivery-quality",
    name: "Quality",
    type: "transformation",
    value: {
      quality: 85,
    },
    version: "v1",
  },
  {
    key: "delivery-format",
    name: "Format",
    type: "transformation",
    value: {
      format: "webp",
    },
    version: "v1",
  },
]

// Template without version field (backward compatibility)
const V1_UNVERSIONED_TEMPLATE: Omit<Transformation, "id" | "version">[] = [
  {
    key: "adjust-background",
    name: "Background",
    type: "transformation",
    value: {
      backgroundType: "color",
      background: "#FFFFFF",
    },
  },
  {
    key: "adjust-rotate",
    name: "Rotate",
    type: "transformation",
    value: {
      rotate: 180,
    },
  },
]

/**
 * Helper to find a transformation schema by key
 */
function findTransformationSchema(key: string) {
  for (const category of transformationSchema) {
    const item = category.items.find((item) => item.key === key)
    if (item) {
      return item
    }
  }
  return null
}

/**
 * Helper to check if a transformation key exists in the schema
 */
function isTransformationKeyValid(key: string): boolean {
  return findTransformationSchema(key) !== null
}

/**
 * Validates that a transformation can be processed by the editor
 * - Key must exist in current schema
 * - Structure must be valid (name, type, value)
 * - Value must pass Zod schema validation
 * Returns validation result with details
 */
function validateTransformation(t: Omit<Transformation, "id">): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check basic structure
  if (!t.name) {
    errors.push("Missing 'name' field")
  }
  if (t.type !== "transformation") {
    errors.push(`Invalid type: expected 'transformation', got '${t.type}'`)
  }
  if (!t.value) {
    errors.push("Missing 'value' field")
  }

  // Check if key exists in schema
  const schemaItem = findTransformationSchema(t.key)
  if (!schemaItem) {
    errors.push(`Transformation key '${t.key}' not found in current schema`)
    return { valid: false, errors }
  }

  // Validate value against Zod schema
  try {
    const result = schemaItem.schema.safeParse(t.value)
    if (!result.success) {
      result.error.errors.forEach((err) => {
        errors.push(
          `Schema validation failed for '${err.path.join(".")}': ${err.message}`,
        )
      })
    }
  } catch (error) {
    errors.push(`Schema validation error: ${error}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

describe("Backward Compatibility - V1 Templates", () => {
  describe("Version Constant", () => {
    it("should have v1 as current version", () => {
      expect(TRANSFORMATION_STATE_VERSION).toBe("v1")
    })
  })

  describe("V1 Basic Template", () => {
    it("should parse basic template as valid JSON", () => {
      const json = JSON.stringify(V1_BASIC_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(1)
    })

    it("should have valid transformation keys", () => {
      V1_BASIC_TEMPLATE.forEach((t) => {
        expect(isTransformationKeyValid(t.key)).toBe(true)
      })
    })

    it("should have version field set to v1", () => {
      V1_BASIC_TEMPLATE.forEach((t) => {
        expect(t.version).toBe("v1")
      })
    })

    it("should pass Zod schema validation", () => {
      V1_BASIC_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })
  })

  describe("V1 Common Template", () => {
    it("should parse template as valid JSON", () => {
      const json = JSON.stringify(V1_COMMON_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(3)
    })

    it("should have all valid transformation keys", () => {
      V1_COMMON_TEMPLATE.forEach((t) => {
        expect(isTransformationKeyValid(t.key)).toBe(true)
      })
    })

    it("should pass Zod schema validation", () => {
      V1_COMMON_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })
  })

  describe("V1 Gradient Template", () => {
    it("should parse template as valid JSON", () => {
      const json = JSON.stringify(V1_GRADIENT_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it("should preserve complex gradient values", () => {
      const json = JSON.stringify(V1_GRADIENT_TEMPLATE)
      const parsed = JSON.parse(json)
      const gradient = parsed[0].value.backgroundGradient
      expect(gradient.from).toBe("#FFFFFFFF")
      expect(gradient.to).toBe("#00000000")
      expect(gradient.direction).toBe("bottom")
      expect(gradient.stopPoint).toBe(100)
    })

    it("should pass Zod schema validation", () => {
      V1_GRADIENT_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })
  })

  describe("V1 AI Template", () => {
    it("should parse AI transformations as valid JSON", () => {
      const json = JSON.stringify(V1_AI_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(2)
    })

    it("should have valid AI transformation keys", () => {
      V1_AI_TEMPLATE.forEach((t) => {
        expect(isTransformationKeyValid(t.key)).toBe(true)
      })
    })

    it("should pass Zod schema validation", () => {
      V1_AI_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })
  })

  describe("V1 Delivery Template", () => {
    it("should parse delivery optimizations as valid JSON", () => {
      const json = JSON.stringify(V1_DELIVERY_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(2)
    })

    it("should have valid delivery transformation keys", () => {
      V1_DELIVERY_TEMPLATE.forEach((t) => {
        expect(isTransformationKeyValid(t.key)).toBe(true)
      })
    })

    it("should pass Zod schema validation", () => {
      V1_DELIVERY_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })
  })

  describe("V1 Layer Text Template", () => {
    it("should parse text layer as valid JSON", () => {
      const json = JSON.stringify(V1_LAYER_TEXT_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it("should preserve text layer values", () => {
      const json = JSON.stringify(V1_LAYER_TEXT_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(parsed[0].value.text).toBe("Hello World")
      expect(parsed[0].value.fontSize).toBe(48)
      expect(parsed[0].value.fontColor).toBe("#000000")
    })

    it("should have valid text layer key", () => {
      expect(isTransformationKeyValid(V1_LAYER_TEXT_TEMPLATE[0].key)).toBe(true)
    })
  })

  describe("V1 Advanced Template", () => {
    it("should parse advanced adjustments as valid JSON", () => {
      const json = JSON.stringify(V1_ADVANCED_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(3)
    })

    it("should have all valid transformation keys", () => {
      V1_ADVANCED_TEMPLATE.forEach((t) => {
        expect(isTransformationKeyValid(t.key)).toBe(true)
      })
    })

    it("should pass Zod schema validation", () => {
      V1_ADVANCED_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })
  })

  describe("V1 Comprehensive Template", () => {
    it("should parse template with many transforms", () => {
      const json = JSON.stringify(V1_COMPREHENSIVE_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(6)
    })

    it("should have all valid transformation keys", () => {
      V1_COMPREHENSIVE_TEMPLATE.forEach((t) => {
        expect(isTransformationKeyValid(t.key)).toBe(true)
      })
    })

    it("should pass Zod schema validation", () => {
      V1_COMPREHENSIVE_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })
  })

  describe("V1 Unversioned Template (Backward Compatibility)", () => {
    it("should parse template as valid JSON", () => {
      const json = JSON.stringify(V1_UNVERSIONED_TEMPLATE)
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(2)
    })

    it("should handle missing version field", () => {
      V1_UNVERSIONED_TEMPLATE.forEach((t) => {
        expect(t.version).toBeUndefined()
      })
    })

    it("should have valid transformation keys even without version", () => {
      V1_UNVERSIONED_TEMPLATE.forEach((t) => {
        expect(isTransformationKeyValid(t.key)).toBe(true)
      })
    })

    it("should pass Zod schema validation", () => {
      V1_UNVERSIONED_TEMPLATE.forEach((t) => {
        const result = validateTransformation(t as Omit<Transformation, "id">)
        if (!result.valid) {
          console.error(`Validation errors for ${t.key}:`, result.errors)
        }
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })
    })

    it("should be able to add version to unversioned state", () => {
      const withVersion = V1_UNVERSIONED_TEMPLATE.map((t) => ({
        ...t,
        version: TRANSFORMATION_STATE_VERSION,
      }))

      withVersion.forEach((t) => {
        expect(t.version).toBe("v1")
      })
    })
  })

  describe("Template Serialization Consistency", () => {
    it("should preserve all properties during JSON round-trip", () => {
      const original = V1_COMPREHENSIVE_TEMPLATE
      const json = JSON.stringify(original)
      const parsed = JSON.parse(json)

      expect(parsed.length).toBe(original.length)
      parsed.forEach((t: Omit<Transformation, "id">, i: number) => {
        expect(t.key).toBe(original[i].key)
        expect(t.name).toBe(original[i].name)
        expect(t.type).toBe(original[i].type)
        expect(t.version).toBe(original[i].version)
        expect(JSON.stringify(t.value)).toBe(JSON.stringify(original[i].value))
      })
    })

    it("should handle removal and addition of id field", () => {
      const withId: Transformation = {
        id: "test-123",
        ...V1_BASIC_TEMPLATE[0],
      }

      // Remove id for storage
      const { id: _id, ...forStorage } = withId
      expect(forStorage.id).toBeUndefined()

      // Add id back when loading
      const loaded = {
        ...forStorage,
        id: "new-id-456",
      }
      expect(loaded.id).toBe("new-id-456")
    })
  })

  describe("Schema Key Validation", () => {
    it("should validate all v1 fixture keys exist in current schema", () => {
      const allFixtures = [
        ...V1_BASIC_TEMPLATE,
        ...V1_COMMON_TEMPLATE,
        ...V1_GRADIENT_TEMPLATE,
        ...V1_AI_TEMPLATE,
        ...V1_DELIVERY_TEMPLATE,
        ...V1_LAYER_TEXT_TEMPLATE,
        ...V1_ADVANCED_TEMPLATE,
        ...V1_COMPREHENSIVE_TEMPLATE,
      ]

      const uniqueKeys = new Set(allFixtures.map((t) => t.key))
      const missingKeys: string[] = []

      uniqueKeys.forEach((key) => {
        if (!isTransformationKeyValid(key)) {
          missingKeys.push(key)
        }
      })

      expect(missingKeys).toEqual([])
    })
  })

  describe("Validation Actually Works (Negative Tests)", () => {
    it("should reject transformation with invalid key", () => {
      const invalid: Omit<Transformation, "id"> = {
        key: "nonexistent-transformation",
        name: "Invalid",
        type: "transformation",
        value: {},
        version: "v1",
      }

      const result = validateTransformation(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(
        result.errors.some((e) => e.includes("not found in current schema")),
      ).toBe(true)
    })

    it("should reject transformation with wrong type", () => {
      const invalid: Record<string, unknown> = {
        key: "adjust-background",
        name: "Background",
        type: "wrong-type",
        value: { background: "#FFF" },
        version: "v1",
      }

      const result = validateTransformation(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes("Invalid type"))).toBe(true)
    })

    it("should reject transformation with invalid value structure", () => {
      const invalid: Omit<Transformation, "id"> = {
        key: "adjust-radius",
        name: "Corner Radius",
        type: "transformation",
        value: {
          radius: 999, // Should be an object with {radius: number}
        },
        version: "v1",
      }

      const result = validateTransformation(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it("should reject transformation with missing required fields", () => {
      const invalid: Omit<Transformation, "id"> = {
        key: "adjust-rotate",
        name: "Rotate",
        type: "transformation",
        value: {}, // Missing required 'rotate' field
        version: "v1",
      }

      const result = validateTransformation(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it("should reject transformation with invalid data types", () => {
      const invalid: Omit<Transformation, "id"> = {
        key: "adjust-rotate",
        name: "Rotate",
        type: "transformation",
        value: {
          rotate: "not-a-number", // Should be a number
        },
        version: "v1",
      }

      const result = validateTransformation(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  /**
   * Deep Schema Validation Tests
   * These tests exercise custom validators and complex schema logic to achieve high coverage
   */
  describe("Schema Validators - Width & Height", () => {
    it("should validate width as number", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, height: 600, mode: "c-force" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate width as decimal", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 0.5, height: 600, mode: "c-force" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate width as expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: "iw_div_2", height: 600, mode: "c-force" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate height as expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, height: "ih_mul_1.5", mode: "c-force" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject invalid width expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: "invalid_expr", height: 600, mode: "c-force" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Schema Validators - Color", () => {
    it("should validate 6-digit hex color", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: { backgroundType: "color", background: "#FF5533" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate 3-digit hex color", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: { backgroundType: "color", background: "#F53" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate 8-digit hex color with alpha", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: { backgroundType: "color", background: "#FF5533AA" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate hex without # prefix", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: { backgroundType: "color", background: "FF5533" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject invalid hex color", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: { backgroundType: "color", background: "#GGGGGG" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Schema Validators - Aspect Ratio", () => {
    it("should validate aspect ratio value format", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, aspectRatio: "16-9" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate aspect ratio with decimals", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, aspectRatio: "16.5-9.5" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate aspect ratio expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, aspectRatio: "iar_mul_1.5" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject invalid aspect ratio", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, aspectRatio: "16:9" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should reject aspect ratio without width or height", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { aspectRatio: "16-9" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Schema Validators - Layer Positioning", () => {
    it("should validate layer X as number", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", positionX: "100", fontSize: 24, radius: 0 },
        version: "v1",
      }
      const result = validateTransformation(template)
      if (!result.valid) {
        console.log("Layer X validation errors:", result.errors)
      }
      expect(result.valid).toBe(true)
    })

    it("should validate layer X as negative number", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", positionX: "-50", fontSize: 24, radius: 0 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate layer X as expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          positionX: "bw_div_2",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate layer Y as expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          positionY: "bh_sub_100",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Schema Validators - Layer Anchor & Centre Position (lap/lxc/lyc)", () => {
    // ----- Backwards-compatibility: legacy templates without the new fields
    it("legacy text layer (no anchor/centre fields) still validates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hi",
          positionX: "100",
          positionY: "50",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("legacy image layer (no anchor/centre fields) still validates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image",
        type: "transformation",
        value: {
          imageUrl: "logo.png",
          positionX: "100",
          positionY: "50",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    // ----- Centre-reference (lxc / lyc) accepts numbers + expressions
    it("text layer accepts positionXCenter / positionYCenter as numbers", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hi",
          positionXCenter: "50",
          positionYCenter: "N100",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("image layer accepts positionXCenter / positionYCenter as expressions", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image",
        type: "transformation",
        value: {
          imageUrl: "logo.png",
          positionXCenter: "bw_div_2",
          positionYCenter: "bh_mul_0.4",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    // ----- Mutual exclusion: x + xCenter (and y + yCenter) on the same axis
    it("rejects positionX + positionXCenter set together (text layer)", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hi",
          positionX: "10",
          positionXCenter: "20",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
      expect(result.errors.join("\n")).toMatch(/Position X.*center.*not both/i)
    })

    it("rejects positionY + positionYCenter set together (image layer)", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image",
        type: "transformation",
        value: {
          imageUrl: "logo.png",
          positionY: "10",
          positionYCenter: "20",
        },
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
      expect(result.errors.join("\n")).toMatch(/Position Y.*center.*not both/i)
    })

    // ----- Anchor (lap)
    it("text layer accepts a valid layerAnchor when paired with a position", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hi",
          positionX: "N25",
          positionY: "25",
          layerAnchor: "top_right",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("rejects layerAnchor set without any position offset (text layer)", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hi",
          layerAnchor: "center",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
      expect(result.errors.join("\n")).toMatch(/Anchor Point requires/i)
    })

    it("rejects layerAnchor set without any position offset (image layer)", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image",
        type: "transformation",
        value: {
          imageUrl: "logo.png",
          layerAnchor: "bottom",
        },
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
      expect(result.errors.join("\n")).toMatch(/Anchor Point requires/i)
    })

    it("rejects an unknown anchor value", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image",
        type: "transformation",
        value: {
          imageUrl: "logo.png",
          positionX: "10",
          layerAnchor: "middle",
        },
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    // ----- Formatter: emits xCenter/yCenter/anchorPoint, normalises `-` to `N`
    it("textLayer formatter emits xCenter/yCenter/anchorPoint with negative-prefix normalisation", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.textLayer(
        {
          text: "Hi",
          positionXCenter: "-50",
          positionYCenter: "100",
          layerAnchor: "bottom_right",
        },
        transforms,
      )
      expect(transforms.overlay).toMatchObject({
        type: "text",
        text: "Hi",
        position: {
          xCenter: "N50",
          yCenter: "100",
          anchorPoint: "bottom_right",
        },
      })
    })

    it("imageLayer formatter emits xCenter/yCenter/anchorPoint", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.imageLayer(
        {
          imageUrl: "logo.png",
          positionXCenter: "bw_div_2",
          positionYCenter: "-30",
          layerAnchor: "center",
        },
        transforms,
      )
      expect(transforms.overlay).toMatchObject({
        type: "image",
        input: "logo.png",
        position: {
          xCenter: "bw_div_2",
          yCenter: "N30",
          anchorPoint: "center",
        },
      })
    })

    // ----- Formatter: legacy x/y still flow through unchanged
    it("textLayer formatter without new fields produces no xCenter/yCenter/anchorPoint", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.textLayer(
        { text: "Hi", positionX: "10", positionY: "20" },
        transforms,
      )
      const overlay = transforms.overlay as {
        position: Record<string, unknown>
      }
      expect(overlay.position).toEqual({ x: "10", y: "20" })
      expect(overlay.position.xCenter).toBeUndefined()
      expect(overlay.position.yCenter).toBeUndefined()
      expect(overlay.position.anchorPoint).toBeUndefined()
    })
  })

  describe("Schema Validators - Layer Raw Passthrough (rawTransformation)", () => {
    it("text layer accepts rawTransformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hi",
          fontSize: 24,
          radius: 0,
          rawTransformation: "lm-multiply",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("image layer accepts rawTransformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image",
        type: "transformation",
        value: {
          imageUrl: "logo.png",
          rawTransformation: "e-shadow-st-40_bl-15",
        },
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("textLayer formatter writes rawTransformation into overlay.transformation[0].raw", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.textLayer(
        { text: "Hi", rawTransformation: "lm-multiply" },
        transforms,
      )
      const overlay = transforms.overlay as {
        transformation: Array<{ raw?: string }>
      }
      expect(overlay.transformation[0]?.raw).toBe("lm-multiply")
    })

    it("imageLayer formatter writes rawTransformation into overlay.transformation[0].raw", () => {
      const transforms: Record<string, unknown> = {}
      transformationFormatters.imageLayer(
        { imageUrl: "logo.png", rawTransformation: "e-shadow" },
        transforms,
      )
      const overlay = transforms.overlay as {
        transformation: Array<{ raw?: string }>
      }
      expect(overlay.transformation[0]?.raw).toBe("e-shadow")
    })

    it("formatter trims surrounding whitespace and ignores blank rawTransformation", () => {
      const a: Record<string, unknown> = {}
      transformationFormatters.imageLayer(
        { imageUrl: "logo.png", rawTransformation: "  lm-multiply  " },
        a,
      )
      expect(
        (a.overlay as { transformation: Array<{ raw?: string }> })
          .transformation[0]?.raw,
      ).toBe("lm-multiply")

      const b: Record<string, unknown> = {}
      transformationFormatters.textLayer(
        { text: "Hi", rawTransformation: "   " },
        b,
      )
      const overlayB = b.overlay as {
        transformation?: Array<{ raw?: string }>
      }
      // No styling fields set + blank raw means no inner transformation
      // array is created at all.
      expect(overlayB.transformation).toBeUndefined()
    })
  })

  describe("Nested Layers (children)", () => {
    it("legacy template without children produces a byte-identical URL", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      const layer: Transformation = {
        id: "t1",
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: { imageUrl: "logo.png", width: "100" },
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(layer)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-logo.png,w-100,l-end",
      )
    })

    it("image layer with a nested image child appends a nested overlay step", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      const parent: Transformation = {
        id: "p",
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: { imageUrl: "outer.png" },
        children: [
          {
            id: "c",
            key: "layers-image",
            name: "Inner Logo",
            type: "transformation",
            value: { imageUrl: "inner.png" },
          },
        ],
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(parent)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-outer.png,l-image,i-inner.png,l-end,l-end",
      )
    })

    it("canvas (ik_canvas) layer with text + image children", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      const parent: Transformation = {
        id: "p",
        key: "layers-image",
        name: "Canvas",
        type: "transformation",
        value: { imageUrl: "ik_canvas", width: "500", height: "120" },
        children: [
          {
            id: "c1",
            key: "layers-text",
            name: "Caption",
            type: "transformation",
            value: { text: "Hello", radius: 0 },
          },
          {
            id: "c2",
            key: "layers-image",
            name: "Logo",
            type: "transformation",
            value: { imageUrl: "logo.png" },
          },
        ],
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(parent)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-ik_canvas,w-500,h-120:l-text,i-Hello,r-0,l-end:l-image,i-logo.png,l-end,l-end",
      )
    })

    it("hidden child (enabled === false) is skipped from the URL", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      const parent: Transformation = {
        id: "p",
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: { imageUrl: "outer.png" },
        children: [
          {
            id: "c1",
            key: "layers-image",
            name: "Visible",
            type: "transformation",
            value: { imageUrl: "shown.png" },
          },
          {
            id: "c2",
            key: "layers-image",
            name: "Hidden",
            type: "transformation",
            value: { imageUrl: "hidden.png" },
            enabled: false,
          },
        ],
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(parent)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-outer.png,l-image,i-shown.png,l-end,l-end",
      )
    })

    it("3-level nesting (root + child + grandchild) emits all three layers", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      const root: Transformation = {
        id: "r",
        key: "layers-image",
        name: "Root",
        type: "transformation",
        value: { imageUrl: "outer.png" },
        children: [
          {
            id: "c",
            key: "layers-image",
            name: "Child",
            type: "transformation",
            value: { imageUrl: "middle.png" },
            children: [
              {
                id: "g",
                key: "layers-text",
                name: "Grandchild",
                type: "transformation",
                value: { text: "deep", radius: 0 },
              },
            ],
          },
        ],
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(root)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-outer.png,l-image,i-middle.png,l-text,i-deep,r-0,l-end,l-end,l-end",
      )
    })

    it("findTransformationDeep locates a nested child by id", async () => {
      const { findTransformationDeep } = await import("./store")
      const tree: Transformation[] = [
        {
          id: "root",
          key: "layers-image",
          name: "Root",
          type: "transformation",
          value: { imageUrl: "x.png" },
          children: [
            {
              id: "deep",
              key: "layers-text",
              name: "Deep",
              type: "transformation",
              value: { text: "hi", radius: 0 },
            },
          ],
        },
      ]
      expect(findTransformationDeep(tree, "deep")?.name).toBe("Deep")
      expect(findTransformationDeep(tree, "missing")).toBeUndefined()
    })

    it("non-layer child (ai-removedotbg) is appended as a chained step inside the parent layer", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      // Parent has multiple own-params (image url + width + trim) so the SDK
      // serializes the child with an explicit `:` chain separator. With a
      // single-param parent the SDK collapses to a `,` joiner — equivalent
      // ImageKit syntax, but less obvious that the child is a chained step.
      const parent: Transformation = {
        id: "p",
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "photo.jpg",
          width: "13",
          trimEnabled: true,
          trimThreshold: 10,
        },
        children: [
          {
            id: "c",
            key: "ai-removedotbg",
            name: "Remove Background",
            type: "transformation",
            value: { removedotbg: true },
          },
        ],
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(parent)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-photo.jpg,w-13,t-10:e-removedotbg,l-end",
      )
    })

    it("mixes non-layer and nested-layer children in declaration order", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      const parent: Transformation = {
        id: "p",
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: { imageUrl: "photo.jpg" },
        children: [
          {
            id: "c1",
            key: "adjust-blur",
            name: "Blur",
            type: "transformation",
            value: { blur: 5 },
          },
          {
            id: "c2",
            key: "layers-text",
            name: "Caption",
            type: "transformation",
            value: { text: "Sale", radius: 0 },
          },
        ],
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(parent)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-photo.jpg,bl-5:l-text,i-Sale,r-0,l-end,l-end",
      )
    })

    it("hidden non-layer child is skipped from the URL", async () => {
      const { buildSrc } = await import("@imagekit/javascript")
      const { convertTransformationToIK } = await import(
        "./transformationConverter"
      )
      const parent: Transformation = {
        id: "p",
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: { imageUrl: "photo.jpg" },
        children: [
          {
            id: "c1",
            key: "adjust-blur",
            name: "Blur",
            type: "transformation",
            value: { blur: 5 },
            enabled: false,
          },
        ],
      }
      const url = buildSrc({
        urlEndpoint: "https://ik.imagekit.io/demo",
        src: "/base.jpg",
        transformation: [convertTransformationToIK(parent)],
      })
      expect(url).toBe(
        "https://ik.imagekit.io/demo/base.jpg?tr=l-image,i-photo.jpg,l-end",
      )
    })

    it("isAllowedChildKey enforces per-parent allow lists", async () => {
      const { isAllowedChildKey } = await import("./store")

      // Image layer: liberal allow list including AI + adjust + nested layers.
      expect(isAllowedChildKey("layers-image", "ai-removedotbg")).toBe(true)
      expect(isAllowedChildKey("layers-image", "adjust-blur")).toBe(true)
      expect(isAllowedChildKey("layers-image", "layers-text")).toBe(true)
      // Delivery transforms are output-only; never valid inside a layer block.
      expect(isAllowedChildKey("layers-image", "delivery-format")).toBe(false)

      // Canvas layer: tighter list (no blur/AI), but layers still allowed.
      expect(isAllowedChildKey("layers-canvas", "adjust-radius")).toBe(true)
      expect(isAllowedChildKey("layers-canvas", "adjust-blur")).toBe(false)
      expect(isAllowedChildKey("layers-canvas", "ai-removedotbg")).toBe(false)
      expect(isAllowedChildKey("layers-canvas", "layers-image")).toBe(true)

      // Text layers are leaves: nothing is allowed, including other layers.
      expect(isAllowedChildKey("layers-text", "adjust-blur")).toBe(false)
      expect(isAllowedChildKey("layers-text", "adjust-shadow")).toBe(false)
      expect(isAllowedChildKey("layers-text", "layers-image")).toBe(true)
      // ^ Note: the layer-keys short-circuit returns true here. The picker
      // additionally gates on canHostLayerChildren, which excludes text.
    })

    it("canHostLayerChildren only lets image/canvas host children", async () => {
      const { canHostLayerChildren } = await import("./store")
      expect(canHostLayerChildren("layers-image")).toBe(true)
      expect(canHostLayerChildren("layers-canvas")).toBe(true)
      expect(canHostLayerChildren("layers-text")).toBe(false)
      expect(canHostLayerChildren("adjust-blur")).toBe(false)
    })

    it("getLayerDepth counts only layer ancestors, not non-layer ones", async () => {
      const { getLayerDepth } = await import("./store")
      const tree: Transformation[] = [
        {
          id: "root",
          key: "layers-image",
          name: "Root",
          type: "transformation",
          value: { imageUrl: "a.png" },
          children: [
            {
              // Non-layer child of root layer — itself at depth 0 (it has
              // zero *layer* ancestors above its parent slot).
              id: "blur",
              key: "adjust-blur",
              name: "Blur",
              type: "transformation",
              value: { blur: 4 },
            },
            {
              // Nested layer — depth 1.
              id: "child",
              key: "layers-image",
              name: "Child",
              type: "transformation",
              value: { imageUrl: "b.png" },
              children: [
                {
                  id: "grand",
                  key: "layers-text",
                  name: "Grand",
                  type: "transformation",
                  value: { text: "hi", radius: 0 },
                },
              ],
            },
          ],
        },
      ]
      expect(getLayerDepth(tree, "root")).toBe(0)
      // Non-layer children inherit the parent's depth (they don't open a
      // new l-...,l-end scope).
      expect(getLayerDepth(tree, "blur")).toBe(1)
      expect(getLayerDepth(tree, "child")).toBe(1)
      expect(getLayerDepth(tree, "grand")).toBe(2)
      expect(getLayerDepth(tree, "missing")).toBeUndefined()
    })
  })

  describe("Resize & Crop Complex Validations", () => {
    it("should require mode when both width and height are specified", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, height: 600 }, // Missing mode
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate cm-pad_resize mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-pad_resize",
          backgroundType: "color",
          background: "#FFFFFF",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require both dimensions for blurred background in pad_resize", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          mode: "cm-pad_resize",
          backgroundType: "blurred",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should require both dimensions for generative_fill background", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          height: 600,
          mode: "cm-pad_resize",
          backgroundType: "generative_fill",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate cm-extract mode with focus object", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "object",
          focusObject: "person",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require focusObject when extract mode has object focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "object",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should require focusAnchor when extract mode has anchor focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "anchor",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate extract mode with topleft coordinates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "topleft",
          x: "100",
          y: "100",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require coordinates when extract uses coordinates focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "topleft",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate extract mode with center coordinates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
          xc: "400",
          yc: "300",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate DPR with width", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          dprEnabled: true,
          dpr: 2,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate DPR as auto", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          dprEnabled: true,
          dpr: "auto",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject DPR without width or height", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          dpr: 2,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate c-maintain_ratio with focus anchor", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "c-maintain_ratio",
          focus: "anchor",
          focusAnchor: "center",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require focusAnchor in maintain_ratio with anchor focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "c-maintain_ratio",
          focus: "anchor",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate all resize modes", () => {
      const modes = [
        "c-maintain_ratio",
        "cm-pad_resize",
        "cm-extract",
        "cm-pad_extract",
        "c-force",
        "c-at_max",
        "c-at_max_enlarge",
        "c-at_least",
      ]

      modes.forEach((mode) => {
        const template: Omit<Transformation, "id"> = {
          key: "resize_and_crop-resize_and_crop",
          name: "Resize",
          type: "transformation",
          value: { width: 800, height: 600, mode },
          version: "v1",
        }
        expect(validateTransformation(template).valid).toBe(true)
      })
    })
  })

  describe("Unsharpen Mask Validation", () => {
    it("should validate complete unsharpen mask", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-unsharpen-mask",
        name: "Unsharpen Mask",
        type: "transformation",
        value: {
          unsharpenMaskRadius: 2,
          unsharpenMaskSigma: 1.5,
          unsharpenMaskAmount: 1.2,
          unsharpenMaskThreshold: 0.1,
        },
        version: "v1",
      }
      const result = validateTransformation(template)
      if (!result.valid) {
        console.log("Unsharpen mask errors:", result.errors)
      }
      expect(result.valid).toBe(true)
    })

    it("should require all fields when unsharpen mask is enabled", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-unsharpen-mask",
        name: "Unsharpen Mask",
        type: "transformation",
        value: {
          unsharpenMaskRadius: 2,
          // Missing other required fields (sigma, amount, threshold)
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Additional Transformations Coverage", () => {
    it("should validate shadow transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-shadow",
        name: "Shadow",
        type: "transformation",
        value: {
          shadow: 5,
          shadowBlur: 10,
          shadowOffsetX: 5,
          shadowOffsetY: 5,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate distort transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "perspective",
          distortPerspective: {
            x1: "10",
            y1: "10",
            x2: "100",
            y2: "10",
            x3: "100",
            y3: "100",
            x4: "10",
            y4: "100",
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate border transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-border",
        name: "Border",
        type: "transformation",
        value: {
          borderWidth: 10,
          borderColor: "#000000",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate trim transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-trim",
        name: "Trim",
        type: "transformation",
        value: {
          trimEnabled: true,
          trim: 10,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate color replace transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-color-replace",
        name: "Color Replace",
        type: "transformation",
        value: {
          fromColor: "FF0000",
          toColor: "00FF00",
          tolerance: 20,
        },
        version: "v1",
      }
      const result = validateTransformation(template)
      if (!result.valid) {
        console.log("Color replace errors:", result.errors)
      }
      expect(result.valid).toBe(true)
    })

    it("should validate sharpen transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-sharpen",
        name: "Sharpen",
        type: "transformation",
        value: {
          sharpenEnabled: true,
          sharpen: 5,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate flip transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-flip",
        name: "Flip",
        type: "transformation",
        value: {
          flip: "both",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate opacity transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-opacity",
        name: "Opacity",
        type: "transformation",
        value: {
          opacity: 50,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate AI drop shadow", () => {
      const template: Omit<Transformation, "id"> = {
        key: "ai-dropshadow",
        name: "Drop Shadow",
        type: "transformation",
        value: {
          dropshadow: true,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate AI upscale", () => {
      const template: Omit<Transformation, "id"> = {
        key: "ai-upscale",
        name: "Upscale",
        type: "transformation",
        value: {
          upscale: true,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate AI edit transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "ai-edit",
        name: "Edit Image",
        type: "transformation",
        value: {
          edit: "replace dog with cat",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate image layer", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "https://example.com/image.jpg",
          width: 200,
          height: 200,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate complex text layer with all properties", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text Layer",
        type: "transformation",
        value: {
          text: "Hello World",
          fontSize: 48,
          fontFamily: "Arial",
          color: "000000",
          backgroundColor: "FFFFFF",
          positionX: "100",
          positionY: "200",
          width: 400,
          innerAlignment: "center",
          opacity: 8,
          rotation: 45,
          radius: 10,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate gradient transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-gradient",
        name: "Gradient",
        type: "transformation",
        value: {
          gradientSwitch: true,
          gradient: {
            from: "#FF0000",
            to: "#0000FF",
            direction: "bottom",
            stopPoint: 50,
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate grayscale transformation", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-grayscale",
        name: "Grayscale",
        type: "transformation",
        value: {
          grayscale: true,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Transformation Formatters", () => {
    it("should format background with color", () => {
      const values = { backgroundType: "color", background: "#FF5533" }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("FF5533")
    })

    it("should format background with dominant color", () => {
      const values = {
        backgroundType: "color",
        backgroundDominantAuto: true,
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("dominant")
    })

    it("should format gradient with auto dominant", () => {
      const values = {
        backgroundType: "gradient",
        backgroundGradientAutoDominant: true,
        backgroundGradientPaletteSize: "3",
        backgroundGradientMode: "linear",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("gradient_linear_3")
    })

    it("should format blurred background with negative brightness", () => {
      const values = {
        backgroundType: "blurred",
        backgroundBlurIntensity: "10",
        backgroundBlurBrightness: "-50",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      // Should create blurred background with intensity and brightness
      expect(transforms.background).toBe("blurred_10_N50")
    })
  })

  describe("Validator Edge Cases - Reaching 100% Coverage", () => {
    it("should handle empty string in layerX validator", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", positionX: "", fontSize: 24, radius: 0 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should handle undefined in layerX validator", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", fontSize: 24, radius: 0 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject invalid layerX expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          positionX: "invalid_expr",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should handle empty string in layerY validator", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", positionY: "", fontSize: 24, radius: 0 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject invalid layerY expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", positionY: "badexpr", fontSize: 24, radius: 0 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate line height as integer", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", lineHeight: "24", fontSize: 24, radius: 0 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate line height as expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          lineHeight: "ih_mul_1.5",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should handle empty line height", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: { text: "Hello", lineHeight: "", fontSize: 24, radius: 0 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject invalid line height", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          lineHeight: "not_valid",
          fontSize: 24,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should handle empty aspect ratio", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, aspectRatio: "" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should handle undefined aspect ratio", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800 },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Distort Perspective Validation - Full Coverage", () => {
    it("should reject invalid perspective coordinates (non-numeric)", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "perspective",
          distortPerspective: {
            x1: "abc",
            y1: "10",
            x2: "100",
            y2: "10",
            x3: "100",
            y3: "100",
            x4: "10",
            y4: "100",
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should reject incomplete perspective coordinates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "perspective",
          distortPerspective: {
            x1: "10",
            y1: "10",
            x2: "",
            y2: "",
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should reject invalid perspective coordinate arrangement", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "perspective",
          distortPerspective: {
            x1: "100",
            y1: "100",
            x2: "10",
            y2: "10",
            x3: "10",
            y3: "10",
            x4: "100",
            y4: "100",
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate arc distortion with positive degree", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "arc",
          distortArcDegree: "45",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate arc distortion with negative degree", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "arc",
          distortArcDegree: "-45",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate arc distortion with N prefix for negative", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "arc",
          distortArcDegree: "N45",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject arc with zero degree", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "arc",
          distortArcDegree: "0",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should reject arc with missing degree", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "arc",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should reject arc with non-numeric degree", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "arc",
          distortArcDegree: "abc",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate perspective with N prefix coordinates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-distort",
        name: "Distort",
        type: "transformation",
        value: {
          distort: true,
          distortType: "perspective",
          distortPerspective: {
            x1: "10",
            y1: "10",
            x2: "100",
            y2: "10",
            x3: "100",
            y3: "100",
            x4: "N5",
            y4: "100",
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Background Field Contexts and Formatters", () => {
    it("should format background for generative fill without prompt", () => {
      const values = {
        backgroundType: "generative_fill",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("genfill")
    })

    it("should format background for generative fill with simple prompt", () => {
      const values = {
        backgroundType: "generative_fill",
        backgroundGenerativeFill: "beach",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("genfill-prompt-beach")
    })

    it("should format background for blurred with auto intensity and brightness", () => {
      const values = {
        backgroundType: "blurred",
        backgroundBlurIntensity: "auto",
        backgroundBlurBrightness: "50",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("blurred_auto_50")
    })

    it("should format background for blurred with auto intensity only", () => {
      const values = {
        backgroundType: "blurred",
        backgroundBlurIntensity: "auto",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("blurred_auto")
    })

    it("should format background for blurred with numeric intensity only", () => {
      const values = {
        backgroundType: "blurred",
        backgroundBlurIntensity: "5",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("blurred_5")
    })

    it("should format background for blurred with numeric intensity and brightness", () => {
      const values = {
        backgroundType: "blurred",
        backgroundBlurIntensity: "5",
        backgroundBlurBrightness: "25",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("blurred_5_25")
    })

    it("should format background for blurred fallback", () => {
      const values = {
        backgroundType: "blurred",
        backgroundBlurIntensity: "invalid",
      }
      const transforms: Record<string, unknown> = {}
      transformationFormatters.background(values, transforms)
      expect(transforms.background).toBe("blurred")
    })

    it("should validate gradient with manual colors", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: {
          backgroundType: "gradient",
          backgroundGradient: {
            from: "#FF0000",
            to: "#0000FF",
            direction: "top",
            stopPoint: 75,
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate background with auto gradient different modes", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: {
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
          backgroundGradientMode: "radial",
          backgroundGradientPaletteSize: "4",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Additional Resize & Crop Edge Cases", () => {
    it("should validate cm-pad_extract mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-pad_extract",
          backgroundType: "color",
          background: "#FFFFFF",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate c-at_least mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "c-at_least",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate width with various expression operators", () => {
      const operators = ["add", "sub", "mul", "div", "mod", "pow"]
      operators.forEach((op) => {
        const template: Omit<Transformation, "id"> = {
          key: "resize_and_crop-resize_and_crop",
          name: "Resize",
          type: "transformation",
          value: { width: `iw_${op}_2` },
          version: "v1",
        }
        expect(validateTransformation(template).valid).toBe(true)
      })
    })

    it("should validate height with various base dimensions", () => {
      const bases = ["ih", "bh", "ch"]
      bases.forEach((base) => {
        const template: Omit<Transformation, "id"> = {
          key: "resize_and_crop-resize_and_crop",
          name: "Resize",
          type: "transformation",
          value: { height: `${base}_mul_0.5` },
          version: "v1",
        }
        expect(validateTransformation(template).valid).toBe(true)
      })
    })

    it("should validate aspect ratio with car expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: { width: 800, aspectRatio: "car_mul_1.2" },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should handle object focus in maintain_ratio mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "c-maintain_ratio",
          focus: "object",
          focusObject: "car",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require focusObject in maintain_ratio with object focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "c-maintain_ratio",
          focus: "object",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate extract with center coordinates only xc", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
          xc: "400",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate extract with topleft coordinates only x", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "topleft",
          x: "100",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Typography and Text Layer Advanced", () => {
    it("should validate text with typography array", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          fontSize: 24,
          typography: ["bold", "italic"],
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate text with flip array", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          fontSize: 24,
          flip: ["horizontal"],
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate text with max radius", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          fontSize: 24,
          radius: "max",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate text layer with all alignment options", () => {
      const alignments: Array<"left" | "right" | "center"> = [
        "left",
        "right",
        "center",
      ]
      alignments.forEach((align) => {
        const template: Omit<Transformation, "id"> = {
          key: "layers-text",
          name: "Text",
          type: "transformation",
          value: {
            text: "Hello",
            fontSize: 24,
            innerAlignment: align,
            radius: 0,
          },
          version: "v1",
        }
        expect(validateTransformation(template).valid).toBe(true)
      })
    })

    it("should validate text opacity boundary values", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-text",
        name: "Text",
        type: "transformation",
        value: {
          text: "Hello",
          fontSize: 24,
          opacity: 1,
          radius: 0,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Image Layer Complex Validations", () => {
    it("should validate image layer with border using expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: "bw_div_10",
          borderColor: "FF0000",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject image layer border with invalid expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: "invalid_expr",
          borderColor: "FF0000",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate image layer with unsharpen mask enabled", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
          unsharpenMaskSigma: 1,
          unsharpenMaskAmount: 1.5,
          unsharpenMaskThreshold: 0.05,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require all unsharpen mask fields when enabled for image layer", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate image layer with DPR", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          width: 200,
          dprEnabled: true,
          dpr: 2,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject image layer DPR without dimensions", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          dpr: 2,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate image layer with focus object", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "object",
          focusObject: "person",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require focusObject when image layer has object focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "object",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate image layer with focus anchor", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "anchor",
          focusAnchor: "center",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require focusAnchor when image layer has anchor focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "anchor",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate image layer with topleft coordinates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "topleft",
          x: "50",
          y: "50",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require at least one topleft coordinate for image layer", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "topleft",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate image layer with center coordinates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
          xc: "100",
          yc: "100",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require at least one center coordinate for image layer", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          crop: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate image layer with distort perspective", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          distort: true,
          distortType: "perspective",
          distortPerspective: {
            x1: "10",
            y1: "10",
            x2: "100",
            y2: "10",
            x3: "100",
            y3: "100",
            x4: "10",
            y4: "100",
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate image layer with arc distortion", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          distort: true,
          distortType: "arc",
          distortArcDegree: "30",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate image layer with all overlay effects", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          width: 200,
          height: 200,
          blur: 5,
          shadow: true,
          shadowBlur: 10,
          shadowOffsetX: 5,
          shadowOffsetY: 5,
          grayscale: true,
          opacity: 80,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Common Number and Expression Validator Coverage", () => {
    it("should validate positive number", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: 10,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate ih expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: "ih_div_20",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate bh expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: "bh_mul_0.05",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate ch expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: "ch_add_10",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject negative number for common validator", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: -5,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should reject invalid expression format", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          borderWidth: "invalid_format",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Height Validator Coverage", () => {
    it("should reject invalid height expression", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 100,
          height: "invalid_height_expr",
          mode: "cm-pad_resize",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Unsharpen Mask Error Coverage", () => {
    it("should require sigma when unsharpen mask is enabled", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
          // Missing sigma and other required fields
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should require amount when unsharpen mask is enabled", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
          unsharpenMaskSigma: 1.5,
          // Missing amount
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should require threshold when unsharpen mask is enabled", () => {
      const template: Omit<Transformation, "id"> = {
        key: "layers-image",
        name: "Image Layer",
        type: "transformation",
        value: {
          imageUrl: "overlay.png",
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
          unsharpenMaskSigma: 1.5,
          unsharpenMaskAmount: 1.2,
          // Missing threshold
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Background Gradient Auto Coverage", () => {
    it("should validate background gradient with radial mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: {
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
          backgroundGradientMode: "radial",
          backgroundGradientPaletteSize: "2",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate background gradient with linear mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: {
          backgroundType: "gradient",
          backgroundGradientAutoDominant: true,
          backgroundGradientMode: "linear",
          backgroundGradientPaletteSize: "4",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate manual background gradient", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-background",
        name: "Background",
        type: "transformation",
        value: {
          backgroundType: "gradient",
          backgroundGradientAutoDominant: false,
          backgroundGradient: {
            type: "linear",
            angle: "90",
            stops: [
              { color: "#FF0000", stopPoint: 0 },
              { color: "#0000FF", stopPoint: 100 },
            ],
          },
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Resize Mode Conversion Coverage", () => {
    it("should validate c-at_max_enlarge mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "c-at_max_enlarge",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate c-force mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "c-force",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should validate c-at_max mode", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          mode: "c-at_max",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Maintain Ratio Focus Validations", () => {
    it("should validate maintain_ratio with anchor focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          mode: "c-maintain_ratio",
          focus: "anchor",
          focusAnchor: "center",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require focusAnchor for maintain_ratio with anchor focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          mode: "c-maintain_ratio",
          focus: "anchor",
          // Missing focusAnchor
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should validate maintain_ratio with object focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          mode: "c-maintain_ratio",
          focus: "object",
          focusObject: "person",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require focusObject for maintain_ratio with object focus", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          mode: "c-maintain_ratio",
          focus: "object",
          // Missing focusObject
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })
  })

  describe("Pad Resize Background Validation Errors", () => {
    it("should require width when using blurred background", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          // width missing
          height: 600,
          mode: "cm-pad_resize",
          backgroundType: "blurred",
          backgroundBlurIntensity: 10,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should require height when using blurred background", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          // height missing
          mode: "cm-pad_resize",
          backgroundType: "blurred",
          backgroundBlurIntensity: 10,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should require width when using generative fill", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          // width missing
          height: 600,
          mode: "cm-pad_resize",
          backgroundType: "generative_fill",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should require height when using generative fill", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          // height missing
          mode: "cm-pad_resize",
          backgroundType: "generative_fill",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should pass validation with both dimensions for blurred background", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-pad_resize",
          backgroundType: "blurred",
          backgroundBlurIntensity: 10,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should pass validation with both dimensions for generative fill", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-pad_resize",
          backgroundType: "generative_fill",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Final Coverage Gaps - Missing Validations", () => {
    it("should reject aspect ratio without width or height", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          aspectRatio: "16-9",
          // No width or height
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should accept aspect ratio with width", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          aspectRatio: "16-9",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should require at least one center coordinate for cm-extract with coordinates", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
          // Missing both xc and yc
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should accept center coordinates with at least xc for cm-extract", () => {
      const template: Omit<Transformation, "id"> = {
        key: "resize_and_crop-resize_and_crop",
        name: "Resize and Crop",
        type: "transformation",
        value: {
          width: 800,
          height: 600,
          mode: "cm-extract",
          focus: "coordinates",
          coordinateMethod: "center",
          xc: "400",
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })

    it("should reject unsharpen mask with threshold = 0 as invalid", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-unsharpen-mask",
        name: "Unsharpen Mask",
        type: "transformation",
        value: {
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
          unsharpenMaskSigma: 1,
          unsharpenMaskAmount: 0.5,
          unsharpenMaskThreshold: 0, // Falsy value
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(false)
    })

    it("should reject unsharpen mask with missing threshold", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-unsharpen-mask",
        name: "Unsharpen Mask",
        type: "transformation",
        value: {
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
          unsharpenMaskSigma: 1,
          unsharpenMaskAmount: 0.5,
          // Missing unsharpenMaskThreshold entirely
        },
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes("Threshold"))).toBe(true)
    })

    it("should accept unsharpen mask with valid positive threshold", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-unsharpen-mask",
        name: "Unsharpen Mask",
        type: "transformation",
        value: {
          unsharpenMask: true,
          unsharpenMaskRadius: 2,
          unsharpenMaskSigma: 1,
          unsharpenMaskAmount: 0.5,
          unsharpenMaskThreshold: 0.05,
        },
        version: "v1",
      }
      expect(validateTransformation(template).valid).toBe(true)
    })
  })

  describe("Empty Transformation Validation - At Least One Value Required", () => {
    it("should reject contrast transformation with no values", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-contrast",
        name: "Contrast",
        type: "transformation",
        value: {},
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes("At least one value"))).toBe(
        true,
      )
    })

    it("should reject shadow transformation with no values", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-shadow",
        name: "Shadow",
        type: "transformation",
        value: {},
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
      expect(result.errors?.some((e) => e.includes("At least one value"))).toBe(
        true,
      )
    })

    it("should reject grayscale transformation with no values", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-grayscale",
        name: "Grayscale",
        type: "transformation",
        value: {},
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
    })

    it("should reject radius transformation with no values", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-radius",
        name: "Radius",
        type: "transformation",
        value: {},
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
    })

    it("should reject trim transformation with no values", () => {
      const template: Omit<Transformation, "id"> = {
        key: "adjust-trim",
        name: "Trim",
        type: "transformation",
        value: {},
        version: "v1",
      }
      const result = validateTransformation(template)
      expect(result.valid).toBe(false)
    })
  })
})
