import {
  Box,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { PiArrowDown } from "@react-icons/all-files/pi/PiArrowDown"
import { PiArrowUp } from "@react-icons/all-files/pi/PiArrowUp"
import { PiDotsSixVerticalBold } from "@react-icons/all-files/pi/PiDotsSixVerticalBold"
import { PiDotsThreeVertical } from "@react-icons/all-files/pi/PiDotsThreeVertical"
import { PiEye } from "@react-icons/all-files/pi/PiEye"
import { PiEyeSlash } from "@react-icons/all-files/pi/PiEyeSlash"
import { PiPencilSimple } from "@react-icons/all-files/pi/PiPencilSimple"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiRectangle } from "@react-icons/all-files/pi/PiRectangle"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { type Transformation, useEditorStore } from "../../store"
import Hover from "../common/Hover"

export type TransformationPosition = "inplace" | number

interface SortableTransformationItemProps {
  transformation: Transformation
}

export const SortableTransformationItem = ({
  transformation,
}: SortableTransformationItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: transformation.id,
  })

  const {
    transformations,
    moveTransformation,
    visibleTransformations,
    removeTransformation,
    toggleTransformationVisibility,
    _setSidebarState,
    _setSelectedTransformationKey,
    _setTransformationToEdit,
    _internalState,
  } = useEditorStore()

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  const isVisible = visibleTransformations[transformation.id]

  const isEditting =
    _internalState.transformationToEdit?.transformationId === transformation.id

  return (
    <Hover display="flex">
      {(isHover) => (
        <HStack
          ref={setNodeRef}
          px={4}
          py={2}
          cursor={isDragging ? "grabbing" : "pointer"}
          bg={isHover ? "gray.100" : isEditting ? "gray.100" : undefined}
          color={isEditting ? "editorBlue.400" : undefined}
          transition="background-color 0.2s, opacity 0.2s"
          spacing={3}
          position="relative"
          width="full"
          minH="8"
          alignItems="center"
          style={style}
          onClick={() => {
            _setSidebarState("config")
            _setSelectedTransformationKey(transformation.key)
            _setTransformationToEdit(transformation.id, "inplace")
          }}
          {...attributes}
          {...listeners}
        >
          {isHover ? (
            <Box
              cursor="grab"
              mr={-1}
              transition="opacity 0.2s"
              opacity={isHover ? 1 : 0}
              _hover={{ opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              height="24px"
              display="flex"
              alignItems="center"
              w="5"
            >
              <Icon as={PiDotsSixVerticalBold} boxSize={4} color="gray.500" />
            </Box>
          ) : (
            <Box mr={-1} height="24px" display="flex" alignItems="center" w="5">
              <Icon as={PiRectangle} boxSize={4} opacity={0.7} />
            </Box>
          )}

          <Text fontSize="md" opacity={isVisible ? 1 : 0.5}>
            {transformation.name}
          </Text>
          <Box flex={1} />
          {isHover && (
            <HStack spacing={1} color={"initial"}>
              <Box
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTransformationVisibility(transformation.id)
                }}
              >
                <Icon
                  as={isVisible ? PiEye : PiEyeSlash}
                  color="gray.500"
                  boxSize={4}
                  opacity={0.7}
                  _hover={{ opacity: 1 }}
                />
              </Box>
              <Menu closeOnSelect isLazy placement="bottom-end">
                <MenuButton
                  as="button"
                  aria-label="Options"
                  onClick={(e) => e.stopPropagation()}
                  p={0}
                  bg="transparent"
                  _hover={{ bg: "transparent" }}
                >
                  <Icon
                    as={PiDotsThreeVertical}
                    color="gray.500"
                    boxSize={4}
                    opacity={0.7}
                    _hover={{ opacity: 1 }}
                  />
                </MenuButton>
                <MenuList fontSize="md" minW="200px" zIndex={10}>
                  <MenuItem
                    icon={<Icon as={PiPlus} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      _setSidebarState("type")
                      _setTransformationToEdit(transformation.id, "above")
                    }}
                  >
                    Add transformation above
                  </MenuItem>
                  <MenuItem
                    icon={<Icon as={PiPlus} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      _setSidebarState("type")
                      _setTransformationToEdit(transformation.id, "below")
                    }}
                  >
                    Add transformation below
                  </MenuItem>
                  <MenuItem
                    icon={<Icon as={PiPencilSimple} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      _setSidebarState("config")
                      _setSelectedTransformationKey(transformation.key)
                      _setTransformationToEdit(transformation.id, "inplace")
                    }}
                  >
                    Edit transformation
                  </MenuItem>
                  <MenuItem
                    icon={<Icon as={PiArrowUp} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = transformations.findIndex(
                        (t) => t.id === transformation.id,
                      )
                      if (currentIndex > 0) {
                        const targetId = transformations[currentIndex - 1].id
                        moveTransformation(transformation.id, targetId)
                      }
                    }}
                    isDisabled={
                      transformations.findIndex(
                        (t) => t.id === transformation.id,
                      ) <= 0
                    }
                  >
                    Move up
                  </MenuItem>
                  <MenuItem
                    icon={<Icon as={PiArrowDown} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = transformations.findIndex(
                        (t) => t.id === transformation.id,
                      )
                      if (currentIndex < transformations.length - 1) {
                        const targetId = transformations[currentIndex + 1].id
                        moveTransformation(transformation.id, targetId)
                      }
                    }}
                    isDisabled={
                      transformations.findIndex(
                        (t) => t.id === transformation.id,
                      ) >=
                      transformations.length - 1
                    }
                  >
                    Move down
                  </MenuItem>
                  <MenuItem
                    icon={<Icon as={PiTrash} color="red.500" />}
                    color="red.500"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTransformation(transformation.id)
                      _setSidebarState("none")
                      _setSelectedTransformationKey(null)
                      _setTransformationToEdit(null)
                    }}
                  >
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          )}
        </HStack>
      )}
    </Hover>
  )
}
