import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react"
import { useCallback, useEffect, useState } from "react"
import { usePresetStorage } from "../../context/PresetStorageContext"
import type { PresetLayerType } from "../../storage/presetTypes"

interface Props {
  isOpen: boolean
  onClose: () => void
  layerType: PresetLayerType
  /** Form snapshot to capture into the preset. */
  fieldValues: Record<string, unknown>
  /** Effective `params` for the form (existing transformation params merged with draft). */
  params?: Record<string, string>
  /** Called after a preset is saved successfully. */
  onSaved?: () => void
}

/**
 * Modal for naming and persisting a new preset captured from a layer config
 * form. Captures all current form values plus any active variable bindings.
 */
export function SavePresetDialog({
  isOpen,
  onClose,
  layerType,
  fieldValues,
  params,
  onSaved,
}: Props) {
  const provider = usePresetStorage()
  const toast = useToast()
  const [name, setName] = useState("")
  const [isPrivate, setIsPrivate] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName("")
      setIsPrivate(true)
      setIsSaving(false)
    }
  }, [isOpen])

  const canSubmit = name.trim().length > 0 && !isSaving && provider !== null

  const onSubmit = useCallback(async () => {
    if (!provider || !canSubmit) return
    setIsSaving(true)
    try {
      await provider.savePreset({
        name: name.trim(),
        layerType,
        fieldValues,
        params: params && Object.keys(params).length > 0 ? params : undefined,
        isPrivate,
      })
      toast({
        title: "Preset saved",
        status: "success",
        duration: 2500,
        isClosable: true,
      })
      onSaved?.()
      onClose()
    } catch (err) {
      toast({
        title: "Could not save preset",
        description: err instanceof Error ? err.message : String(err),
        status: "error",
        duration: 4000,
        isClosable: true,
      })
    } finally {
      setIsSaving(false)
    }
  }, [
    provider,
    canSubmit,
    name,
    layerType,
    fieldValues,
    params,
    isPrivate,
    toast,
    onSaved,
    onClose,
  ])

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay zIndex={2200} />
      <ModalContent containerProps={{ zIndex: 2200 }}>
        <ModalHeader fontSize="md">Save as preset</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="gray.600">
              Captures the current form values
              {params && Object.keys(params).length > 0
                ? " and variable bindings"
                : ""}{" "}
              for this {layerType === "layers-text" ? "text" : "image"} layer.
            </Text>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Name</FormLabel>
              <Input
                size="sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brand headline"
                autoFocus
              />
            </FormControl>
            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="sm" mb={0}>
                  Private
                </FormLabel>
                <Switch
                  isChecked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  size="sm"
                />
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Private presets are visible only to you.
              </Text>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            isLoading={isSaving}
            isDisabled={!canSubmit}
            onClick={onSubmit}
          >
            Save preset
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
