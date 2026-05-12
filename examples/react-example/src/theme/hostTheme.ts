import { extendTheme } from "@chakra-ui/react"

/**
 * Mirrors consuming project's theme's z-index.ts
 * and the component overrides that reference those tokens (tooltip, modal, popover).
 */
const zIndices = {
  hide: -1,
  auto: "auto" as const,
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 2100,
  popover: 2000,
  skipLink: 1600,
  toast: 1700,
  tooltip: 2200,
}

export const hostTheme = extendTheme({
  zIndices,
  styles: {
    global: {
      html: { overflow: "hidden" },
    },
  },
  components: {
    Tooltip: {
      baseStyle: {
        zIndex: "tooltip",
      },
    },
    Popover: {
      baseStyle: {
        popper: {
          zIndex: "popover",
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: {
          zIndex: "modal",
        },
        dialogContainer: {
          zIndex: "modal",
        },
        dialog: {
          zIndex: "modal",
        },
      },
    },
  },
})
