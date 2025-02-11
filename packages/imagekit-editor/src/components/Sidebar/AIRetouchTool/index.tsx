import {Flex, FormControl, FormLabel, Heading, Switch} from "@chakra-ui/react";
import {SET_AI_RETOUCH_OPTIONS} from "../../../actions";
import {useEditorContext} from "../../../context";
import {Tools} from "../../../utils/constants";
import {InfoButton} from "../../common/InfoButton";

export const AIRetouchTool = () => {
  const [{tool, imageDimensions}, dispatch] = useEditorContext();
  const aiRetouchConfig = tool.options[Tools.AI_RETOUCH];

  return (
    <>
      <Flex direction="column" gap="6">
        <FormControl>
          <Flex justifyContent={"space-between"} alignItems={"center"}>
            <Heading as={FormLabel} size="sm" fontWeight="medium" htmlFor="ai-retouch" margin="0">
              Retouch Image
              <InfoButton
                label="Retouch Image Documentation"
                url="https://imagekit.io/docs/ai-transformations#retouch-e-retouch"
              />
            </Heading>
            <Switch
              id="ai-retouch"
              isChecked={aiRetouchConfig.enabled}
              onChange={(value) => {
                dispatch({
                  type: SET_AI_RETOUCH_OPTIONS,
                  payload: {
                    enabled: value.target.checked,
                  },
                });
              }}
            />
          </Flex>
        </FormControl>
      </Flex>
    </>
  );
};
