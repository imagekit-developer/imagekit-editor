import { Input } from "@chakra-ui/react"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useEditorStore } from "../../store"
import { chakraAny, formatTemplateNameForUI } from "../../utils"

const UNTITLED = "Untitled Template"
const InputAny = chakraAny(Input)

export function TemplateNameInput() {
  const templateNameRaw = useEditorStore((s) => s.templateName)
  const templateId = useEditorStore((s) => s.templateId)
  const isPristine = useEditorStore((s) => s.isPristine)
  const setTemplateName = useEditorStore((s) => s.setTemplateName)

  const templateNameUI = formatTemplateNameForUI(templateNameRaw)
  const [localValue, setLocalValue] = useState(templateNameUI)
  const localValueRef = useRef(localValue)
  const inputRef = useRef<HTMLInputElement>(null)
  const isFocusedRef = useRef(false)
  const didUserEditRef = useRef(false)
  const prevIsPristineRef = useRef(isPristine)

  localValueRef.current = localValue

  // Sync from store when not focused so external changes (e.g. loading a
  // template from the dropdown) update the input without overwriting in-progress edits.
  useEffect(() => {
    if (!isFocusedRef.current) {
      didUserEditRef.current = false
      setLocalValue(formatTemplateNameForUI(templateNameRaw))
    }
  }, [templateNameRaw])

  // Focus the input when starting a new unsaved template (reset → pristine with no id).
  // Do not focus when transitioning to pristine after a successful save (id stays set).
  useEffect(() => {
    const wasPristine = prevIsPristineRef.current
    prevIsPristineRef.current = isPristine
    if (isPristine && !wasPristine && templateId === null) {
      inputRef.current?.focus()
    }
  }, [isPristine, templateId])

  const commit = () => {
    const trimmed = localValueRef.current.trim()
    const finalName = trimmed || UNTITLED
    if (!trimmed) {
      setLocalValue(UNTITLED)
    }

    // Avoid mutating store just because the persisted name was HTML-encoded.
    if (!didUserEditRef.current && finalName === templateNameUI) {
      return
    }

    // setTemplateName only marks isPristine:false when the name actually changed,
    // which is what gates the auto-save in useAutoSaveTemplate.
    setTemplateName(finalName)
  }

  const handleFocus = () => {
    isFocusedRef.current = true
    inputRef.current?.select()
  }

  const handleBlur = () => {
    isFocusedRef.current = false
    commit()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      inputRef.current?.blur()
    }
    if (e.key === "Escape") {
      didUserEditRef.current = false
      setLocalValue(templateNameUI)
      inputRef.current?.blur()
    }
  }

  const isDefault = localValue === UNTITLED

  return (
    <InputAny
      ref={inputRef}
      value={localValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        didUserEditRef.current = true
        setLocalValue(e.target.value)
      }}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      variant="unstyled"
      fontWeight="medium"
      fontSize="md"
      color={
        isDefault ? "editorBattleshipGrey.500" : "editorBattleshipGrey.900"
      }
      placeholder={UNTITLED}
      _placeholder={{ color: "editorBattleshipGrey.500" }}
      width="auto"
      minW="10rem"
      maxW="22rem"
      px="2"
      py="1"
      borderRadius="md"
      _hover={{ bg: "editorGray.200" }}
      _focus={{ bg: "editorGray.200", outline: "none", boxShadow: "none" }}
      cursor="text"
    />
  )
}
