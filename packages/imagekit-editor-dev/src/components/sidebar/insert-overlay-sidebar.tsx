import {
  Button,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { PiStack } from "@react-icons/all-files/pi/PiStack"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { useCallback, useEffect, useState } from "react"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import type { TemplateRecord } from "../../storage"
import { useEditorStore } from "../../store"
import { formatTemplateNameForUI } from "../../utils"
import { SidebarBody } from "./sidebar-body"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"

export function InsertOverlaySidebar() {
  const provider = useTemplateStorage()
  const _setSidebarState = useEditorStore((s) => s._setSidebarState)
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const [overlays, setOverlays] = useState<TemplateRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchOverlays = useCallback(async () => {
    if (!provider) return
    setLoading(true)
    try {
      const list = await provider.listTemplates()
      setOverlays(list.filter((t) => t.kind === "overlay"))
    } finally {
      setLoading(false)
    }
  }, [provider])

  useEffect(() => {
    fetchOverlays()
  }, [fetchOverlays])

  useEffect(() => {
    if (syncStatus === "saved") fetchOverlays()
  }, [syncStatus, fetchOverlays])

  const handleInsert = (record: TemplateRecord) => {
    const { addTransformation: add } = useEditorStore.getState()
    if (!record.transformations || record.transformations.length === 0) {
      _setSidebarState("none")
      return
    }
    record.transformations.forEach((t) => {
      add(t)
    })
    _setSidebarState("none")
  }

  const onClose = () => _setSidebarState("none")

  return (
    <SidebarRoot>
      <SidebarHeader justifyContent="space-between">
        <Text fontSize="md" fontWeight="normal" mt={0}>
          Insert Overlay
        </Text>
        <IconButton
          icon={<Icon as={PiX} />}
          onClick={onClose}
          variant="ghost"
          size="sm"
          aria-label="Close Insert Overlay"
        />
      </SidebarHeader>
      <SidebarBody p="2">
        {loading ? (
          <Flex py="8" justifyContent="center" alignItems="center">
            <Spinner size="sm" color="editorBattleshipGrey.500" />
          </Flex>
        ) : overlays.length === 0 ? (
          <Flex py="8" justifyContent="center" alignItems="center">
            <Text fontSize="sm" color="editorBattleshipGrey.500">
              No overlays yet
            </Text>
          </Flex>
        ) : (
          <VStack spacing={0} align="stretch" p="0">
            {overlays.map((record) => (
              <Button
                key={record.id}
                onClick={() => handleInsert(record)}
                justifyContent="flex-start"
                variant="outline"
                borderRadius="0"
                borderWidth="0px 0px 1px 0px"
                borderColor="editorBattleshipGrey.100"
                py="5"
                sx={{
                  "&:last-of-type": {
                    borderBottomWidth: "0px",
                  },
                }}
                leftIcon={<Icon color="gray.500" as={PiStack} />}
                data-testid={`insert-overlay-item-${record.id}`}
              >
                {formatTemplateNameForUI(record.name)}
              </Button>
            ))}
          </VStack>
        )}
      </SidebarBody>
    </SidebarRoot>
  )
}
