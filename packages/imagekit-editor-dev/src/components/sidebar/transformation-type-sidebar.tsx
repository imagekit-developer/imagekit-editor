import {
  Box,
  Button,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  VStack,
} from "@chakra-ui/react"
import { PiMagnifyingGlass } from "@react-icons/all-files/pi/PiMagnifyingGlass"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { RiImageEditLine } from "@react-icons/all-files/ri/RiImageEditLine"
import * as React from "react"
import { transformationSchema } from "../../schema"
import { useEditorStore } from "../../store"
import { SidebarBody } from "./sidebar-body"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"

export const TransformationTypeSidebar: React.FC = () => {
  const { transformations, _setSelectedTransformationKey, _setSidebarState } =
    useEditorStore()
  const [searchQuery, setSearchQuery] = React.useState("")

  const onClose = () => {
    _setSidebarState("none")
  }

  const hasTransformations = React.useMemo(
    () => transformations.length > 0,
    [transformations],
  )

  const filteredTransformationSchema = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return transformationSchema
    }

    return transformationSchema
      .map((category) => ({
        ...category,
        items: category.items.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
      .filter((category) => category.items.length > 0)
  }, [searchQuery])

  const handleSelectTransformation = (key: string) => {
    const transformation = transformationSchema
      .find((transformation) => transformation.key === key.split("-")[0])
      ?.items.find((item) => item.key === key)

    if (!transformation) {
      return
    }

    _setSelectedTransformationKey(key)
    _setSidebarState("config")
  }

  return (
    <SidebarRoot>
      <SidebarHeader justifyContent="space-between">
        <Text fontSize="xs" fontWeight="normal" mt={0}>
          Add Transformation
        </Text>
        {hasTransformations && (
          <IconButton
            icon={<Icon as={PiX} />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close Button"
          />
        )}
      </SidebarHeader>
      <SidebarBody p="2">
        <Box mb={2}>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={PiMagnifyingGlass} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search transformations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg="white"
              borderRadius="md"
              borderColor="gray.200"
              _hover={{ borderColor: "gray.300" }}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px #3182ce",
              }}
            />
          </InputGroup>
        </Box>
        {filteredTransformationSchema.map((category, index) => (
          <Box
            key={`category-${category.name}`}
            mb={index === filteredTransformationSchema.length - 1 ? 0 : 8}
          >
            <Text color="gray.500" fontSize="sm" m={2}>
              {category.name}
            </Text>
            <VStack spacing={0} align="stretch" p="0">
              {category.items.map((item) => (
                <Button
                  key={`item-${category.name}-${item.name}`}
                  onClick={() => handleSelectTransformation(item.key)}
                  justifyContent="flex-start"
                  variant="outline"
                  borderRadius="0"
                  borderWidth="0px 0px 1px 0px"
                  borderColor="editorBattleshipGrey.100"
                  size="sm"
                  py="4"
                  sx={{
                    "&:last-of-type": {
                      borderBottomWidth: "0px",
                    },
                  }}
                  leftIcon={<Icon color="gray.500" as={RiImageEditLine} />}
                >
                  <Text fontSize="xs" fontWeight="normal">
                    {item.name}
                  </Text>
                </Button>
              ))}
            </VStack>
          </Box>
        ))}
      </SidebarBody>
    </SidebarRoot>
  )
}
