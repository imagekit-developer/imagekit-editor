/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import {
  Flex,
  type InputProps,
  Portal,
  Text,
  Textarea,
  type TextareaProps,
} from "@chakra-ui/react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { TemplateVariable } from "../../storage/types"
import { useEditorStore } from "../../store"
import {
  type ExpressionToken,
  parseExpressionTokens,
  serializeExpressionTokens,
  suggestionToToken,
  USER_VAR_UUID_INNER_RE,
} from "./expressionTokens"
import { resolveExpressionTokensToNumber } from "./resolveExpression"
import { TokenizedExpressionInput } from "./TokenizedExpressionInput"
import { VariableSuggestionsDropdown } from "./VariableSuggestionsDropdown"
import {
  type UserVariableDefinitionSavePayload,
  VariableValueEditPopover,
} from "./VariableValueEditPopover"
import {
  DEFAULT_IMAGE_DIMENSION_VARIABLES,
  getQueryFromValue,
  startsWithImageDimPrefix,
} from "./variableSuggestions"
import type {
  ImageDimensionVariableSuggestion,
  UserVariableSuggestion,
  VariableSuggestion,
} from "./variableSuggestionTypes"

type AnchorPosition = { top: number; left: number; width: number } | null

/** Same placement math as the variable suggestions dropdown (`refreshAnchor`). */
function computeFloatingDropdownPosition(
  anchorRect: DOMRect,
  floatingHeight: number,
): { top: number; left: number } {
  const gutter = 6
  const margin = 8
  const preferBelowTop = anchorRect.bottom + gutter
  const canFitBelow =
    preferBelowTop + floatingHeight <= window.innerHeight - margin
  const canFitAbove = anchorRect.top - gutter - floatingHeight >= margin
  let top =
    !canFitBelow && canFitAbove
      ? anchorRect.top - gutter - floatingHeight
      : preferBelowTop
  // Clamp within viewport to avoid large jumps when height is estimated.
  const maxTop = window.innerHeight - margin - floatingHeight
  if (top < margin) top = margin
  if (top > maxTop) top = Math.max(margin, maxTop)
  return { top, left: anchorRect.left }
}

// Used before the popover mounts/measures (prevents initial "jump far above").
const ESTIMATED_VALUE_EDIT_POPOVER_HEIGHT_PX = 140

// Legacy helper still used by VariableAwareTextarea (left as-is for now).
function getAnchorRect(el: HTMLElement | null) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (!Number.isFinite(r.left) || !Number.isFinite(r.top)) return null
  return r
}

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  insert: string,
) {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = el.value.slice(0, start) + insert + el.value.slice(end)
  const nextPos = start + insert.length
  return { next, nextPos }
}

function replaceTrailingQueryAtCursor(input: HTMLInputElement, query: string) {
  const q = query.trim()
  if (!q) return
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? input.value.length
  if (start !== end) return
  if (start < q.length) return
  const before = input.value.slice(0, start)
  if (!before.endsWith(q)) return
  const next =
    before.slice(0, before.length - q.length) + input.value.slice(end)
  const nextPos = start - q.length
  input.value = next
  input.setSelectionRange(nextPos, nextPos)
}

function deleteBackwardAtCursor(input: HTMLInputElement) {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? input.value.length

  if (start !== end) {
    const next = input.value.slice(0, start) + input.value.slice(end)
    const nextPos = start
    return { next, nextPos }
  }

  if (start <= 0) {
    return { next: input.value, nextPos: 0 }
  }

  const next = input.value.slice(0, start - 1) + input.value.slice(end)
  const nextPos = start - 1
  return { next, nextPos }
}

export interface VariableAwareInputProps extends Omit<InputProps, "onChange"> {
  value: string
  onChange: (next: string) => void
  userVariables: UserVariableSuggestion[]
  imageDimensionVariables?: ImageDimensionVariableSuggestion[]
  showResolveStrip?: boolean
  /** Template variable definitions (for popover defaults and persistence). */
  templateVariables?: TemplateVariable[]
  /** Persist variable from the value-edit popover; return true when save succeeded. */
  onUserVariableSave?: (
    payload: UserVariableDefinitionSavePayload,
  ) => Promise<boolean> | boolean
}

