import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tag,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { PiArrowDown } from "@react-icons/all-files/pi/PiArrowDown"
import { PiArrowUp } from "@react-icons/all-files/pi/PiArrowUp"
import { PiCopy } from "@react-icons/all-files/pi/PiCopy"
import { PiCursorText } from "@react-icons/all-files/pi/PiCursorText"
import { PiDotsSixVerticalBold } from "@react-icons/all-files/pi/PiDotsSixVerticalBold"
import { PiDotsThreeVertical } from "@react-icons/all-files/pi/PiDotsThreeVertical"
import { PiEye } from "@react-icons/all-files/pi/PiEye"
import { PiEyeSlash } from "@react-icons/all-files/pi/PiEyeSlash"
import { PiPencilSimple } from "@react-icons/all-files/pi/PiPencilSimple"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiTrash } from "@react-icons/all-files/pi/PiTrash"
import { RiCheckFill } from "@react-icons/all-files/ri/RiCheckFill"
import { RiCloseFill } from "@react-icons/all-files/ri/RiCloseFill"
import { RxTransform } from "@react-icons/all-files/rx/RxTransform"
import { useEffect, useRef, useState } from "react"
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
    addTransformation,
    updateTransformation,
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
    _internalState.transformationToEdit?.position === "inplace" &&
    _internalState.transformationToEdit?.transformationId === transformation.id

  const [isRenaming, setIsRenaming] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const renamingBoxRef = useRef<HTMLDivElement>(null)

  const baseIconColor = useColorModeValue("gray.600", "gray.300")

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const renamingBox = renamingBoxRef.current
      if (renamingBox && !renamingBox.contains(event.target as Node)) {
        setIsRenaming(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <Hover display="flex">
      {(isHover) => (
        <HStack
          ref={setNodeRef}
          px={4}
          py={2}
          cursor={isDragging ? "grabbing" : "pointer"}
          bg={isHover ? "gray.50" : isEditting ? "gray.50" : undefined}
          color={isEditting ? "editorBlue.500" : undefined}
          transition="background-color 0.2s, opacity 0.2s"
          spacing={3}
          position="relative"
          width="full"
          minH="8"
          alignItems="center"
          style={style}
          onClick={(_e) => {
            _setSidebarState("config")
            _setSelectedTransformationKey(transformation.key)
            _setTransformationToEdit(transformation.id, "inplace")
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setIsRenaming(true)
          }}
          {...attributes}
          {...listeners}
        >
          {isHover && !isRenaming ? (
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
              <Icon as={PiDotsSixVerticalBold} boxSize={4} color="gray.600" />
            </Box>
          ) : (
            <Box mr={-1} height="24px" display="flex" alignItems="center" w="5">
              <Icon as={RxTransform} boxSize={4} />
            </Box>
          )}

          {isRenaming ? (
            <Box ref={renamingBoxRef}>
              <Flex alignItems="center" justifyContent="space-between">
                <Input
                  autoFocus
                  type="text"
                  defaultValue={transformation.name}
                  ref={renameInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const newName = renameInputRef.current?.value.trim()
                      if (newName && newName.length > 0) {
                        updateTransformation(transformation.id, {
                          ...transformation,
                          name: newName,
                        })
                      }
                      setIsRenaming(false)
                    } else if (e.key === "Escape") {
                      setIsRenaming(false)
                    }
                  }}
                  variant="flushed"
                />
                <Flex>
                  <IconButton
                    aria-label="Save"
                    icon={<Icon as={RiCheckFill} />}
                    variant="ghost"
                    color={baseIconColor}
                    onClick={() => {
                      const newName = renameInputRef.current?.value.trim()
                      if (newName && newName.length > 0) {
                        updateTransformation(transformation.id, {
                          ...transformation,
                          name: newName,
                        })
                      }
                      setIsRenaming(false)
                    }}
                  />
                  <IconButton
                    aria-label="Cancel"
                    icon={<Icon as={RiCloseFill} />}
                    variant="ghost"
                    color={baseIconColor}
                    onClick={() => {
                      setIsRenaming(false)
                    }}
                  />
                </Flex>
              </Flex>
              <Text fontSize="xs" color="gray.500" mt={2}>
                Press{" "}
                <Tag size="sm">
                  {navigator.platform.toLowerCase().includes("mac")
                    ? "Return"
                    : "Enter"}
                </Tag>{" "}
                to save, <Tag size="sm">Esc</Tag> to cancel
              </Text>
            </Box>
          ) : (
            <Text fontSize="md" opacity={isVisible ? 1 : 0.5}>
              {transformation.name}
            </Text>
          )}
          <Box flex={1} />
          {isHover && !isRenaming && (
            <HStack spacing={2} color={"initial"}>
              <Tooltip
                label={
                  isVisible ? "Hide transformation" : "Show transformation"
                }
                placement="top"
              >
                <Box
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleTransformationVisibility(transformation.id)
                  }}
                >
                  <Icon
                    as={isVisible ? PiEye : PiEyeSlash}
                    color="gray.600"
                    boxSize={4}
                    _hover={{ opacity: 1, color: "gray.800" }}
                  />
                </Box>
              </Tooltip>
              <Menu closeOnSelect isLazy placement="bottom-end">
                <Tooltip label="Options" placement="top">
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
                      color="gray.600"
                      boxSize={4}
                      _hover={{ opacity: 1, color: "gray.800" }}
                    />
                  </MenuButton>
                </Tooltip>
                <MenuList fontSize="md" minW="200px" zIndex={10}>
                  <MenuItem
                    icon={<Icon as={PiPlus} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      _setSidebarState("type")
                      _setTransformationToEdit(transformation.id, "above")
                    }}
                  >
                    Add transformation before
                  </MenuItem>
                  <MenuItem
                    icon={<Icon as={PiPlus} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      _setSidebarState("type")
                      _setTransformationToEdit(transformation.id, "below")
                    }}
                  >
                    Add transformation after
                  </MenuItem>
                  <MenuItem
                    icon={<Icon as={PiCopy} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      const currentIndex = transformations.findIndex(
                        (t) => t.id === transformation.id,
                      )
                      const transformationId = addTransformation(
                        {
                          ...transformation,
                        },
                        currentIndex + 1,
                      )
                      _setSidebarState("config")
                      _setTransformationToEdit(transformationId, "inplace")
                    }}
                  >
                    Duplicate
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
                    icon={<Icon as={PiCursorText} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsRenaming(true)
                      _setSidebarState("config")
                      _setSelectedTransformationKey(transformation.key)
                      _setTransformationToEdit(transformation.id, "inplace")
                    }}
                  >
                    Rename
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
                      if (
                        _internalState.selectedTransformationKey ===
                        transformation.key
                      ) {
                        _setSidebarState("none")
                        _setSelectedTransformationKey(null)
                        _setTransformationToEdit(null)
                      }
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
