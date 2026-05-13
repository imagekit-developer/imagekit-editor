import { Box, Button, HStack, Icon, Text, VStack } from "@chakra-ui/react"
import type {
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { PiPlus } from "@react-icons/all-files/pi/PiPlus"
import { PiRectangleDashed } from "@react-icons/all-files/pi/PiRectangleDashed"
import { RxTransform } from "@react-icons/all-files/rx/RxTransform"
import { useEffect, useState } from "react"
import { useEditorStore } from "../../store"
import { SidebarBody } from "./sidebar-body"
import { SidebarFooter } from "./sidebar-footer"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"
import { SortableTransformationItem } from "./sortable-transformation-item"
import {
  isNestedLayerDragId,
  parseNestedLayerDragId,
} from "./sortable-transformation-item"
import { InsertOverlayButton } from "./insert-overlay-button"
import { InsertOverlaySidebar } from "./insert-overlay-sidebar"
import { TransformationConfigSidebar } from "./transformation-config-sidebar"

import { TransformationTypeSidebar } from "./transformation-type-sidebar"

export const Sidebar = () => {
  const {
    transformations,
    moveTransformation,
    updateTransformation,
    _internalState,
    _setSidebarState,
    _setSelectedTransformationKey,
    _setTransformationToEdit,
    _setActiveNestedLayerIndex,
  } = useEditorStore()

  useEffect(() => {
    if (
      transformations.length === 0 &&
      _internalState.sidebarState === "none"
    ) {
      _setSidebarState("type")
    }
  }, [transformations.length, _setSidebarState, _internalState.sidebarState])

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      // Nested image layer reorder within a single parent transformation.
      if (isNestedLayerDragId(active.id) && isNestedLayerDragId(over.id)) {
        const a = parseNestedLayerDragId(String(active.id))
        const o = parseNestedLayerDragId(String(over.id))
        if (
          a &&
          o &&
          a.transformationId === o.transformationId &&
          a.index !== o.index
        ) {
          const parent = transformations.find(
            (t) => t.id === a.transformationId,
          )
          if (parent) {
            const value =
              (parent.value as Record<string, unknown> | undefined) ?? {}
            const layers: Array<Record<string, unknown>> = Array.isArray(
              value.nestedLayers,
            )
              ? [...(value.nestedLayers as Array<Record<string, unknown>>)]
              : []
            if (
              a.index < layers.length &&
              o.index < layers.length
            ) {
              const next = [...layers]
              const [moved] = next.splice(a.index, 1)
              next.splice(o.index, 0, moved)
              const nextValue: Record<string, unknown> = { ...value }
              if (next.length > 0) {
                nextValue.nestedLayers = next
              } else {
                delete nextValue.nestedLayers
              }
              updateTransformation(parent.id, { ...parent, value: nextValue })

              // If the nested form is currently open on this parent, update
              // the active-nested-layer pointer so it follows the layer
              // through the reorder (otherwise the highlight would stay on
              // the now-different layer at the original index).
              const editing = _internalState.transformationToEdit
              const activeIdx = _internalState.activeNestedLayerIndex
              if (
                editing &&
                editing.position === "inplace" &&
                editing.transformationId === parent.id &&
                activeIdx !== null &&
                activeIdx !== undefined
              ) {
                let newActive = activeIdx
                if (activeIdx === a.index) {
                  newActive = o.index
                } else if (a.index < activeIdx && o.index >= activeIdx) {
                  newActive = activeIdx - 1
                } else if (a.index > activeIdx && o.index <= activeIdx) {
                  newActive = activeIdx + 1
                }
                if (newActive !== activeIdx) {
                  _setActiveNestedLayerIndex(newActive)
                }
              }
            }
          }
        }
      } else if (
        !isNestedLayerDragId(active.id) &&
        !isNestedLayerDragId(over.id)
      ) {
        moveTransformation(active.id, over.id)
      }
    }

    setActiveId(null)
  }

  return (
    <>
      <SidebarRoot w="80">
        <SidebarHeader>
          <Text fontSize="md" fontWeight="normal">
            Transformations
          </Text>
        </SidebarHeader>
        {transformations.length > 0 ? (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SidebarBody as={VStack} gap={0} align="stretch" flex={1}>
                <SortableContext
                  items={transformations.map(
                    (transformation) => transformation.id,
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {transformations.map((transformation) => {
                    return (
                      <Box key={`${transformation.id}`}>
                        <SortableTransformationItem
                          transformation={transformation}
                        />
                      </Box>
                    )
                  })}
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <HStack
                      bg="white"
                      boxShadow="md"
                      opacity={0.8}
                      px={4}
                      py={2}
                      spacing={3}
                      position="relative"
                      width="full"
                      minH="8"
                      alignItems="center"
                    >
                      <Box
                        mr={-1}
                        height="24px"
                        display="flex"
                        alignItems="center"
                        w="5"
                      >
                        <Icon as={RxTransform} boxSize={4} />
                      </Box>
                      <Text fontSize="md">
                        {
                          transformations.find((item) => item.id === activeId)
                            ?.name
                        }
                      </Text>
                      <Box flex={1} />
                    </HStack>
                  ) : null}
                </DragOverlay>
              </SidebarBody>
            </DndContext>

            {!_internalState.overlayMode && (
              <SidebarFooter h="auto" gap={1}>
                <InsertOverlayButton />
                <Button
                  leftIcon={<Icon boxSize={5} as={PiPlus} />}
                  aria-label="Add new Transformation"
                  onClick={() => {
                    _setSidebarState("type")
                    _setSelectedTransformationKey(null)
                    _setTransformationToEdit(null)
                  }}
                  variant="ghost"
                  fontWeight="normal"
                  size="md"
                  fontSize="sm"
                  width="full"
                  justifyContent="flex-start"
                >
                  Add new Transformation
                </Button>
              </SidebarFooter>
            )}
          </>
        ) : (
          <>
            <SidebarBody as={VStack} gap={0} align="stretch" flex={1}>
              <HStack
                px={4}
                py={2}
                color="editorBlue.400"
                bg="gray.50"
                spacing="3"
              >
                <Icon boxSize={4} as={PiRectangleDashed} opacity={0.7} />
                <Text fontSize="md">Select Transformation</Text>
              </HStack>
            </SidebarBody>
            {!_internalState.overlayMode && (
              <SidebarFooter h="auto" gap={1}>
                <InsertOverlayButton />
              </SidebarFooter>
            )}
          </>
        )}
      </SidebarRoot>

      {_internalState.sidebarState === "type" && <TransformationTypeSidebar />}

      {_internalState.sidebarState === "insert-overlay" && (
        <InsertOverlaySidebar />
      )}

      {_internalState.sidebarState === "config" && (
        <TransformationConfigSidebar />
      )}
    </>
  )
}