export function VariableAwareInput({
  value,
  onChange,
  userVariables,
  imageDimensionVariables = DEFAULT_IMAGE_DIMENSION_VARIABLES,
  showResolveStrip = true,
  templateVariables: templateVariablesProp,
  onUserVariableSave,
  onFocus,
  onKeyDown,
  ...props
}: VariableAwareInputProps) {
  const storeTemplateVariables = useEditorStore((s) => s.templateVariables)
  const templateVariables =
    templateVariablesProp ?? storeTemplateVariables ?? []

  const anchorRef = useRef<HTMLDivElement | null>(null)
  const tokenInputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [anchorPos, setAnchorPos] = useState<AnchorPosition>(null)
  const dropdownRootRef = useRef<HTMLDivElement | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [literalDraft, setLiteralDraft] = useState("")
  const [pendingOperator, setPendingOperator] = useState<
    "add" | "sub" | "mul" | "div" | "mod" | "pow" | null
  >(null)

  const [valueEdit, setValueEdit] = useState<{ variableId: string } | null>(
    null,
  )
  const [valueEditPos, setValueEditPos] = useState<{
    top: number
    left: number
  } | null>(null)
  const [valueEditDraft, setValueEditDraft] = useState("")
  const valueEditPopoverRef = useRef<HTMLDivElement | null>(null)
  const valueEditInputRef = useRef<HTMLInputElement | null>(null)
  const valueEditTimerRef = useRef<number | null>(null)

  const tokens = useMemo(
    () => parseExpressionTokens(value, templateVariables),
    [value, templateVariables],
  )
  const query = useMemo(() => getQueryFromValue(literalDraft), [literalDraft])

  const valueEditDefinitionSeed = useMemo(() => {
    if (!valueEdit) return null
    return templateVariables.find((v) => v.id === valueEdit.variableId) ?? null
  }, [valueEdit, templateVariables])

  const valueEditDisplayName = useMemo(() => {
    if (!valueEdit) return ""
    const fromTpl = templateVariables.find((v) => v.id === valueEdit.variableId)
    if (fromTpl) return fromTpl.name
    const fromUv = userVariables.find((v) => v.id === valueEdit.variableId)
    if (fromUv) return fromUv.name
    return valueEdit.variableId
  }, [valueEdit, templateVariables, userVariables])

  const resolveUserVarChipLabel = useCallback(
    (variableId: string) => {
      const fromTpl = templateVariables.find((v) => v.id === variableId)
      if (fromTpl) return `{{${fromTpl.name}}}`
      const fromUv = userVariables.find((v) => v.id === variableId)
      if (fromUv) return `{{${fromUv.name}}}`
      return `{{${variableId}}}`
    },
    [templateVariables, userVariables],
  )

  const canInsertOperator = useMemo(() => {
    if (tokens.length === 0) return false
    const last = tokens[tokens.length - 1]
    if (!last) return false
    if (last.kind === "op") return false
    if (last.kind === "imgVar" || last.kind === "userVar") return true
    if (last.kind === "literal") {
      const n = Number(last.value)
      return Number.isFinite(n)
    }
    return false
  }, [tokens])

  const operatorFromQuery = useCallback((raw: string) => {
    const q = raw.trim().toLowerCase()
    if (!q) return null
    if (q === "+" || q === "add") return "add"
    if (q === "-" || q === "sub") return "sub"
    if (q === "/" || q === "÷" || q === "div") return "div"
    if (q === "*" || q === "x" || q === "mul" || q === "×") return "mul"
    if (q === "%" || q === "mod") return "mod"
    if (q === "^" || q === "pow") return "pow"
    return null
  }, [])

  const operatorIndex = useCallback(
    (op: "add" | "sub" | "mul" | "div" | "mod" | "pow") => {
      const order = ["add", "sub", "mul", "div", "mod", "pow"] as const
      return order.indexOf(op)
    },
    [],
  )

  const cancelValueEditCloseTimer = useCallback(() => {
    if (valueEditTimerRef.current != null) {
      window.clearTimeout(valueEditTimerRef.current)
      valueEditTimerRef.current = null
    }
  }, [])

  const focusTokenInput = useCallback(() => {
    requestAnimationFrame(() => tokenInputRef.current?.focus())
  }, [])

  const closeValueEditPopover = useCallback(() => {
    cancelValueEditCloseTimer()
    setValueEdit(null)
    setValueEditPos(null)
    focusTokenInput()
  }, [cancelValueEditCloseTimer, focusTokenInput])

  const scheduleValueEditPopoverClose = useCallback(() => {
    cancelValueEditCloseTimer()
    valueEditTimerRef.current = window.setTimeout(() => {
      valueEditTimerRef.current = null
      setValueEdit(null)
      setValueEditPos(null)
      focusTokenInput()
    }, 220)
  }, [cancelValueEditCloseTimer, focusTokenInput])

  const refreshValueEditPosition = useCallback(() => {
    if (!valueEdit) return
    const wrap = anchorRef.current
    if (!wrap) return
    const r = wrap.getBoundingClientRect()
    const popH =
      valueEditPopoverRef.current?.getBoundingClientRect().height ??
      ESTIMATED_VALUE_EDIT_POPOVER_HEIGHT_PX
    setValueEditPos(computeFloatingDropdownPosition(r, popH))
  }, [valueEdit])

  const imgNumericMap = useMemo(() => {
    const map: Record<string, number> = {}
    imageDimensionVariables.forEach((v) => {
      // Supports "1234 px" and plain numeric strings like "1.000".
      const pxMatch = String(v.resolvedValue ?? "").match(
        /^(\d+(?:\.\d+)?)\s*px$/i,
      )
      const raw = pxMatch?.[1] ?? String(v.resolvedValue ?? "")
      const n = Number(raw)
      if (Number.isFinite(n)) {
        map[v.code] = n
      }
    })
    return map
  }, [imageDimensionVariables])

  const resolvedNumber = useMemo(() => {
    if (tokens.length === 0) return null
    return resolveExpressionTokensToNumber(tokens, imgNumericMap as any)
  }, [imgNumericMap, tokens])

  const resolveLabel = useMemo(() => {
    // Match the prototype's intent:
    // - "Resolves to" for arithmetic / image-dimension expressions
    // - "Resolved value" for plain values or simple placeholders
    const hasOperator = tokens.some((t) => t.kind === "op")
    const hasImgVar = tokens.some((t) => t.kind === "imgVar")
    return hasOperator || hasImgVar ? "Resolves to" : "Resolved value"
  }, [tokens])

  const selectable = useMemo((): VariableSuggestion[] => {
    if (!isOpen) return []
    const isPrefix = startsWithImageDimPrefix(query)
    const items: VariableSuggestion[] = []

    // Operator-triggered query: arrow keys should cycle operators only.
    if (pendingOperator) {
      return [
        { kind: "operator", operator: "add" },
        { kind: "operator", operator: "sub" },
        { kind: "operator", operator: "mul" },
        { kind: "operator", operator: "div" },
        { kind: "operator", operator: "mod" },
        { kind: "operator", operator: "pow" },
      ] as any
    }

    if (!showAdvanced) {
      userVariables.forEach((v) =>
        items.push({ kind: "userVariable", variableId: v.id }),
      )
      return items
    }

    const imgItems = imageDimensionVariables.map((v) => ({
      kind: "imageDimension" as const,
      code: v.code,
    }))
    const userItems = userVariables.map((v) => ({
      kind: "userVariable" as const,
      variableId: v.id,
    }))

    if (isPrefix) {
      items.push(...imgItems, ...userItems)
    } else {
      items.push(...userItems, ...imgItems)
    }
    return items
  }, [
    imageDimensionVariables,
    isOpen,
    pendingOperator,
    query,
    showAdvanced,
    userVariables,
  ])

  const getBestHighlightIndex = useCallback(
    (rawQuery: string, advanced: boolean) => {
      const q = rawQuery.trim()
      if (!q) return -1
      const lower = q.toLowerCase()
      if (lower.includes("_")) return -1

      // User variable typing: treat anything starting with "{{" as a user-var prefix.
      if (lower.startsWith("{{")) {
        const prefix = lower.slice(2)
        const idx = selectable.findIndex((s) => {
          if (s.kind !== "userVariable") return false
          const uv = userVariables.find((v) => v.id === s.variableId)
          if (!uv) return false
          return uv.name.toLowerCase().startsWith(prefix)
        })
        if (idx >= 0) return idx
        const idIdx = selectable.findIndex((s) => {
          if (s.kind !== "userVariable") return false
          return s.variableId.toLowerCase().startsWith(prefix.toLowerCase())
        })
        if (idIdx >= 0) return idIdx
        // If prefix doesn't match any, fall back to the first user variable.
        const anyUser = selectable.findIndex((s) => s.kind === "userVariable")
        return anyUser >= 0 ? anyUser : -1
      }

      // Image dimension typing: match by code prefix (iw/ih/cw/bw...).
      if (advanced && /^[a-z]{1,3}$/.test(lower) && /^[icb]/.test(lower)) {
        const idx = selectable.findIndex(
          (s) => s.kind === "imageDimension" && s.code.startsWith(lower),
        )
        if (idx >= 0) return idx
        return -1
      }

      // Otherwise: best-effort match user variables by name prefix.
      const userIdx = selectable.findIndex((s) => {
        if (s.kind !== "userVariable") return false
        const uv = userVariables.find((v) => v.id === s.variableId)
        if (!uv) return false
        return uv.name.toLowerCase().startsWith(lower)
      })
      return userIdx
    },
    [selectable, userVariables],
  )

  useEffect(() => {
    if (!isOpen) return
    // In operator-query mode, keep the operator highlight stable.
    if (pendingOperator) return
    // Keep the highlighted item contextual as the user continues typing.
    const next = getBestHighlightIndex(query, showAdvanced)
    setHighlightedIndex(next)
    // biome-ignore lint/correctness/useExhaustiveDependencies: depends on computed helpers and flags only
  }, [query, showAdvanced, isOpen, getBestHighlightIndex, pendingOperator])

  const refreshAnchor = useCallback(() => {
    const el = anchorRef.current
    if (!el) {
      setAnchorPos(null)
      return
    }
    const r = el.getBoundingClientRect()
    const dropdownH =
      dropdownRootRef.current?.getBoundingClientRect().height ?? 220
    const pos = computeFloatingDropdownPosition(r, dropdownH)
    setAnchorPos({ ...pos, width: r.width })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    refreshAnchor()
  }, [isOpen, refreshAnchor, value])

  useEffect(() => {
    if (!isOpen) return
    refreshAnchor()

    const onScroll = () => refreshAnchor()
    const onResize = () => refreshAnchor()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [isOpen, refreshAnchor])

  useEffect(() => {
    if (!isOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (!t) return
      const anchor = anchorRef.current
      if (anchor?.contains(t)) return
      const dropdown = dropdownRootRef.current
      if (dropdown?.contains(t)) return
      if (valueEditPopoverRef.current?.contains(t)) return
      // Close if clicked outside (dropdown is in a portal).
      setIsOpen(false)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [isOpen])

  useLayoutEffect(() => {
    if (!valueEdit) {
      setValueEditPos(null)
      return
    }
    refreshValueEditPosition()
  }, [valueEdit, valueEditDraft, refreshValueEditPosition, value, literalDraft])

  useEffect(() => {
    if (!valueEdit) return
    const onScroll = () => refreshValueEditPosition()
    const onResize = () => refreshValueEditPosition()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [valueEdit, refreshValueEditPosition])

  useEffect(() => {
    if (!valueEdit) return
    const el = valueEditPopoverRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => refreshValueEditPosition())
    ro.observe(el)
    return () => ro.disconnect()
  }, [valueEdit, refreshValueEditPosition])

  useLayoutEffect(() => {
    if (!valueEdit || !valueEditPos) return
    valueEditInputRef.current?.focus()
  }, [valueEdit, valueEditPos])

  useEffect(() => {
    if (!valueEdit) return
    const uv = userVariables.find((v) => v.id === valueEdit.variableId)
    setValueEditDraft(String(uv?.resolvedValue ?? ""))
  }, [valueEdit, userVariables])

  useEffect(() => {
    if (!valueEdit) return
    const stillThere = tokens.some(
      (t) => t.kind === "userVar" && t.variableId === valueEdit.variableId,
    )
    if (!stillThere) closeValueEditPopover()
  }, [tokens, valueEdit, closeValueEditPopover])

  useEffect(() => {
    if (!isOpen) return
    cancelValueEditCloseTimer()
    setValueEdit(null)
    setValueEditPos(null)
  }, [isOpen, cancelValueEditCloseTimer])

  useEffect(() => {
    if (!valueEdit) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (!t) return
      if (anchorRef.current?.contains(t)) return
      if (valueEditPopoverRef.current?.contains(t)) return
      closeValueEditPopover()
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [valueEdit, closeValueEditPopover])

  const handleSelect = useCallback(
    (s: VariableSuggestion) => {
      const token = suggestionToToken(s as any, userVariables)
      if (!token) return

      const nextTokens: ExpressionToken[] = [...tokens]
      const lit = literalDraft.trim()
      /**
       * Do not commit the current `literalDraft` as a literal token when it's being
       * used purely as an autocomplete query.
       *
       * Examples:
       * - typing "iw" then selecting "ih" should yield only "ih" (not "iw" + "ih")
       * - typing "{{" then selecting a variable should yield only that variable
       */
      const lowerLit = lit.toLowerCase()
      const isAutocompleteQuery =
        lowerLit === "{" ||
        lowerLit === "{{" ||
        lowerLit.startsWith("{{") ||
        // operator query (+, -, /, *, x, add, sub, etc.)
        operatorFromQuery(lowerLit) !== null ||
        // image-dimension code query (iw/ih/cw/bw/iar/bh/ch...)
        /^[a-z]{1,3}$/.test(lowerLit)

      if (lit && !isAutocompleteQuery) {
        nextTokens.push({ kind: "literal", value: lit })
      }
      nextTokens.push(token)

      onChange(serializeExpressionTokens(nextTokens))
      setLiteralDraft("")
      setIsOpen(false)
      requestAnimationFrame(() => tokenInputRef.current?.focus())
    },
    [literalDraft, onChange, operatorFromQuery, tokens, userVariables],
  )

  const getUserVarState = useCallback(
    (variableId: string) => {
      const uv = userVariables.find((v) => v.id === variableId)
      if (!uv) return "unresolved" as const
      const rv = String(uv.resolvedValue ?? "").trim()
      if (!rv) return "unresolved" as const
      return "resolved" as const
    },
    [userVariables],
  )

  const ensureOpen = useCallback(() => {
    if (!isOpen) setIsOpen(true)
    requestAnimationFrame(() => refreshAnchor())
  }, [isOpen, refreshAnchor])

  const cycleHighlight = useCallback(
    (delta: 1 | -1) => {
      if (selectable.length === 0) return
      setHighlightedIndex((prev) => {
        const next =
          prev < 0 ? (delta === 1 ? 0 : selectable.length - 1) : prev + delta
        if (next < 0) return selectable.length - 1
        if (next >= selectable.length) return 0
        return next
      })
    },
    [selectable.length],
  )

  useEffect(() => {
    if (!isOpen) return
    if (highlightedIndex < 0) return
    // Scroll highlighted option into view (list area is scrollable).
    const root = dropdownRootRef.current
    if (!root) return
    const el = root.querySelector<HTMLElement>(
      `[data-sidx="${highlightedIndex}"]`,
    )
    el?.scrollIntoView({ block: "nearest" })
  }, [highlightedIndex, isOpen])

  return (
    <>
      <div ref={anchorRef}>
        <TokenizedExpressionInput
          tokens={tokens}
          literalDraft={literalDraft}
          onLiteralDraftChange={(next) => {
            const trimmed = next.trim()
            const autoUuid = trimmed.match(
              new RegExp(
                `^\\{\\{(${USER_VAR_UUID_INNER_RE.source})\\}\\}$`,
                "i",
              ),
            )
            if (autoUuid?.[1]) {
              onChange(
                serializeExpressionTokens([
                  ...tokens,
                  {
                    kind: "userVar",
                    variableId: autoUuid[1].toLowerCase(),
                  },
                ]),
              )
              setLiteralDraft("")
              setIsOpen(false)
              setPendingOperator(null)
              requestAnimationFrame(() => tokenInputRef.current?.focus())
              return
            }
            const auto = trimmed.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/)
            if (auto?.[1]) {
              const byName = templateVariables.find((v) => v.name === auto[1])
              const variableId = byName?.id ?? auto[1]
              onChange(
                serializeExpressionTokens([
                  ...tokens,
                  { kind: "userVar", variableId },
                ]),
              )
              setLiteralDraft("")
              setIsOpen(false)
              setPendingOperator(null)
              requestAnimationFrame(() => tokenInputRef.current?.focus())
              return
            }
            setLiteralDraft(next)
            const q = getQueryFromValue(next)
            if (!q) {
              setIsOpen(false)
              setPendingOperator(null)
              return
            }
            const op = operatorFromQuery(q)
            if (op) {
              // Only show/allow operators when context permits.
              if (!canInsertOperator) {
                setPendingOperator(null)
                setIsOpen(false)
                return
              }
              setIsOpen(true)
              setShowAdvanced(true)
              setPendingOperator(op)
              setHighlightedIndex(operatorIndex(op))
              requestAnimationFrame(() => refreshAnchor())
              return
            }
            setPendingOperator(null)
            if (
              q.toLowerCase() === "i" ||
              q.toLowerCase() === "b" ||
              q.toLowerCase() === "c"
            ) {
              setIsOpen(true)
              setShowAdvanced(true)
              setHighlightedIndex(getBestHighlightIndex(q, true))
              requestAnimationFrame(() => refreshAnchor())
            } else if (q === "{{" || q === "{") {
              setIsOpen(true)
              setShowAdvanced(false)
              setHighlightedIndex(getBestHighlightIndex(q, false))
              requestAnimationFrame(() => refreshAnchor())
            }
          }}
          onCommitLiteral={() => {
            const lit = literalDraft.trim()
            if (!lit) return
            onChange(
              serializeExpressionTokens([
                ...tokens,
                { kind: "literal", value: lit },
              ]),
            )
            setLiteralDraft("")
          }}
          onBackspaceAtEmpty={() => {
            if (tokens.length === 0) return
            const next = tokens.slice(0, -1)
            onChange(serializeExpressionTokens(next))
          }}
          onRemoveToken={(idx) => {
            onChange(
              serializeExpressionTokens(tokens.filter((_, i) => i !== idx)),
            )
          }}
          inputRef={tokenInputRef}
          getUserVarState={getUserVarState as any}
          resolveUserVarChipLabel={resolveUserVarChipLabel}
          onUserVarChipMouseEnter={({ variableId }) => {
            cancelValueEditCloseTimer()
            setIsOpen(false)
            setPendingOperator(null)
            setValueEdit({ variableId })
          }}
          onUserVarChipMouseLeave={scheduleValueEditPopoverClose}
          onFocus={(e) => {
            requestAnimationFrame(() => refreshAnchor())
            onFocus?.(e as any)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const draft = literalDraft.trim().toLowerCase()
              const shouldAcceptHighlighted =
                isOpen &&
                highlightedIndex >= 0 &&
                !!selectable[highlightedIndex] &&
                !draft.includes("_") &&
                (draft.startsWith("{{") ||
                  /^[a-z]{1,3}$/.test(draft) ||
                  operatorFromQuery(draft) !== null)

              if (shouldAcceptHighlighted) {
                e.preventDefault()
                handleSelect(selectable[highlightedIndex])
                return
              }
              if (isOpen && pendingOperator) {
                e.preventDefault()
                handleSelect({
                  kind: "operator",
                  operator: pendingOperator,
                } as any)
                return
              }
              // User is committing a full literal/expression; close dropdown.
              if (isOpen) {
                setIsOpen(false)
                setPendingOperator(null)
              }
            }
            if (
              e.key === "ArrowDown" ||
              e.key === "ArrowUp" ||
              e.key === "ArrowLeft" ||
              e.key === "ArrowRight"
            ) {
              e.preventDefault()
              ensureOpen()
              dropdownRootRef.current?.focus()
              const delta =
                e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1
              cycleHighlight(delta)
              return
            }
            if (e.key === "Escape") {
              setIsOpen(false)
            }
            onKeyDown?.(e as any)
          }}
          disabled={(props as any).disabled}
        />
        {showResolveStrip && tokens.length > 0 ? (
          <Flex
            mt="1.5"
            px="2.5"
            py="1.5"
            rounded="md"
            bg="editorGray.100"
            borderWidth="1px"
            borderColor="editorGray.300"
            align="center"
            gap="2"
            fontSize="xs"
          >
            <Text color="editorBattleshipGrey.700" fontWeight="semibold">
              {resolveLabel}
            </Text>
            <Text
              color="editorGreenishTeal"
              fontFamily="mono"
              fontWeight="semibold"
            >
              {resolvedNumber === null
                ? "—"
                : Number.isInteger(resolvedNumber)
                  ? `${resolvedNumber}`
                  : `${resolvedNumber.toFixed(2)}`}
            </Text>
            <Text
              ml="auto"
              color="editorBattleshipGrey.600"
              fontFamily="mono"
              noOfLines={1}
              cursor="pointer"
              title="Click to copy"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(value || "")
                } catch {
                  // ignore
                }
              }}
            >
              {value || "—"}
            </Text>
          </Flex>
        ) : null}
      </div>
      {isOpen && anchorPos ? (
        <Portal>
          <div
            ref={dropdownRootRef}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (
                e.key === "ArrowDown" ||
                e.key === "ArrowUp" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight"
              ) {
                e.preventDefault()
                const delta =
                  e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1
                cycleHighlight(delta)
                return
              }
              if (e.key === "Backspace") {
                e.preventDefault()
                setIsOpen(false)
                // Return focus to the field; the input inside token field will receive it.
                anchorRef.current
                  ?.querySelector<HTMLInputElement>("input")
                  ?.focus()
                return
              }
              if (e.key === "Enter") {
                e.preventDefault()
                const s = selectable[highlightedIndex]
                if (s) handleSelect(s)
                return
              }
              if (e.key === "Escape") {
                e.preventDefault()
                setIsOpen(false)
                tokenInputRef.current?.focus()
              }
            }}
            style={{
              position: "fixed",
              top: anchorPos.top,
              left: anchorPos.left,
              zIndex: 20000,
              outline: "none",
            }}
          >
            <VariableSuggestionsDropdown
              query={query}
              showAdvanced={showAdvanced}
              showOperators={
                pendingOperator ? true : showAdvanced && canInsertOperator
              }
              highlightMode={pendingOperator ? "operators" : "default"}
              userVariables={userVariables}
              imageDimensionVariables={imageDimensionVariables}
              onSelect={handleSelect}
              highlightedIndex={highlightedIndex}
              onHoverIndex={setHighlightedIndex}
            />
          </div>
        </Portal>
      ) : null}
      {valueEdit && valueEditPos ? (
        <Portal>
          <div
            ref={valueEditPopoverRef}
            tabIndex={-1}
            onMouseEnter={cancelValueEditCloseTimer}
            onMouseLeave={scheduleValueEditPopoverClose}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault()
                closeValueEditPopover()
              }
            }}
            style={{
              position: "fixed",
              top: valueEditPos.top,
              left: valueEditPos.left,
              zIndex: 20001,
              outline: "none",
            }}
          >
            <VariableValueEditPopover
              key={valueEdit.variableId}
              mode={
                (getUserVarState(valueEdit.variableId) as any) === "resolved"
                  ? "resolved"
                  : "unresolved"
              }
              variableId={valueEdit.variableId}
              variableName={valueEditDisplayName}
              value={valueEditDraft}
              onValueChange={setValueEditDraft}
              inputRef={valueEditInputRef}
              onRequestClose={closeValueEditPopover}
              initialVariableType={valueEditDefinitionSeed?.type ?? "text"}
              initialDefinitionDefaultValue={
                valueEditDefinitionSeed?.defaultValue ?? ""
              }
              initialDefinitionDescription={
                valueEditDefinitionSeed?.description ?? ""
              }
              onSave={
                onUserVariableSave
                  ? async (payload) => {
                      const ok = await Promise.resolve(
                        onUserVariableSave(payload),
                      )
                      if (ok) closeValueEditPopover()
                    }
                  : undefined
              }
            />
          </div>
        </Portal>
      ) : null}
    </>
  )
}

