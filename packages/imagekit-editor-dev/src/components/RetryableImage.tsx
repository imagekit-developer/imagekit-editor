import {
  Box,
  Button,
  Center,
  Flex,
  Image,
  type ImageProps,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useCallback, useState } from "react"

export interface RetryableImageProps extends ImageProps {
  maxRetries?: number
  retryDelay?: number
  fallbackContent?: React.ReactNode
  onRetryExhausted?: () => void
  onRetry?: (attempt: number) => void
  /** HTTP status codes that should not be retried (default: [400, 401, 403, 404, 410, 422]) */
  nonRetryableStatusCodes?: number[]
  /** Callback fired when a non-retryable error occurs */
  onNonRetryableError?: (statusCode?: number) => void
  /** Whether to show the retry button in error state (default: true) */
  showRetryButton?: boolean
  /** Whether to show compact error state for small images (default: false) */
  compactError?: boolean
  /** Whether to display a loading spinner overlay */
  isLoading?: boolean
}

export const RetryableImage: React.FC<RetryableImageProps> = ({
  maxRetries = 3,
  retryDelay = 10000,
  fallbackContent,
  onRetryExhausted,
  onRetry,
  onError,
  nonRetryableStatusCodes = [400, 401, 403, 404, 410, 422, 500, 502, 503, 504],
  onNonRetryableError,
  showRetryButton = true,
  compactError = false,
  isLoading = false,
  ...imageProps
}) => {
  const [retryCount, setRetryCount] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [imageKey, setImageKey] = useState(0)
  const [isNonRetryableError, setIsNonRetryableError] = useState(false)
  const [errorStatusCode, setErrorStatusCode] = useState<number | undefined>()

  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setIsRetrying(true)
      const nextRetryCount = retryCount + 1

      onRetry?.(nextRetryCount)

      setTimeout(() => {
        setRetryCount(nextRetryCount)
        setHasError(false)
        setIsRetrying(false)
        setImageKey((prev) => prev + 1) // Force re-render of image
      }, retryDelay)
    }
  }, [retryCount, maxRetries, retryDelay, onRetry])

  const handleErrorWithStatusCode = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
      const img = event.currentTarget
      const src = img.src

      if (img.naturalWidth === 0 && img.naturalHeight === 0) {
        fetch(src, { method: "GET" })
          .then((response) => {
            const statusCode = response.status
            setErrorStatusCode(statusCode)

            // Check if this is a non-retryable error
            const isNonRetryable = nonRetryableStatusCodes.includes(statusCode)

            if (isNonRetryable) {
              setIsNonRetryableError(true)
              setHasError(true)
              onNonRetryableError?.(statusCode)
            } else if (retryCount < maxRetries) {
              handleRetry()
            } else {
              setHasError(true)
              onRetryExhausted?.()
            }
          })
          .catch(() => {
            const statusCode = 404
            setErrorStatusCode(statusCode)

            // Check if this is a non-retryable error
            const isNonRetryable = nonRetryableStatusCodes.includes(statusCode)

            if (isNonRetryable) {
              setIsNonRetryableError(true)
              setHasError(true)
              onNonRetryableError?.(statusCode)
            } else if (retryCount < maxRetries) {
              handleRetry()
            } else {
              setHasError(true)
              onRetryExhausted?.()
            }
          })
      }
    },
    [
      retryCount,
      maxRetries,
      handleRetry,
      nonRetryableStatusCodes,
      onNonRetryableError,
      onRetryExhausted,
    ],
  )

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      onError?.(event)
      handleErrorWithStatusCode(event)
    },
    [onError, handleErrorWithStatusCode],
  )

  const handleLoad = useCallback(() => {
    // Reset all error states on successful load
    setRetryCount(0)
    setHasError(false)
    setIsRetrying(false)
    setIsNonRetryableError(false)
    setErrorStatusCode(undefined)
  }, [])

  if (hasError && !isRetrying) {
    if (fallbackContent) {
      return <>{fallbackContent}</>
    }

    return (
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
        {...(imageProps.boxSize && { boxSize: imageProps.boxSize })}
        {...(imageProps.w && { w: imageProps.w })}
        {...(imageProps.h && { h: imageProps.h })}
      >
        <VStack spacing={compactError ? 1 : 3}>
          {!compactError && (
            <Text fontSize="md" color="gray.500" textAlign="center">
              {isNonRetryableError
                ? `Failed to load image (Error ${errorStatusCode || "Unknown"})`
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
                setRetryCount(0)
                setHasError(false)
                setIsNonRetryableError(false)
                setErrorStatusCode(undefined)
                setImageKey((prev) => prev + 1)
              }}
            >
              Try Again
            </Button>
          )}
        </VStack>
      </Flex>
    )
  }

  return (
    <Box position="relative" display="inline-block">
      <Image
        key={imageKey}
        {...imageProps}
        onError={handleError}
        onLoad={handleLoad}
        opacity={isRetrying ? 0.5 : 1}
        transition="opacity 0.2s"
      />
      {isLoading && (
        <Center
          position="absolute"
          inset={0}
          top="0"
          left="0"
          right="0"
          bottom="0"
        >
          <Spinner />
        </Center>
      )}
    </Box>
  )
}

export default RetryableImage
