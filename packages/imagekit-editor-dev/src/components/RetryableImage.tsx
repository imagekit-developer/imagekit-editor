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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
}

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

async function ensureDecodableImage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error("Response is not an image")
  }
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("Invalid or undecodable image"))
    img.src = objectUrl
  })
  return objectUrl
}

const DEFAULT_NON_RETRYABLE = [400, 401, 403, 404, 410, 422, 500, 502, 503, 504]

export default function RetryableImage(props: RetryableImageProps) {
  const {
    src,
    maxRetries = 10,
    retryDelay = 10000,
    onRetryExhausted,
    onRetry,
    nonRetryableStatusCodes = DEFAULT_NON_RETRYABLE,
    onNonRetryableError,
    showRetryButton = true,
    compactError = false,
    isLoading: externalLoading,
    alt,
    ...imgProps
  } = props

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<{
    status?: number
    message: string
  } | null>(null)
  const [, setAttempt] = useState<number>(0)

  const [displayedSrc, setDisplayedSrc] = useState<string | undefined>(
    undefined,
  )
  const displayedObjectUrlRef = useRef<string | null>(null)
  const [lastSuccessBase, setLastSuccessBase] = useState<string>("")

  const currentSrcBase = useMemo(
    () => baseUrl(typeof src === "string" ? src : undefined),
    [src],
  )

  const abortRef = useRef<AbortController | null>(null)
  const retryTimeoutRef = useRef<number | null>(null)

  const clearPending = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (retryTimeoutRef.current) {
      window.clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearPending()
      if (displayedObjectUrlRef.current) {
        URL.revokeObjectURL(displayedObjectUrlRef.current)
        displayedObjectUrlRef.current = null
      }
    }
  }, [clearPending])

  const startFetch = useCallback(
    (freshAttempt = 0) => {
      clearPending()
      setAttempt(freshAttempt)
      setError(null)

      const controller = new AbortController()
      abortRef.current = controller

      const doFetch = async (tryIndex: number) => {
        setLoading(true)
        try {
          const res = await fetch(String(src), {
            cache: "no-store",
            signal: controller.signal,
          })

          if (res.status !== 200) {
            if (nonRetryableStatusCodes.includes(res.status)) {
              setError({ status: res.status, message: `HTTP ${res.status}` })
              setLoading(false)
              onNonRetryableError?.(res.status)
              return
            }
            throw new Error(`HTTP ${res.status}`)
          }

          let objectUrl: string | null = null
          try {
            objectUrl = await ensureDecodableImage(res)
          } catch (e: any) {
            if (tryIndex < maxRetries) {
              const nextAttempt = tryIndex + 1
              onRetry?.(nextAttempt)
              retryTimeoutRef.current = window.setTimeout(
                () => doFetch(nextAttempt),
                retryDelay,
              )
              return
            }
            setError({ message: e?.message || "Invalid image" })
            setLoading(false)
            onRetryExhausted?.()
            return
          }

          if (displayedObjectUrlRef.current) {
            URL.revokeObjectURL(displayedObjectUrlRef.current)
          }
          displayedObjectUrlRef.current = objectUrl
          setDisplayedSrc(objectUrl)
          setLastSuccessBase(currentSrcBase)
          setLoading(false)
          setError(null)
        } catch (e: any) {
          if (controller.signal.aborted) return
          if (tryIndex < maxRetries) {
            const nextAttempt = tryIndex + 1
            onRetry?.(nextAttempt)
            retryTimeoutRef.current = window.setTimeout(
              () => doFetch(nextAttempt),
              retryDelay,
            )
            return
          }
          setError({ message: e?.message || "Failed to load image" })
          setLoading(false)
          onRetryExhausted?.()
        }
      }

      void doFetch(0)
    },
    [
      clearPending,
      currentSrcBase,
      maxRetries,
      nonRetryableStatusCodes,
      onRetry,
      onRetryExhausted,
      onNonRetryableError,
      retryDelay,
      src,
    ],
  )

  useEffect(() => {
    if (!src) return

    const sameUnderlyingImage =
      lastSuccessBase && currentSrcBase === lastSuccessBase

    if (sameUnderlyingImage) {
      setLoading(true)
      setError(null)
      startFetch(0)
      return
    }

    if (displayedObjectUrlRef.current) {
      URL.revokeObjectURL(displayedObjectUrlRef.current)
      displayedObjectUrlRef.current = null
    }
    setDisplayedSrc(undefined)
    setLastSuccessBase("")
    setLoading(true)
    setError(null)
    startFetch(0)
  }, [src, currentSrcBase, lastSuccessBase, startFetch])

  const overlayActive = !!externalLoading || loading

  return (
    <Box position="relative" display="inline-block">
      {error ? (
        <Center
          w={imgProps.width || "full"}
          h={imgProps.height || 56}
          borderWidth="0"
          borderRadius="md"
          minW={imgProps.minW ?? 40}
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
            h={compactError ? "100%" : undefined}
            minH={compactError ? "auto" : "200px"}
            minW={imgProps.minW ?? 40}
            {...(imgProps.boxSize && { boxSize: imgProps.boxSize })}
            {...(imgProps.w && { w: imgProps.w })}
            {...(imgProps.h && { h: imgProps.h })}
          >
            <VStack spacing={compactError ? 1 : 3}>
              {!compactError && (
                <Text fontSize="md" color="gray.500" textAlign="center">
                  {nonRetryableStatusCodes.includes(error.status ?? -1)
                    ? `Failed to load image (Error ${error.status ?? "Unknown"})`
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
                  onClick={() => {
                    setAttempt(0)
                    setError(null)
                    startFetch(0)
                  }}
                >
                  Try Again
                </Button>
              )}
            </VStack>
          </Flex>
        </Center>
      ) : displayedSrc ? (
        <>
          <ChakraImage src={displayedSrc} alt={alt} {...imgProps} />
          {overlayActive && (
            <Center position="absolute" inset={0} bg="blackAlpha.400">
              <Spinner />
            </Center>
          )}
        </>
      ) : (
        <Center
          w={imgProps.width || "full"}
          h={imgProps.height || 56}
          minW={imgProps.minW ?? 40}
          borderWidth="0"
          borderRadius="md"
        >
          <Spinner />
        </Center>
      )}
    </Box>
  )
}
