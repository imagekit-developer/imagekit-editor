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
import {
  isLayerKey,
  MAX_LAYER_NEST_DEPTH,
  type Transformation,
  useEditorStore,
} from "../../store"
import Hover from "../common/Hover"

export type TransformationPosition = "inplace" | number

interface SortableTransformationItemProps {
  transformation: Transformation
  /**
   * Nesting level. 0 = root list (drag-and-drop sortable). >0 = nested
   * child of a layer; rendered indented and excluded from the root
   * SortableContext (children reorder via menu actions in v1).
   */
  depth?: number
}

export const SortableTransformationItem = ({
  transformation,
  depth = 0,
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
    // Children aren't part of the root sortable context; suppress dnd-kit's
    // attempts to register them as draggable participants.
    disabled: depth > 0,
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
    _setParentForChild,
    _internalState,
    addTransformation,
    updateTransformation,
  } = useEditorStore()

  const isRoot = depth === 0
  // Text layers cannot nest anything (per docs). Image and canvas layers can
  // host nested image/text/canvas children up to MAX_LAYER_NEST_DEPTH.
  const canHostChildren =
    isLayerKey(transformation.key) &&
    transformation.key !== "layers-text" &&
    depth < MAX_LAYER_NEST_DEPTH

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
        <Box width="full">
        <HStack
          ref={isRoot ? setNodeRef : undefined}
          px={4}
          py={2}
          // Visual indent for nested children. Uses a left border so the
          // hierarchy reads at a glance even before hover.
          pl={depth > 0 ? 4 + depth * 4 : 4}
          borderLeft={depth > 0 ? "2px solid" : undefined}
          borderLeftColor={depth > 0 ? "editorBattleshipGrey.100" : undefined}
          ml={depth > 0 ? 4 : 0}
          cursor={isDragging ? "grabbing" : "pointer"}
          bg={isHover ? "gray.50" : isEditting ? "gray.50" : undefined}
          color={isEditting ? "editorBlue.500" : undefined}
          transition="background-color 0.2s, opacity 0.2s"
          spacing={3}
          position="relative"
          width="full"
          minH="8"
          alignItems="center"
          style={isRoot ? style : undefined}
          onClick={(_e) => {
            _setSidebarState("config")
            _setSelectedTransformationKey(transformation.key)
            _setTransformationToEdit(transformation.id, "inplace")
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setIsRenaming(true)
          }}
          {...(isRoot ? attributes : {})}
          {...(isRoot ? listeners : {})}
        >
          {isHover && !isRenaming ? (
            <Box
              cursor={isRoot ? "grab" : "default"}
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
              <Icon
                as={isRoot ? PiDotsSixVerticalBold : RxTransform}
                boxSize={4}
                color="gray.600"
              />
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
              {canHostChildren && (
                <Tooltip label="Add nested layer" placement="top">
                  <Box
                    as="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Clear any prior in-place edit target so the config
                      // sidebar doesn't seed the new child's form fields
                      // from the parent's value (e.g. the parent image
                      // layer's opacity=100 leaking into a new text child).
                      _setTransformationToEdit(null)
                      _setParentForChild(transformation.id)
                      _setSidebarState("type")
                    }}
                    aria-label="Add nested layer"
                    display="flex"
                    alignItems="center"
                    bg="transparent"
                    p={0}
                  >
                    <Icon
                      as={PiPlus}
                      color="gray.600"
                      boxSize={4}
                      _hover={{ opacity: 1, color: "gray.800" }}
                    />
                  </Box>
                </Tooltip>
              )}
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
                  {isRoot && (
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
                  )}
                  {isRoot && (
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
                  )}
                  {isRoot && (
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
                          name: transformation.name
                            ? `${transformation.name} (Copy)`
                            : transformation.name,
                        },
                        currentIndex + 1,
                      )
                      _setSidebarState("config")
                      _setTransformationToEdit(transformationId, "inplace")
                    }}
                  >
                    Duplicate
                  </MenuItem>
                  )}
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
                  {isRoot && (
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
                  )}
                  {isRoot && (
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
                  )}
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
        {transformation.children && transformation.children.length > 0 && (
          <Box width="full">
            {transformation.children.map((child) => (
              <SortableTransformationItem
                key={child.id}
                transformation={child}
                depth={depth + 1}
              />
            ))}
          </Box>
        )}
        </Box>
      )}
    </Hover>
  )
}
