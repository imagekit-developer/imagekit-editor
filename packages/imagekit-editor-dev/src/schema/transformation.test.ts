import { describe, expect, it } from "vitest"
import {
  commonNumberAndExpressionValidator,
  heightValidator,
  layerXValidator,
  layerYValidator,
  lineHeightValidator,
  widthValidator,
} from "./transformation"

describe("transformation expression validators", () => {
  it("accepts numeric-led add/sub expression chains", () => {
    const expressions = ["500_add_200", "500_sub_200"]
    const validators = [
      widthValidator,
      heightValidator,
      layerXValidator,
      layerYValidator,
      lineHeightValidator,
      commonNumberAndExpressionValidator,
    ]

    for (const validator of validators) {
      for (const expression of expressions) {
        expect(validator.safeParse(expression).success).toBe(true)
      }
    }
  })
})
