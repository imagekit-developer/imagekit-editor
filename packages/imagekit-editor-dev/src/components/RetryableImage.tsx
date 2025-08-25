import type { ImageProps } from "@chakra-ui/react"
import {
  Box,
  Button,
  Center,
  Image as ChakraImage,
  Flex,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useVisibility } from "../hooks/useVisibility"

export interface RetryableImageProps extends ImageProps {
  maxRetries?: number
  retryDelay?: number
  onRetryExhausted?: () => void
  onRetry?: (attempt: number) => void
  nonRetryableStatusCodes?: number[]
  onNonRetryableError?: (statusCode?: number) => void
  showRetryButton?: boolean
  compactError?: boolean
  isLoading?: boolean
  lazy?: boolean
  rootMargin?: string
  intersectionRoot?: Element | null
}

const DEFAULT_NON_RETRYABLE = [
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414,
  415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451, 500,
  501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
]

// Minimal in-flight dedupe map
const inflight = new Map<
  string,
  Promise<{ ok: true } | { ok: false; status?: number; message: string }>
>()

const baseUrl = (url?: string) => {
  if (!url) return ""
  try {
    const u = new URL(
      url,
      typeof window !== "undefined" ? window.location.href : undefined,
    )
    return `${u.origin}${u.pathname}`
  } catch {
    return url.split("?")[0].split("#")[0]
  }
}

