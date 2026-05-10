import {
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import type { PresetRecord } from "../../storage/presetTypes"

export type ApplyPresetMode = "merge" | "reset"

interface Props {
  isOpen: boolean
  onClose: () => void
  preset: PresetRecord | null
  /** Called when the user confirms application of the preset. */
  onConfirm: (mode: ApplyPresetMode, applyParams: boolean) => void
}

/**
 * Modal asking the user how to apply a chosen preset to the currently-open
 * layer config form: either overwrite only the preset's fields (merge) or
 * reset the entire form to defaults first and then apply (reset).
 *
 * Also asks whether to apply the preset's variable bindings (`params`) when
 * the preset has any.
 */
export function ApplyPresetModeDialog({
  isOpen,
  onClose,
  preset,
  onConfirm,
}: Props) {
  const [mode, setMode] = useState<ApplyPresetMode>("merge")
  const presetHasParams =
    !!preset?.params && Object.keys(preset.params).length > 0
  const [applyParams, setApplyParams] = useState<boolean>(true)

  useEffect(() => {
    if (isOpen) {
      setMode("merge")
      setApplyParams(presetHasParams)
    }
  }, [isOpen, presetHasParams])

  if (!preset) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay zIndex={2200} />
      <ModalContent containerProps={{ zIndex: 2200 }}>
        <ModalHeader fontSize="md">Apply preset</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="gray.600">
              Apply{" "}
              <Text as="span" fontWeight="semibold">
                {preset.name}
              </Text>{" "}
              to this layer.
            </Text>
            <RadioGroup
              value={mode}
              onChange={(v) => setMode(v as ApplyPresetMode)}
              size="sm"
            >
              <Stack spacing={3}>
                <Radio value="merge">
                  <Text fontSize="sm" fontWeight="medium">
                    Merge over current values
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Only fields stored in the preset are overwritten; other
                    fields keep their current values.
                  </Text>
                </Radio>
                <Radio value="reset">
                  <Text fontSize="sm" fontWeight="medium">
                    Reset and apply
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Reset the form to defaults, then apply the preset.
                  </Text>
                </Radio>
              </Stack>
            </RadioGroup>
            {presetHasParams ? (
              <Checkbox
                size="sm"
                isChecked={applyParams}
                onChange={(e) => setApplyParams(e.target.checked)}
              >
                <Text fontSize="sm">
                  Also apply variable bindings from the preset
                </Text>
              </Checkbox>
            ) : null}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={() => {
              onConfirm(mode, presetHasParams && applyParams)
              onClose()
            }}
          >
            Apply
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