export interface VariableAwareTextareaProps
  extends Omit<TextareaProps, "onChange"> {
  value: string
  onChange: (next: string) => void
  userVariables: UserVariableSuggestion[]
  imageDimensionVariables?: ImageDimensionVariableSuggestion[]
}

export function VariableAwareTextarea({
  value,
  onChange,
  userVariables,
  imageDimensionVariables = DEFAULT_IMAGE_DIMENSION_VARIABLES,
  onFocus,
  onKeyDown,
  ...props
}: VariableAwareTextareaProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const query = useMemo(() => getQueryFromValue(value), [value])

  const refreshAnchor = useCallback(() => {
    setAnchorRect(getAnchorRect(inputRef.current))
  }, [])

  useEffect(() => {
    if (!isOpen) return
    refreshAnchor()
    const onScroll = () => refreshAnchor()
    const onResize = () => refreshAnchor()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onResize)
    }
  }, [isOpen, refreshAnchor])

  useEffect(() => {
    if (!isOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node | null
      if (!t) return
      const anchor = inputRef.current
      if (anchor?.contains(t)) return
      setIsOpen(false)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [isOpen])

  const handleSelect = useCallback(
    (s: VariableSuggestion) => {
      const el = inputRef.current
      if (!el) return

      if (s.kind === "operator") {
        const ins = OPERATOR_INSERT[s.operator].insert
        const { next, nextPos } = insertAtCursor(el, ins)
        onChange(next)
        requestAnimationFrame(() => {
          el.focus()
          el.setSelectionRange(nextPos, nextPos)
        })
        return
      }

      if (s.kind === "imageDimension") {
        const { next, nextPos } = insertAtCursor(el, s.code)
        onChange(next)
        requestAnimationFrame(() => {
          el.focus()
          el.setSelectionRange(nextPos, nextPos)
        })
        return
      }

      const v = userVariables.find((uv) => uv.id === s.variableId)
      const insert = v ? `{{${v.id}}}` : "{{variable}}"
      const { next, nextPos } = insertAtCursor(el, insert)
      onChange(next)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(nextPos, nextPos)
      })
    },
    [onChange, userVariables],
  )

  return (
    <>
      <Textarea
        ref={inputRef}
        {...props}
        value={value}
        onChange={(e) => {
          const next = e.target.value
          onChange(next)
          const q = getQueryFromValue(next)
          if (
            q === "{{" ||
            q === "{" ||
            q.toLowerCase() === "i" ||
            q.toLowerCase() === "b" ||
            q.toLowerCase() === "c"
          ) {
            setIsOpen(true)
          }
        }}
        onFocus={(e) => {
          setIsOpen(true)
          refreshAnchor()
          onFocus?.(e)
        }}
        onClick={() => {
          setIsOpen(true)
          refreshAnchor()
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false)
          }
          onKeyDown?.(e)
        }}
      />
      {isOpen && anchorRect ? (
        <Portal>
          <div
            style={{
              position: "fixed",
              top: anchorRect.bottom + 6,
              left: anchorRect.left,
              zIndex: 1500,
            }}
          >
            <VariableSuggestionsDropdown
              query={query}
              userVariables={userVariables}
              imageDimensionVariables={imageDimensionVariables}
              onSelect={handleSelect}
            />
          </div>
        </Portal>
      ) : null}
    </>
  )
}
