import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react"
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
import { PiX } from "@react-icons/all-files/pi/PiX"
import { RxTransform } from "@react-icons/all-files/rx/RxTransform"
import { useEffect, useState } from "react"
import { useEditorStore } from "../../store"
import { SidebarBody } from "./sidebar-body"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"
import { SortableTransformationItem } from "./sortable-transformation-item"
import { TransformationConfigSidebar } from "./transformation-config-sidebar"

import { TransformationTypeSidebar } from "./transformation-type-sidebar"

export const Sidebar = () => {
  const {
    transformations,
    moveTransformation,
    _internalState,
    _setSidebarState,
    _setSelectedTransformationKey,
    _setTransformationToEdit,
  } = useEditorStore()

  const showTransientAddRow =
    _internalState.sidebarState === "type" ||
    (_internalState.sidebarState === "config" &&
      !_internalState.transformationToEdit)

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
      moveTransformation(active.id, over.id)
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

              {/* Transient add state row (matches prototype flow) */}
              {showTransientAddRow && (
                <HStack
                  px={4}
                  py={2}
                  color="editorBlue.400"
                  bg="gray.50"
                  spacing="3"
                  alignItems="center"
                >
                  <Icon boxSize={4} as={PiRectangleDashed} opacity={0.7} />
                  <Text fontSize="md">Select Transformation</Text>
                  <Box flex={1} />
                  <IconButton
                    icon={<Icon as={PiX} />}
                    onClick={() => {
                      _setSidebarState("none")
                      _setSelectedTransformationKey(null)
                      _setTransformationToEdit(null)
                    }}
                    variant="ghost"
                    size="sm"
                    aria-label="Cancel add transformation"
                  />
                </HStack>
              )}

              {/* Add action — sits after the last item; sticks to bottom on overflow */}
              <Box
                position="sticky"
                bottom="0"
                bg="white"
                borderTop="1px"
                borderTopColor="gray.200"
                p={2}
                zIndex={1}
              >
                <Box display="flex" alignItems="center" justifyContent="center">
                  <Button
                    leftIcon={<Icon boxSize={4} as={PiPlus} />}
                    aria-label="Add new Transformation"
                    onClick={() => {
                      _setSidebarState("type")
                      _setSelectedTransformationKey(null)
                      _setTransformationToEdit(null)
                    }}
                    variant="ghost"
                    fontWeight="normal"
                    size="md"
                    color="editorGray.700"
                    px="6"
                  >
                    Add new Transformation
                  </Button>
                </Box>
              </Box>

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
        ) : (
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
        )}
      </SidebarRoot>

      {_internalState.sidebarState === "type" && <TransformationTypeSidebar />}

      {_internalState.sidebarState === "config" && (
        <TransformationConfigSidebar />
      )}
    </>
  )
}
