import type React from "react"

/**
 * Chakra components sometimes have strict generic/polymorphic typings that can
 * get in the way of our JSX usage (especially `as="button"` and certain prop
 * combinations). This helper centralizes the escape hatch so individual
 * components don't need repeated `as unknown as React.ElementType` boilerplate.
 */
export function chakraAny(component: unknown): React.ElementType {
  return component as unknown as React.ElementType
}
