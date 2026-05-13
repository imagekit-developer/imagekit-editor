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
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
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
import type { CSSProperties, Ref } from "react"
import { useEffect, useRef, useState } from "react"
import { type Transformation, useEditorStore } from "../../store"
import Hover from "../common/Hover"

export type TransformationPosition = "inplace" | number

const VARIABLE_FLAG_SUFFIXES = ["IsVariable", "HasDefault", "VariableName"]

const isMeaningfulValue = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== ""

/** Returns the list of meaningful nested image layers on a transformation,
 * each paired with its index in the underlying `value.nestedLayers` array.
 * A layer is considered meaningful when it has at least one user-set field
 * (ignoring synthetic *IsVariable / *HasDefault flags and internal __name /
 * __hidden meta keys). */
const getNestedImageLayers = (
  transformation: Transformation,
): Array<{ layer: Record<string, unknown>; index: number }> => {
  const value = transformation.value as Record<string, unknown> | undefined
  const arr: Array<Record<string, unknown>> = Array.isArray(value?.nestedLayers)
    ? (value!.nestedLayers as Array<Record<string, unknown>>)
    : []
  const out: Array<{ layer: Record<string, unknown>; index: number }> = []
  arr.forEach((layer, index) => {
    if (!layer || typeof layer !== "object") return
    const meaningful = Object.entries(layer).some(
      ([key, val]) =>
        key !== "__name" &&
        key !== "__hidden" &&
        key !== "__kind" &&
        !VARIABLE_FLAG_SUFFIXES.some((suffix) => key.endsWith(suffix)) &&
        isMeaningfulValue(val),
    )
    if (meaningful) out.push({ layer, index })
  })
  return out
}

type MenuAction = {
  key: string
  label: string
  // biome-ignore lint/suspicious/noExplicitAny: react-icons component type
  icon: any
  onClick: () => void
  disabled?: boolean
  color?: string
  /** When true, the row also enters rename mode in addition to onClick. */
  startsRename?: boolean
}

interface TransformationRowProps {
  name: string
  isVisible: boolean
  isEditing: boolean
  isDragging?: boolean
  containerRef?: Ref<HTMLDivElement>
  // biome-ignore lint/suspicious/noExplicitAny: dnd-kit attributes
  dragAttributes?: any
  // biome-ignore lint/suspicious/noExplicitAny: dnd-kit listeners
  dragListeners?: any
  style?: CSSProperties
  pl?: number | string
  showDragHandle?: boolean
  onClick: () => void
  onToggleVisibility: () => void
  onRename: (newName: string) => void
  menuActions: MenuAction[]
  visibilityTooltip?: { show: string; hide: string }
}

const TransformationRow = ({
  name,
  isVisible,
  isEditing,
  isDragging = false,
  containerRef,
  dragAttributes,
  dragListeners,
  style,
  pl,
  showDragHandle = false,
  onClick,
  onToggleVisibility,
  onRename,
  menuActions,
  visibilityTooltip = {
    show: "Show transformation",
    hide: "Hide transformation",
  },
}: TransformationRowProps) => {
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

  const commitRename = () => {
    const newName = renameInputRef.current?.value.trim()
    if (newName && newName.length > 0) {
      onRename(newName)
    }
    setIsRenaming(false)
  }

  return (
    <Hover display="flex">
      {(isHover) => (
        <HStack
          ref={containerRef}
          pl={pl ?? 4}
          pr={4}
          py={2}
          cursor={isDragging ? "grabbing" : "pointer"}
          bg={isHover ? "gray.50" : isEditing ? "gray.50" : undefined}
          color={isEditing ? "editorBlue.500" : undefined}
          transition="background-color 0.2s, opacity 0.2s"
          spacing={3}
          position="relative"
          width="full"
          minH="8"
          alignItems="center"
          style={style}
          onClick={onClick}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setIsRenaming(true)
          }}
          {...(dragAttributes ?? {})}
          {...(dragListeners ?? {})}
        >
          {showDragHandle && isHover && !isRenaming ? (
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
                  defaultValue={name}
                  ref={renameInputRef}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitRename()
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
                    onClick={commitRename}
                  />
                  <IconButton
                    aria-label="Cancel"
                    icon={<Icon as={RiCloseFill} />}
                    variant="ghost"
                    color={baseIconColor}
                    onClick={() => setIsRenaming(false)}
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
              {name}
            </Text>
          )}
          <Box flex={1} />
          {isHover && !isRenaming && (
            <HStack spacing={2} color={"initial"}>
              <Tooltip
                label={
                  isVisible ? visibilityTooltip.hide : visibilityTooltip.show
                }
                placement="top"
              >
                <Box
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleVisibility()
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
                  {menuActions.map((action) => (
                    <MenuItem
                      key={action.key}
                      icon={<Icon as={action.icon} color={action.color} />}
                      color={action.color}
                      isDisabled={action.disabled}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick()
                        if (action.startsRename) {
                          setIsRenaming(true)
                        }
                      }}
                    >
                      {action.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </HStack>
          )}
        </HStack>
      )}
    </Hover>
  )
}

