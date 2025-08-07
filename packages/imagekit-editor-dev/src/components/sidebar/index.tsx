import { Box, Button, Flex, HStack, Icon, Text, VStack } from "@chakra-ui/react"
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
import { PiRectangle } from "@react-icons/all-files/pi/PiRectangle"
import { PiRectangleDashed } from "@react-icons/all-files/pi/PiRectangleDashed"
import { useEffect, useState } from "react"
import { useEditorStore } from "../../store"
import { SidebarBody } from "./sidebar-body"
import { SidebarFooter } from "./sidebar-footer"
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

  useEffect(() => {
    if (transformations.length === 0) {
      _setSidebarState("type")
    }
  }, [transformations.length, _setSidebarState])

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
                    <Flex
                      px={4}
                      py={2}
                      bg="white"
                      boxShadow="md"
                      borderRadius="md"
                      width="90%"
                      opacity={0.8}
                    >
                      <Icon as={PiRectangle} boxSize={4} opacity={0.7} />
                      <Text fontSize="md">
                        {
                          transformations.find((item) => item.id === activeId)
                            ?.name
                        }
                      </Text>
                    </Flex>
                  ) : null}
                </DragOverlay>
              </SidebarBody>
            </DndContext>

            <SidebarFooter>
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
          </>
        ) : (
          <SidebarBody as={VStack} gap={0} align="stretch" flex={1}>
            <HStack
              px={4}
              py={2}
              color="editorBlue.400"
              bg="editorBlue.50"
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
