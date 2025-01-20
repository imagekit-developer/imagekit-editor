import {Button, Flex, Heading, Icon, IconButton, Menu, MenuButton, MenuItem, MenuList, Spacer} from "@chakra-ui/react";
import {IoIosArrowDown} from "@react-icons/all-files/io/IoIosArrowDown";
import {IoIosArrowRoundBack} from "@react-icons/all-files/io/IoIosArrowRoundBack";
import {useEditorContext} from "../../context";

interface HeaderProps {
  onClose(): void;
  exportActions: Array<{
    label: string;
    onClick(url: string): void;
  }>;
}

const ExportActions = ({exportActions}: {exportActions: HeaderProps["exportActions"]}) => {
  const [{imageUrl}] = useEditorContext();

  if (exportActions.length === 0) {
    return null;
  }

  if (exportActions.length === 1) {
    const [exportAction] = exportActions;
    return (
      <Button colorScheme="blue" variant="solid" size="sm">
        {exportAction.label}
      </Button>
    );
  }

  return (
    <Menu isLazy>
      <MenuButton as={Button} rightIcon={<Icon as={IoIosArrowDown} />} colorScheme="blue" variant="solid" size="sm">
        Export
      </MenuButton>
      <MenuList>
        {exportActions.map(({label, onClick}) => (
          <MenuItem key={label} onClick={() => onClick(imageUrl)}>
            {label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};

export const Header = (props: HeaderProps) => {
  const {onClose, exportActions} = props;

  const [{imageName}] = useEditorContext();

  return (
    <Flex
      as="nav"
      h="14"
      flexDirection="row"
      justifyContent="center"
      alignItems="center"
      px="6"
      pt="1px"
      borderBottom={"1px"}
      borderBottomColor={"platinum"}
      gap="4"
      w="full"
      flexShrink={0}
    >
      <IconButton
        size="sm"
        icon={<Icon boxSize={"6.626"} as={IoIosArrowRoundBack} />}
        aria-label="Back Button"
        onClick={onClose}
        variant="outline"
      ></IconButton>
      <Heading as={"span"} fontWeight="medium" fontSize="md">
        {imageName}
      </Heading>
      <Spacer />
      <Button colorScheme="blue" variant="outline" size="sm" isDisabled>
        Reset to default
      </Button>
      <ExportActions exportActions={exportActions} />
    </Flex>
  );
};
