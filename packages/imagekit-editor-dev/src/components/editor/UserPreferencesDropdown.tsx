import { Box, Icon, Text } from "@chakra-ui/react"
import { PiCheck } from "@react-icons/all-files/pi/PiCheck"
import { PiDotsThreeVertical } from "@react-icons/all-files/pi/PiDotsThreeVertical"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useEditorStore } from "../../store"
import { chakraAny } from "../../utils"

const BoxAny = chakraAny(Box)
const TextAny = chakraAny(Text)

export function UserPreferencesDropdown() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const { userPrefs, setUserPrefs } = useEditorStore()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      const root = rootRef.current
      if (!root) return
      if (e.target instanceof Node && !root.contains(e.target)) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("mousedown", onMouseDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("mousedown", onMouseDown)
    }
  }, [open])

  return (
    <BoxAny ref={rootRef} position="relative">
      <BoxAny
        as="button"
        type="button"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        width="32px"
        height="32px"
        borderRadius="md"
        cursor="pointer"
        userSelect="none"
        aria-label="Open preferences"
        bg="transparent"
        _hover={{ bg: "gray.100" }}
        onMouseDown={(e: React.MouseEvent) => {
          // Avoid persistent focus ring on click.
          e.preventDefault()
        }}
        onClick={() => setOpen((v) => !v)}
        sx={{
          "&:focus": { outline: "none", boxShadow: "none" },
          "&:focus-visible": { outline: "none", boxShadow: "none" },
          "&:active": { outline: "none", boxShadow: "none" },
        }}
      >
        <Icon as={PiDotsThreeVertical} boxSize={5} />
      </BoxAny>

      {open ? (
        <BoxAny
          position="absolute"
          top="calc(100% + 8px)"
          right="0"
          width="280px"
          bg="white"
          borderWidth="1px"
          borderColor="editorGray.300"
          borderRadius="xl"
          boxShadow="lg"
          overflow="hidden"
          zIndex={350}
        >
          <BoxAny
            px="4"
            py="2.5"
            fontSize="xs"
            fontWeight="semibold"
            color="editorGray.500"
            textTransform="uppercase"
            letterSpacing="0.04em"
            bg="editorGray.50"
            borderBottomWidth="1px"
            borderColor="editorGray.300"
          >
            Preferences
          </BoxAny>

          <BoxAny>
            <BoxAny
              as="button"
              type="button"
              width="full"
              textAlign="left"
              px="4"
              py="3"
              display="flex"
              alignItems="center"
              gap="3"
              bg="white"
              _hover={{ bg: "editorGray.50" }}
              onClick={() =>
                setUserPrefs({
                  showUrlPreviewStrip: !userPrefs.showUrlPreviewStrip,
                })
              }
            >
              <BoxAny
                width="18px"
                display="flex"
                justifyContent="center"
                opacity={userPrefs.showUrlPreviewStrip ? 1 : 0}
              >
                <Icon as={PiCheck} boxSize={4} color="editorBlue.600" />
              </BoxAny>
              <TextAny fontSize="sm" color="editorGray.800" flex="1">
                Show URL Preview Strip
              </TextAny>
            </BoxAny>

            <BoxAny
              as="button"
              type="button"
              width="full"
              textAlign="left"
              px="4"
              py="3"
              display="flex"
              alignItems="center"
              gap="3"
              bg="white"
              _hover={{ bg: "editorGray.50" }}
              onClick={() =>
                setUserPrefs({
                  showThumbnailStrip: !userPrefs.showThumbnailStrip,
                })
              }
            >
              <BoxAny
                width="18px"
                display="flex"
                justifyContent="center"
                opacity={userPrefs.showThumbnailStrip ? 1 : 0}
              >
                <Icon as={PiCheck} boxSize={4} color="editorBlue.600" />
              </BoxAny>
              <TextAny fontSize="sm" color="editorGray.800" flex="1">
                Show Thumbnail Strip
              </TextAny>
            </BoxAny>
          </BoxAny>
        </BoxAny>
      ) : null}
    </BoxAny>
  )
}
