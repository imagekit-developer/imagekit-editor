import {
  Box,
  Flex,
  Grid,
  Icon,
  IconButton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
} from "@chakra-ui/react"
import { PiCheck } from "@react-icons/all-files/pi/PiCheck"
import { PiCopy } from "@react-icons/all-files/pi/PiCopy"
import type React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import {
  IMG_VAR_CODES,
  makeAlphaNumBoundaryAlternationRe,
  OP_CODES,
  USER_VAR_TOKEN_GLOBAL_RE,
  USER_VAR_UUID_INNER_RE,
} from "../../expression/regexes"
import type { TemplateVariable } from "../../storage/types"

const IMG_VAR_RE = makeAlphaNumBoundaryAlternationRe(IMG_VAR_CODES, "g")
const OP_RE = makeAlphaNumBoundaryAlternationRe(OP_CODES, "g")
const USER_VAR_RE = /\{\{[^}]+\}\}/g

function safeDecodeUrlForDisplay(url: string) {
  // Only for display. Copy uses the same display string.
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

function replaceUuidUserVarsWithNames(
  input: string,
  variables: Pick<TemplateVariable, "id" | "name">[],
) {
  if (!variables.length) return input
  const byId = new Map(variables.map((v) => [v.id.toLowerCase(), v.name]))
  return input.replace(USER_VAR_TOKEN_GLOBAL_RE, (full, uuidInner) => {
    const inner = String(uuidInner ?? "").trim()
    // Defensive: even though the regex is UUID-only.
    if (!USER_VAR_UUID_INNER_RE.test(inner)) return full
    const name = byId.get(inner.toLowerCase())
    return name ? `{{${name}}}` : full
  })
}

function renderHighlightedUrl(text: string) {
  // Single-pass tokenizer by splitting on user vars first, then image vars.
  const parts: Array<React.ReactNode> = []
  let cursor = 0
  const matches: Array<{
    start: number
    end: number
    kind: "user" | "img" | "op"
  }> = []

  for (const m of text.matchAll(USER_VAR_RE)) {
    if (m.index === undefined) continue
    matches.push({ start: m.index, end: m.index + m[0].length, kind: "user" })
  }
  for (const m of text.matchAll(IMG_VAR_RE)) {
    if (m.index === undefined) continue
    matches.push({ start: m.index, end: m.index + m[0].length, kind: "img" })
  }
  for (const m of text.matchAll(OP_RE)) {
    if (m.index === undefined) continue
    matches.push({ start: m.index, end: m.index + m[0].length, kind: "op" })
  }
  matches.sort((a, b) => a.start - b.start)

  for (const match of matches) {
    if (match.start < cursor) continue
    if (match.start > cursor) {
      parts.push(
        <span key={`t-${cursor}`}>{text.slice(cursor, match.start)}</span>,
      )
    }
    const tokenText = text.slice(match.start, match.end)
    if (match.kind === "img") {
      parts.push(
        <Text
          key={`img-${match.start}`}
          as="span"
          color="editorBlue.600"
          bg="editorBlue.50"
          borderWidth="1px"
          borderColor="editorBlue.100"
          px="1"
          rounded="sm"
          fontWeight="semibold"
        >
          {tokenText}
        </Text>,
      )
    } else if (match.kind === "op") {
      parts.push(
        <Text
          key={`op-${match.start}`}
          as="span"
          bg="editorGray.200"
          color="editorBattleshipGrey.800"
          borderWidth="1px"
          borderColor="editorGray.300"
          px="1"
          rounded="sm"
          fontWeight="semibold"
        >
          {tokenText}
        </Text>,
      )
    } else {
      parts.push(
        <Text
          key={`user-${match.start}`}
          as="span"
          color="editorBattleshipGrey.800"
          bg="editorPale"
          borderWidth="1px"
          borderColor="editorYellowOrange"
          px="1"
          rounded="sm"
          fontWeight="semibold"
        >
          {tokenText}
        </Text>,
      )
    }
    cursor = match.end
  }

  if (cursor < text.length) {
    parts.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>)
  }
  return parts
}

export interface UrlPreviewStripProps {
  primitiveUrl: string
  finalUrl: string
  templateVariables?: Array<Pick<TemplateVariable, "id" | "name">>
}

export function UrlPreviewStrip({
  primitiveUrl,
  finalUrl,
  templateVariables = [],
}: UrlPreviewStripProps) {
  const [tabIndex, setTabIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<number | null>(null)

  const primitiveDisplay = useMemo(() => {
    const decoded = safeDecodeUrlForDisplay(primitiveUrl)
    return replaceUuidUserVarsWithNames(decoded, templateVariables)
  }, [primitiveUrl, templateVariables])
  const finalDisplay = useMemo(
    () => safeDecodeUrlForDisplay(finalUrl),
    [finalUrl],
  )

  const activeText = tabIndex === 0 ? primitiveDisplay : finalDisplay

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeText)
      setCopied(true)
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current)
      }
      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        copiedTimerRef.current = null
      }, 1000)
    } catch {
      // ignore
    }
  }, [activeText])

  return (
    <Box
      width="full"
      borderTop="1px"
      borderColor="editorGray.300"
      bg="editorGray.50"
    >
      <Flex align="center" justify="space-between" px="4" pt="2">
        <Tabs
          index={tabIndex}
          onChange={setTabIndex}
          variant="unstyled"
          isFitted={false}
        >
          <TabList gap="2">
            <Tab
              px="3"
              py="1.5"
              fontSize="sm"
              color={
                tabIndex === 0 ? "editorBlue.600" : "editorBattleshipGrey.700"
              }
              fontWeight={tabIndex === 0 ? "semibold" : "medium"}
              borderBottomWidth="2px"
              borderBottomColor={
                tabIndex === 0 ? "editorBlue.500" : "transparent"
              }
              _focus={{ boxShadow: "none" }}
            >
              Primitive URL
            </Tab>
            <Tab
              px="3"
              py="1.5"
              fontSize="sm"
              color={
                tabIndex === 1 ? "editorBlue.600" : "editorBattleshipGrey.700"
              }
              fontWeight={tabIndex === 1 ? "semibold" : "medium"}
              borderBottomWidth="2px"
              borderBottomColor={
                tabIndex === 1 ? "editorBlue.500" : "transparent"
              }
              _focus={{ boxShadow: "none" }}
            >
              Final URL
            </Tab>
          </TabList>
          <TabPanels display="none">
            <TabPanel />
            <TabPanel />
          </TabPanels>
        </Tabs>
      </Flex>

      <Grid
        w="full"
        templateColumns="1fr auto"
        alignItems="center"
        gap="2"
        px="4"
        pb="3"
        pt="2"
      >
        <Box
          minW={0}
          maxW="100%"
          fontFamily="mono"
          fontSize="xs"
          color="editorBattleshipGrey.800"
          overflowX="auto"
          whiteSpace="nowrap"
        >
          {tabIndex === 0
            ? renderHighlightedUrl(primitiveDisplay)
            : renderHighlightedUrl(finalDisplay)}
        </Box>

        <Tooltip label="Copy URL" hasArrow>
          <IconButton
            aria-label="Copy URL"
            icon={<Icon as={copied ? PiCheck : PiCopy} />}
            size="sm"
            variant="ghost"
            onClick={copy}
            flexShrink={0}
          />
        </Tooltip>
      </Grid>
    </Box>
  )
}