export default function RetryableImage(props: RetryableImageProps) {
  const {
    src,
    maxRetries = 3,
    retryDelay = 1000,
    onRetryExhausted,
    onRetry,
    nonRetryableStatusCodes = DEFAULT_NON_RETRYABLE,
    onNonRetryableError,
    showRetryButton = true,
    compactError = false,
    isLoading: externalLoading,
    alt,
    lazy = true,
    rootMargin = "400px",
    intersectionRoot,
    ...imgProps
  } = props

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<{
    status?: number
    message: string
  } | null>(null)
  const [attempt, setAttempt] = useState<number>(0)
  const [displayedSrc, setDisplayedSrc] = useState<string | undefined>(
    undefined,
  )

  const currentSrcBase = useMemo(
    () => baseUrl(typeof src === "string" ? src : undefined),
    [src],
  )
  const lastSuccessBaseRef = useRef<string>("")

  const abortRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (abortRef.current) abortRef.current.abort()
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  const { ref: rootRef, visible } = useVisibility<HTMLDivElement>(
    lazy,
    rootMargin,
    intersectionRoot ?? undefined,
  )

  const preflight = useCallback(
    async (
      signal: AbortSignal,
    ): Promise<
      { ok: true } | { ok: false; status?: number; message: string }
    > => {
      try {
        // Prefer HEAD to avoid downloading body; fall back to GET if HEAD fails quickly
        let res: Response | null = null
        try {
          res = await fetch(String(src), {
            method: "HEAD",
            cache: "no-cache",
            signal,
          })
        } catch {
          // Some CDNs don't allow HEAD on images—fall back to GET
          res = await fetch(String(src), {
            method: "GET",
            cache: "no-cache",
            signal,
          })
        }
        if (res.status !== 200) {
          return {
            ok: false,
            status: res.status,
            message: `HTTP ${res.status}`,
          }
        }
        return { ok: true }
      } catch (e: any) {
        return { ok: false, message: e?.message || "Network error" }
      }
    },
    [src],
  )

  const beginLoad = useCallback(
    (tryIdx = 0) => {
      if (!mountedRef.current || !src) return

      // If only query params changed and we have a prior success for the same base, keep old image until new resolves
      if (
        lastSuccessBaseRef.current &&
        lastSuccessBaseRef.current === currentSrcBase
      ) {
        setLoading(true)
        setError(null)
      } else {
        setDisplayedSrc(undefined)
        setLoading(true)
        setError(null)
      }

      const controller = new AbortController()
      abortRef.current = controller

      let p = inflight.get(src as string)
      if (!p) {
        p = preflight(controller.signal)
        inflight.set(src as string, p)
      }

      p.then((result) => {
        if (!mountedRef.current || controller.signal.aborted) return
        if (inflight.get(src as string) === p) inflight.delete(src as string)

        if (!result.ok) {
          if (
            result.status &&
            nonRetryableStatusCodes.includes(result.status)
          ) {
            setError({ status: result.status, message: result.message })
            setLoading(false)
            onNonRetryableError?.(result.status)
            return
          }
          if (tryIdx < maxRetries) {
            const next = tryIdx + 1
            onRetry?.(next)
            setAttempt(next)
            retryTimeoutRef.current = window.setTimeout(
              () => beginLoad(next),
              retryDelay,
            )
            return
          }
          setError({ status: result.status, message: result.message })
          setLoading(false)
          onRetryExhausted?.()
          return
        }

        // Status 200: render direct URL; decode validation happens via onLoad/onError events
        setDisplayedSrc(src as string)
        // keep loading true until onLoad fires to confirm decode
      })
    },
    [
      currentSrcBase,
      maxRetries,
      nonRetryableStatusCodes,
      onNonRetryableError,
      onRetry,
      onRetryExhausted,
      preflight,
      retryDelay,
      src,
    ],
  )

  // React to src/visibility changes
  useEffect(() => {
    if (!src) return
    if (lazy && !visible) return
    beginLoad(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, visible, lazy])

  const overlayActive = !!externalLoading || loading

  // Image element event handlers for decode validation
  const handleImgLoad = () => {
    setLoading(false)
    setError(null)
    lastSuccessBaseRef.current = currentSrcBase
  }
  const handleImgError = () => {
    // We had a 200 but decode failed (bad image). Retry according to policy
    if (attempt < (maxRetries ?? 0)) {
      const next = attempt + 1
      setAttempt(next)
      onRetry?.(next)
      retryTimeoutRef.current = window.setTimeout(
        () => beginLoad(next),
        retryDelay,
      )
    } else {
      setLoading(false)
      setError({ message: "Invalid or undecodable image" })
      onRetryExhausted?.()
    }
  }

  return (
    <Box ref={rootRef as any} position="relative" display="inline-block">
      {error ? (
        <Center
          w={props.width || "full"}
          h={props.height || 56}
          borderWidth="0"
          borderRadius="md"
        >
          <Flex
            direction="column"
            align="center"
            justify="center"
            p={compactError ? 1 : 4}
            border="1px dashed"
            borderColor="gray.300"
            borderRadius={compactError ? "sm" : "md"}
            bg="gray.50"
            minH={compactError ? "auto" : "200px"}
          >
            <VStack spacing={compactError ? 1 : 3}>
              {!compactError && (
                <Text fontSize="md" color="gray.500" textAlign="center">
                  {error.status &&
                  nonRetryableStatusCodes.includes(error.status)
                    ? `Failed to load image (Error ${error.status})`
                    : `Failed to load image after ${maxRetries} attempts`}
                </Text>
              )}
              {compactError && (
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  ❌
                </Text>
              )}
              {showRetryButton && !compactError && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => beginLoad(0)}
                >
                  Try Again
                </Button>
              )}
            </VStack>
          </Flex>
        </Center>
      ) : displayedSrc ? (
        <>
          <ChakraImage
            src={displayedSrc}
            alt={alt}
            onLoad={handleImgLoad}
            onError={handleImgError}
            loading="lazy"
            {...imgProps}
          />
          {overlayActive && (
            <Center position="absolute" inset={0} bg="blackAlpha.400">
              <Spinner thickness="3px" />
            </Center>
          )}
        </>
      ) : (
        <Center
          w={props.width || "full"}
          h={props.height || 56}
          borderWidth="0"
          borderRadius="md"
        >
          {lazy && !visible ? <span /> : <Spinner thickness="3px" />}
        </Center>
      )}
    </Box>
  )
}

export const MemoRetryableImage = React.memo(RetryableImage)
