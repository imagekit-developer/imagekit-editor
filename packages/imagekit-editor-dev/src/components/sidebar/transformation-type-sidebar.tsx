import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { RiImageEditLine } from "@react-icons/all-files/ri/RiImageEditLine"
import * as React from "react"
import { transformationSchema } from "../../schema"
import { useEditorStore } from "../../store"
import { SidebarBody } from "./sidebar-body"
import { SidebarHeader } from "./sidebar-header"

export const TransformationTypeSidebar: React.FC = () => {
  const { transformations, _setSelectedTransformationKey, _setSidebarState } =
    useEditorStore()

  const onClose = () => {
    _setSidebarState("none")
  }

  const hasTransformations = React.useMemo(
    () => transformations.length > 0,
    [transformations],
  )

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

  // const handleApplyTransformation = (values: Record<string, unknown>) => {
  //   const transformation = transformationSchema
  //     .find(
  //       (transformation) =>
  //         transformation.key === selectedTransformation?.split("-")[0],
  //     )
  //     ?.items.find((item) => item.key === selectedTransformation)

  //   if (!transformation) {
  //     return
  //   }

  //   if (transformationPosition === "inplace" && transformationToEdit) {
  //     updateTransformation(transformationToEdit, {
  //       type: "transformation",
  //       name: transformation.name,
  //       key: transformation.key,
  //       value: {
  //         ...transformation.defaultTransformation,
  //         ...values,
  //       },
  //     })
  //     return { id: transformationToEdit }
  //   } else {
  //     const transformationId = addTransformation({
  //       type: "transformation",
  //       name: transformation.name,
  //       key: transformation.key,
  //       value: {
  //         ...transformation.defaultTransformation,
  //         ...values,
  //       },
  //     })
  //     setTransformationToEdit({
  //       transformationId,
  //       position: "inplace",
  //     })

  //     return { id: transformationId }
  //   }
  // }

  // if (selectedTransformation) {
  //   return (
  //     <TransformationConfigSidebar
  //       transformationKey={selectedTransformation}
  //       onApply={handleApplyTransformation}
  //       transformationToEdit={
  //         transformationPosition === "inplace" ? transformationToEdit : null
  //       }
  //     />
  //   )
  // }

  return (
    <Flex
      width="72"
      height="full"
      direction="column"
      bg="white"
      borderRight="1px"
      borderRightColor="editorBattleshipGrey.100"
    >
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
        {transformationSchema.map((category, index) => (
          <Box
            key={`category-${category.name}`}
            mb={index === transformationSchema.length - 1 ? 0 : 8}
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
    </Flex>
  )
}
