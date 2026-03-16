import { Input } from "@chakra-ui/react"
import React, { useEffect, useRef, useState } from "react"
import { useEditorStore } from "../../store"

const UNTITLED = "Untitled Template"

export function TemplateNameInput() {
  const templateName = useEditorStore((s) => s.templateName)
  const isPristine = useEditorStore((s) => s.isPristine)
  const setTemplateName = useEditorStore((s) => s.setTemplateName)

  const [localValue, setLocalValue] = useState(templateName)
  const localValueRef = useRef(localValue)
  const inputRef = useRef<HTMLInputElement>(null)
  const isFocusedRef = useRef(false)
  const prevIsPristineRef = useRef(isPristine)

  localValueRef.current = localValue

  // Sync from store when not focused so external changes (e.g. loading a
  // template from the dropdown) update the input without overwriting in-progress edits.
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(templateName)
    }
  }, [templateName])

  // Focus the input whenever a new template is created (isPristine transitions
  // false → true, which only happens via resetToNewTemplate).
  useEffect(() => {
    const wasPristine = prevIsPristineRef.current
    prevIsPristineRef.current = isPristine
    if (isPristine && !wasPristine) {
      inputRef.current?.focus()
    }
  }, [isPristine])

  const commit = () => {
    const trimmed = localValueRef.current.trim()
    const finalName = trimmed || UNTITLED
    if (!trimmed) {
      setLocalValue(UNTITLED)
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
      setLocalValue(templateName)
      inputRef.current?.blur()
    }
  }

  const isDefault = localValue === UNTITLED

  return (
    <Input
      ref={inputRef}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      variant="unstyled"
      fontWeight="medium"
      fontSize="md"
      color={isDefault ? "editorBattleshipGrey.500" : "editorBattleshipGrey.900"}
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
