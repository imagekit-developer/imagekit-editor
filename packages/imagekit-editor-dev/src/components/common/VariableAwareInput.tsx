/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import {
  type InputProps,
  Portal,
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
import {
  type ExpressionToken,
  parseExpressionTokens,
  serializeExpressionTokens,
  suggestionToToken,
} from "./expressionTokens"
import { TokenizedExpressionInput } from "./TokenizedExpressionInput"
import { VariableSuggestionsDropdown } from "./VariableSuggestionsDropdown"
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
}

export function VariableAwareInput({
  value,
  onChange,
  userVariables,
  imageDimensionVariables = DEFAULT_IMAGE_DIMENSION_VARIABLES,
  onFocus,
  onKeyDown,
  ...props
}: VariableAwareInputProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const tokenInputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [anchorPos, setAnchorPos] = useState<AnchorPosition>(null)
  const dropdownRootRef = useRef<HTMLDivElement | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [literalDraft, setLiteralDraft] = useState("")

  const tokens = useMemo(() => parseExpressionTokens(value), [value])
  const query = useMemo(() => getQueryFromValue(literalDraft), [literalDraft])

  const selectable = useMemo((): VariableSuggestion[] => {
    if (!isOpen) return []
    const isPrefix = startsWithImageDimPrefix(query)
    const items: VariableSuggestion[] = []

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
  }, [imageDimensionVariables, isOpen, query, showAdvanced, userVariables])

  const getBestHighlightIndex = useCallback(
    (rawQuery: string, advanced: boolean) => {
      const q = rawQuery.trim()
      if (!q) return -1
      const lower = q.toLowerCase()

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
        // If prefix doesn't match any, fall back to the first user variable.
        const anyUser = selectable.findIndex((s) => s.kind === "userVariable")
        return anyUser >= 0 ? anyUser : -1
      }

      // Image dimension typing: match by code prefix (iw/ih/cw/bw...).
      if (advanced && /^[icb]/.test(lower)) {
        const idx = selectable.findIndex(
          (s) => s.kind === "imageDimension" && s.code.startsWith(lower),
        )
        if (idx >= 0) return idx
        // Fall back to first image dimension entry if no prefix match.
        const anyImg = selectable.findIndex((s) => s.kind === "imageDimension")
        return anyImg >= 0 ? anyImg : 0
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
    // Keep the highlighted item contextual as the user continues typing.
    const next = getBestHighlightIndex(query, showAdvanced)
    if (next >= 0) setHighlightedIndex(next)
    // biome-ignore lint/correctness/useExhaustiveDependencies: depends on computed helpers and flags only
  }, [query, showAdvanced, isOpen, getBestHighlightIndex])

  const refreshAnchor = useCallback(() => {
    const el = anchorRef.current
    if (!el) {
      setAnchorPos(null)
      return
    }
    const r = el.getBoundingClientRect()
    // Always set something stable; even (0,0) is better than never rendering.
    setAnchorPos({
      top: r.bottom + 6,
      left: r.left,
      width: r.width,
    })
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
      // Close if clicked outside (dropdown is in a portal).
      setIsOpen(false)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [isOpen])

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
       * - typing "{{mar" then selecting "{{margin_x}}" should yield only that variable
       */
      const lowerLit = lit.toLowerCase()
      const isAutocompleteQuery =
        lowerLit === "{" ||
        lowerLit === "{{" ||
        lowerLit.startsWith("{{") ||
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
    [literalDraft, onChange, tokens, userVariables],
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
            setLiteralDraft(next)
            const q = getQueryFromValue(next)
            if (!q) {
              setIsOpen(false)
              return
            }
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
          onFocus={(e) => {
            requestAnimationFrame(() => refreshAnchor())
            onFocus?.(e as any)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault()
              ensureOpen()
              dropdownRootRef.current?.focus()
              cycleHighlight(e.key === "ArrowDown" ? 1 : -1)
              return
            }
            if (e.key === "Escape") {
              setIsOpen(false)
            }
            onKeyDown?.(e as any)
          }}
          disabled={(props as any).disabled}
        />
      </div>
      {isOpen && anchorPos ? (
        <Portal>
          <div
            ref={dropdownRootRef}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault()
                cycleHighlight(e.key === "ArrowDown" ? 1 : -1)
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
                inputRef.current?.focus()
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
              userVariables={userVariables}
              imageDimensionVariables={imageDimensionVariables}
              onSelect={handleSelect}
              highlightedIndex={highlightedIndex}
              onHoverIndex={setHighlightedIndex}
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
      const insert = v ? `{{${v.name}}}` : "{{variable}}"
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
