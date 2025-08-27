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
  showRetryButton?: boolean
  compactError?: boolean
  isLoading?: boolean
  lazy?: boolean
  rootMargin?: string
  intersectionRoot?: Element | null
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

export default function RetryableImage(props: RetryableImageProps) {
  const {
    src,
    maxRetries = 10,
    retryDelay = 10000,
    onRetryExhausted,
    onRetry,
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
  const [error, setError] = useState<{ message: string } | null>(null)
  const [attempt, setAttempt] = useState<number>(0)
  const [displayedSrc, setDisplayedSrc] = useState<string | undefined>(
    undefined,
  )
  const [probing, setProbing] = useState<boolean>(false)

  const currentSrcBase = useMemo(
    () => baseUrl(typeof src === "string" ? src : undefined),
    [src],
  )
  const lastSuccessBaseRef = useRef<string>("")

  const retryTimeoutRef = useRef<number | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  const { ref: rootRef, visible } = useVisibility<HTMLDivElement>(
    lazy,
    rootMargin,
    intersectionRoot ?? undefined,
  )

  const beginLoad = useCallback(() => {
    if (!mountedRef.current || !src) return

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

    setProbing(true)
  }, [currentSrcBase, src])

  useEffect(() => {
    if (!src) return
    if (lazy && !visible) return
    setAttempt(0)
    beginLoad(0)
  }, [src, visible, lazy])

  const scheduleRetry = useCallback(() => {
    if (attempt + 1 > maxRetries) {
      setLoading(false)
      setError({ message: "Image failed to load after retries." })
      onRetryExhausted?.()
      setProbing(false)
      return
    }
    const next = attempt + 1
    setAttempt(next)
    onRetry?.(next)
    retryTimeoutRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return
      beginLoad()
    }, retryDelay)
  }, [attempt, maxRetries, onRetry, onRetryExhausted, retryDelay, beginLoad])

  const handleProbeLoad = () => {
    if (!src) return
    setDisplayedSrc(String(src))
    setLoading(false)
    setError(null)
    setProbing(false)
    lastSuccessBaseRef.current = currentSrcBase
  }

  const handleProbeError = () => {
    setProbing(false)
    scheduleRetry()
  }

  const overlayActive = !!externalLoading || loading

  const handleVisibleLoad = () => {
    setLoading(false)
    setError(null)
    lastSuccessBaseRef.current = currentSrcBase
  }
  const handleVisibleError = () => {
    scheduleRetry()
  }

  return (
    <Box ref={rootRef as any} position="relative" display="inline-block">
      {error ? (
        <Center
          w={imgProps.width || "full"}
          h={imgProps.height || 24}
          borderWidth="0"
          borderRadius="md"
          minW={imgProps.minW ?? 32}
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
            minW={imgProps.minW ?? 32}
            {...(imgProps.boxSize && { boxSize: imgProps.boxSize })}
            {...(imgProps.w && { w: imgProps.w })}
            {...(imgProps.h && { h: imgProps.h })}
          >
            <VStack spacing={compactError ? 1 : 3}>
              {!compactError && (
                <Text fontSize="md" color="gray.500" textAlign="center">
                  Failed to load image
                  {maxRetries ? ` after ${maxRetries} attempts` : ""}
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
      ) : (
        <>
          {displayedSrc ? (
            <>
              <ChakraImage
                src={displayedSrc}
                alt={alt}
                onLoad={handleVisibleLoad}
                onError={handleVisibleError}
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
              w={imgProps.width || "full"}
              h={imgProps.height || 24}
              minW={imgProps.minW ?? 32}
              borderWidth="0"
              borderRadius="md"
            >
              {lazy && !visible ? <span /> : <Spinner thickness="3px" />}
            </Center>
          )}

          {probing && src && (
            <img
              src={src}
              alt=""
              onLoad={handleProbeLoad}
              onError={handleProbeError}
              style={{
                position: "absolute",
                width: 0,
                height: 0,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
          )}
        </>
      )}
    </Box>
  )
}

export const MemoRetryableImage = React.memo(RetryableImage)
