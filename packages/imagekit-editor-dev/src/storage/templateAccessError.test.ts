import { describe, expect, it, vi } from "vitest"
import {
  applyTemplateStorageAccessFailure,
  isTemplateAccessDeniedError,
  TemplateAccessDeniedError,
} from "./templateAccessError"

describe("isTemplateAccessDeniedError", () => {
  it("is true for TemplateAccessDeniedError", () => {
    expect(isTemplateAccessDeniedError(new TemplateAccessDeniedError())).toBe(
      true,
    )
  })

  it("is true for object with status 401 or 403", () => {
    expect(isTemplateAccessDeniedError({ status: 401 })).toBe(true)
    expect(isTemplateAccessDeniedError({ status: 403 })).toBe(true)
  })

  it("is false for other status or non-objects", () => {
    expect(isTemplateAccessDeniedError({ status: 404 })).toBe(false)
    expect(isTemplateAccessDeniedError(new Error("x"))).toBe(false)
    expect(isTemplateAccessDeniedError(null)).toBe(false)
  })
})

describe("applyTemplateStorageAccessFailure", () => {
  it("returns false and does not call actions when not an access error", () => {
    const deny = vi.fn()
    expect(
      applyTemplateStorageAccessFailure(new Error("nope"), {
        denyTemplateStorageAccessAndReset: deny,
      }),
    ).toBe(false)
    expect(deny).not.toHaveBeenCalled()
  })

  it("calls deny with message for TemplateAccessDeniedError", () => {
    const deny = vi.fn()
    const err = new TemplateAccessDeniedError("custom", 403)
    expect(
      applyTemplateStorageAccessFailure(err, {
        denyTemplateStorageAccessAndReset: deny,
      }),
    ).toBe(true)
    expect(deny).toHaveBeenCalledWith("custom")
  })

  it("calls deny with default message for status-shaped error", () => {
    const deny = vi.fn()
    expect(
      applyTemplateStorageAccessFailure(
        { status: 403 },
        { denyTemplateStorageAccessAndReset: deny },
      ),
    ).toBe(true)
    expect(deny).toHaveBeenCalledWith(
      "You no longer have access to this template.",
    )
  })
})
