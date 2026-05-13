import { Button, Icon } from "@chakra-ui/react"
import { PiStack } from "@react-icons/all-files/pi/PiStack"
import { useTemplateStorage } from "../../context/TemplateStorageContext"
import { useEditorStore } from "../../store"

export function InsertOverlayButton() {
  const provider = useTemplateStorage()
  const _setSidebarState = useEditorStore((s) => s._setSidebarState)
  if (!provider) return null
  return (
    <Button
      leftIcon={<Icon boxSize={5} as={PiStack} />}
      aria-label="Insert overlay"
      onClick={() => _setSidebarState("insert-overlay")}
      variant="ghost"
      fontWeight="normal"
      size="md"
      fontSize="sm"
      width="full"
      justifyContent="flex-start"
    >
      Insert overlay
    </Button>
  )
}