interface SortableTransformationItemProps {
  transformation: Transformation
}

/** Composite id helpers for nested-layer drag identification. */
export const NESTED_LAYER_ID_PREFIX = "nested:"
export const isNestedLayerDragId = (id: unknown): id is string =>
  typeof id === "string" && id.startsWith(NESTED_LAYER_ID_PREFIX)
export const parseNestedLayerDragId = (
  id: string,
): { transformationId: string; index: number } | null => {
  if (!isNestedLayerDragId(id)) return null
  const rest = id.slice(NESTED_LAYER_ID_PREFIX.length)
  const lastColon = rest.lastIndexOf(":")
  if (lastColon === -1) return null
  const transformationId = rest.slice(0, lastColon)
  const index = Number(rest.slice(lastColon + 1))
  if (!transformationId || !Number.isInteger(index) || index < 0) return null
  return { transformationId, index }
}

interface SortableNestedLayerRowProps {
  transformationId: string
  index: number
  name: string
  isVisible: boolean
  isEditing: boolean
  onClick: () => void
  onToggleVisibility: () => void
  onRename: (newName: string) => void
  menuActions: MenuAction[]
}

const SortableNestedLayerRow = ({
  transformationId,
  index,
  name,
  isVisible,
  isEditing,
  onClick,
  onToggleVisibility,
  onRename,
  menuActions,
}: SortableNestedLayerRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${NESTED_LAYER_ID_PREFIX}${transformationId}:${index}` })

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  return (
    <TransformationRow
      name={name}
      isVisible={isVisible}
      isEditing={isEditing}
      isDragging={isDragging}
      containerRef={setNodeRef}
      dragAttributes={attributes}
      dragListeners={listeners}
      style={style}
      pl={12}
      showDragHandle
      visibilityTooltip={{
        show: "Show layer",
        hide: "Hide layer",
      }}
      onClick={onClick}
      onToggleVisibility={onToggleVisibility}
      onRename={onRename}
      menuActions={menuActions}
    />
  )
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
    _setPendingOpenNestedLayer,
    _setActiveNestedLayerIndex,
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

  const isVisible = !!visibleTransformations[transformation.id]

  const isEditing =
    _internalState.transformationToEdit?.position === "inplace" &&
    _internalState.transformationToEdit?.transformationId === transformation.id

  const value =
    (transformation.value as Record<string, unknown> | undefined) ?? {}
  const nestedLayersList = getNestedImageLayers(transformation)

  /** Read the current nested layers as a plain array. */
  const readNestedLayersArray = (): Array<Record<string, unknown>> => {
    if (Array.isArray(value.nestedLayers)) {
      return [...(value.nestedLayers as Array<Record<string, unknown>>)]
    }
    return []
  }

  /** Persist a new nestedLayers array onto the transformation. */
  const writeNestedLayersArray = (
    nextLayers: Array<Record<string, unknown>>,
  ) => {
    const nextValue: Record<string, unknown> = { ...value }
    if (nextLayers.length > 0) {
      nextValue.nestedLayers = nextLayers
    } else {
      delete nextValue.nestedLayers
    }
    updateTransformation(transformation.id, {
      ...transformation,
      value: nextValue,
    })
  }

  const currentIndex = transformations.findIndex(
    (t) => t.id === transformation.id,
  )

  const parentMenuActions: MenuAction[] = [
    {
      key: "add-before",
      label: "Add transformation before",
      icon: PiPlus,
      onClick: () => {
        _setSidebarState("type")
        _setTransformationToEdit(transformation.id, "above")
      },
    },
    {
      key: "add-after",
      label: "Add transformation after",
      icon: PiPlus,
      onClick: () => {
        _setSidebarState("type")
        _setTransformationToEdit(transformation.id, "below")
      },
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: PiCopy,
      onClick: () => {
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
      },
    },
    {
      key: "edit",
      label: "Edit transformation",
      icon: PiPencilSimple,
      onClick: () => {
        _setSidebarState("config")
        _setSelectedTransformationKey(transformation.key)
        _setTransformationToEdit(transformation.id, "inplace")
      },
    },
    {
      key: "rename",
      label: "Rename",
      icon: PiCursorText,
      startsRename: true,
      onClick: () => {
        _setSidebarState("config")
        _setSelectedTransformationKey(transformation.key)
        _setTransformationToEdit(transformation.id, "inplace")
      },
    },
    {
      key: "move-up",
      label: "Move up",
      icon: PiArrowUp,
      disabled: currentIndex <= 0,
      onClick: () => {
        if (currentIndex > 0) {
          moveTransformation(
            transformation.id,
            transformations[currentIndex - 1].id,
          )
        }
      },
    },
    {
      key: "move-down",
      label: "Move down",
      icon: PiArrowDown,
      disabled: currentIndex >= transformations.length - 1,
      onClick: () => {
        if (currentIndex < transformations.length - 1) {
          moveTransformation(
            transformation.id,
            transformations[currentIndex + 1].id,
          )
        }
      },
    },
    {
      key: "delete",
      label: "Delete",
      icon: PiTrash,
      color: "red.500",
      onClick: () => {
        removeTransformation(transformation.id)
        if (
          _internalState.selectedTransformationKey === transformation.key
        ) {
          _setSidebarState("none")
          _setSelectedTransformationKey(null)
          _setTransformationToEdit(null)
        }
      },
    },
  ]

  const buildNestedMenuActions = (index: number): MenuAction[] => [
    {
      key: "duplicate",
      label: "Duplicate",
      icon: PiCopy,
      onClick: () => {
        // Duplicate the nested image layer in place: insert a copy right
        // after the original within the same parent's `nestedLayers` array.
        const layers = readNestedLayersArray()
        const original = layers[index] ?? {}
        const originalKind =
          typeof original.__kind === "string" && original.__kind === "text"
            ? "text"
            : "image"
        const originalDefaultName =
          originalKind === "text" ? "Text Layer" : "Image Layer"
        const originalName =
          typeof original.__name === "string" && (original.__name as string).trim()
            ? (original.__name as string)
            : originalDefaultName
        const copy: Record<string, unknown> = {
          ...original,
          __name: `${originalName} (Copy)`,
        }
        const next = [...layers]
        next.splice(index + 1, 0, copy)
        writeNestedLayersArray(next)
        // If a later layer is being edited, its index shifts down by one.
        if (isEditing) {
          const activeIdx = _internalState.activeNestedLayerIndex
          if (activeIdx !== null && activeIdx !== undefined && activeIdx > index) {
            _setActiveNestedLayerIndex(activeIdx + 1)
          }
        }
      },
    },
    {
      key: "edit",
      label: "Edit transformation",
      icon: PiPencilSimple,
      onClick: () => {
        _setSidebarState("config")
        _setSelectedTransformationKey(transformation.key)
        _setTransformationToEdit(transformation.id, "inplace")
        _setPendingOpenNestedLayer(index)
      },
    },
    {
      key: "rename",
      label: "Rename",
      icon: PiCursorText,
      startsRename: true,
      onClick: () => {
        // Rename UI is handled by TransformationRow.
      },
    },
    {
      key: "move-up",
      label: "Move up",
      icon: PiArrowUp,
      disabled: index <= 0,
      onClick: () => {
        const layers = readNestedLayersArray()
        if (index <= 0 || index >= layers.length) return
        const next = [...layers]
        const [moved] = next.splice(index, 1)
        next.splice(index - 1, 0, moved)
        writeNestedLayersArray(next)
        if (isEditing) {
          const activeIdx = _internalState.activeNestedLayerIndex
          if (activeIdx === index) {
            _setActiveNestedLayerIndex(index - 1)
          } else if (activeIdx === index - 1) {
            _setActiveNestedLayerIndex(index)
          }
        }
      },
    },
    {
      key: "move-down",
      label: "Move down",
      icon: PiArrowDown,
      disabled: index >= readNestedLayersArray().length - 1,
      onClick: () => {
        const layers = readNestedLayersArray()
        if (index < 0 || index >= layers.length - 1) return
        const next = [...layers]
        const [moved] = next.splice(index, 1)
        next.splice(index + 1, 0, moved)
        writeNestedLayersArray(next)
        if (isEditing) {
          const activeIdx = _internalState.activeNestedLayerIndex
          if (activeIdx === index) {
            _setActiveNestedLayerIndex(index + 1)
          } else if (activeIdx === index + 1) {
            _setActiveNestedLayerIndex(index)
          }
        }
      },
    },
    {
      key: "delete",
      label: "Delete",
      icon: PiTrash,
      color: "red.500",
      onClick: () => {
        const layers = readNestedLayersArray()
        const next = layers.filter((_, i) => i !== index)
        writeNestedLayersArray(next)
        if (isEditing) {
          const activeIdx = _internalState.activeNestedLayerIndex
          if (activeIdx !== null && activeIdx !== undefined) {
            if (activeIdx === index) {
              _setActiveNestedLayerIndex(null)
            } else if (activeIdx > index) {
              _setActiveNestedLayerIndex(activeIdx - 1)
            }
          }
        }
      },
    },
  ]

  return (
    <>
      <TransformationRow
        name={transformation.name}
        isVisible={isVisible}
        isEditing={isEditing}
        isDragging={isDragging}
        containerRef={setNodeRef}
        dragAttributes={attributes}
        dragListeners={listeners}
        style={style}
        showDragHandle
        onClick={() => {
          _setSidebarState("config")
          _setSelectedTransformationKey(transformation.key)
          _setTransformationToEdit(transformation.id, "inplace")
          // Clicking the parent row should always return focus to the parent
          // form, even if a nested layer was currently being edited.
          _setActiveNestedLayerIndex(null)
        }}
        onToggleVisibility={() =>
          toggleTransformationVisibility(transformation.id)
        }
        onRename={(newName) =>
          updateTransformation(transformation.id, {
            ...transformation,
            name: newName,
          })
        }
        menuActions={parentMenuActions}
      />
      <SortableContext
        items={nestedLayersList.map(
          ({ index }) => `nested:${transformation.id}:${index}`,
        )}
        strategy={verticalListSortingStrategy}
      >
        {nestedLayersList.map(({ layer, index }) => {
          const layerKind =
            typeof layer.__kind === "string" && layer.__kind === "text"
              ? "text"
              : "image"
          const layerDefaultName =
            layerKind === "text" ? "Text Layer" : "Image Layer"
          const layerName =
            typeof layer.__name === "string" && (layer.__name as string).trim()
              ? (layer.__name as string)
              : layerDefaultName
          const layerHidden = layer.__hidden === true
          const isNestedEditing =
            isEditing && _internalState.activeNestedLayerIndex === index
          return (
            <SortableNestedLayerRow
              key={`nested-${transformation.id}-${index}`}
              transformationId={transformation.id}
              index={index}
              name={layerName}
              isVisible={!layerHidden}
              isEditing={isNestedEditing}
              onClick={() => {
                _setSidebarState("config")
                _setSelectedTransformationKey(transformation.key)
                _setTransformationToEdit(transformation.id, "inplace")
                _setPendingOpenNestedLayer(index)
              }}
              onToggleVisibility={() => {
                const layers = readNestedLayersArray()
                const next = [...layers]
                const cur = (next[index] as Record<string, unknown>) ?? {}
                next[index] = { ...cur, __hidden: !layerHidden }
                writeNestedLayersArray(next)
              }}
              onRename={(newName) => {
                const layers = readNestedLayersArray()
                const next = [...layers]
                const cur = (next[index] as Record<string, unknown>) ?? {}
                next[index] = { ...cur, __name: newName }
                writeNestedLayersArray(next)
              }}
              menuActions={buildNestedMenuActions(index)}
            />
          )
        })}
      </SortableContext>
    </>
  )
}
