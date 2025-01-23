import {FormControl, FormLabel, Textarea} from "@chakra-ui/react";
import {SET_BACKGROUND_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {Tools} from "../../../utils/constants";

export const AIBackgroundSubMenu = () => {
  const [{tool}, dispatch] = useEditorContext();
  const backgroundConfig = tool.options[Tools.BACKGROUND];

  return (
    <>
      <FormControl>
        <FormLabel>Prompt</FormLabel>
        <Textarea
          maxLength={256}
          placeholder="Describe what you would like to generate as background"
          value={backgroundConfig.aiPrompt}
          onChange={(e) => {
            dispatch({
              type: SET_BACKGROUND_OPTIONS,
              payload: {
                aiPrompt: e.target.value,
                solidColor: undefined,
              },
            });
          }}
        />
      </FormControl>
    </>
  );
};
