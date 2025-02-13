import {extendTheme} from "@chakra-ui/react";
import {Global as GlobalStyles} from "@emotion/react";
import {selectTheme} from "./select";

export const FontsFaces = () => {
  return (
    <GlobalStyles
      styles={`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;400;500;600&display=swap');
      `}
    />
  );
};

export const theme = extendTheme({
  fonts: {
    body: "Poppins, sans-serif",
  },
  colors: {
    platinum: "#E1E4EB",
    antiFlashWhite: "#EDF2F7",
    independence: "#4A5568",
    cultured: "#F5F7F9",
    aurometalsaurus: "#6C7686",
    aliceblue: "#E9F4FF",
    lavender: "#E5EDFB",
    crayola: "#0450D5",
    slategray: "#718096",
    blue: {
      500: "#0450D5",
      600: "#0450D5",
    },
  },
  sizes: {
    6.626: "1.333rem",
    8.376: "2.188rem",
  },
  components: {
    IKSelect: selectTheme,
  },
});
