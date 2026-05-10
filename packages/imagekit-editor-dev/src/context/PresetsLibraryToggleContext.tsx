import { createContext, useContext } from "react"

/**
 * Tiny shim exposing a way to open the presets library modal from anywhere
 * inside the editor (e.g. the sidebar's "Manage presets…" menu item).
 *
 * Provided by `EditorLayout`, which also owns the modal state. Components
 * outside the editor layout receive `null` and should fall back to not
 * rendering the affordance.
 */
export const PresetsLibraryToggleContext = createContext<{
  open: () => void
} | null>(null)

export function usePresetsLibraryToggle() {
  return useContext(PresetsLibraryToggleContext)
}
