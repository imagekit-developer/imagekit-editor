import {theme} from "@chakra-ui/theme";
import {selectAnatomy} from "./anatomy";

export const selectTheme = {
  parts: selectAnatomy.keys,
  defaultProps: theme.components.Input.defaultProps,
  baseStyle: theme.components.Input.baseStyle,
  sizes: theme.components.Input.sizes,
  variants: theme.components.Input.variants,
};
