import { Box, Button, Icon, Text } from "@chakra-ui/react"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiCheck } from "@react-icons/all-files/pi/PiCheck"
import { PiStack } from "@react-icons/all-files/pi/PiStack"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { TemplatePreset } from "../../storage/types"
import { chakraAny } from "../../utils"

const BoxAny = chakraAny(Box)
const TextAny = chakraAny(Text)
const ButtonAny = chakraAny(Button)

export interface ActivePresetDropdownProps {
  disabled?: boolean
  presets: TemplatePreset[]
  activePresetId: string | null
  activePresetName: string
  onSelectPresetId(next: string | null): void
  onManagePresets(): void
}

export function ActivePresetDropdown({
  disabled,
  presets,
  activePresetId,
  activePresetName,
  onSelectPresetId,
  onManagePresets,
}: ActivePresetDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const activeIsNamed = useMemo(() => activePresetId != null, [activePresetId])

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
    <BoxAny ref={rootRef} position="relative" mx="2">
      <BoxAny
        as="button"
        type="button"
        display="inline-flex"
        alignItems="center"
        gap="2"
        borderRadius="full"
        px="4"
        py="2"
        fontSize="sm"
        fontWeight="medium"
        bg={activeIsNamed ? "blue.50" : "editorGray.100"}
        color={activeIsNamed ? "editorBlue.700" : "editorBattleshipGrey.700"}
        borderWidth="1px"
        borderColor={activeIsNamed ? "blue.200" : "editorBattleshipGrey.200"}
        cursor={disabled ? "not-allowed" : "pointer"}
        userSelect="none"
        opacity={disabled ? 0.5 : undefined}
        pointerEvents={disabled ? "none" : "auto"}
        aria-label="Select active preset"
        outline="none"
        onMouseDown={(e: React.MouseEvent) => {
          // Matches TemplatesDropdown behavior: avoid persistent focus ring on click.
          e.preventDefault()
        }}
        onClick={() => setOpen((v) => !v)}
        sx={{
          "&:focus": { outline: "none", boxShadow: "none" },
          "&:focus-visible": { outline: "none", boxShadow: "none" },
          "&:active": { outline: "none", boxShadow: "none" },
        }}
        _hover={disabled ? undefined : { opacity: 0.9 }}
      >
        <BoxAny
          width="6px"
          height="6px"
          borderRadius="full"
          bg={activeIsNamed ? "editorBlue.500" : "editorBattleshipGrey.300"}
          flexShrink={0}
        />
        <TextAny lineHeight="1">{activePresetName}</TextAny>
        <Icon as={PiCaretDown} boxSize={4} opacity={0.7} />
      </BoxAny>

      {open ? (
        <BoxAny
          position="absolute"
          top="calc(100% + 6px)"
          left="0"
          width="260px"
          bg="white"
          borderWidth="1px"
          borderColor="editorGray.300"
          borderRadius="xl"
          boxShadow="lg"
          overflow="hidden"
          zIndex={300}
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
            Preview preset
          </BoxAny>

          <BoxAny maxH="260px" overflowY="auto">
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
              bg={activePresetId == null ? "editorGray.100" : "white"}
              _hover={{ bg: "editorGray.50" }}
              onClick={() => {
                onSelectPresetId(null)
                setOpen(false)
              }}
            >
              <BoxAny
                width="18px"
                display="flex"
                justifyContent="center"
                opacity={activePresetId == null ? 1 : 0}
              >
                <Icon as={PiCheck} boxSize={4} color="editorGray.700" />
              </BoxAny>
              <TextAny fontSize="sm" color="editorGray.800" flex="1">
                No preset
              </TextAny>
            </BoxAny>

            {presets.map((p) => (
              <BoxAny
                key={p.id}
                as="button"
                type="button"
                width="full"
                textAlign="left"
                px="4"
                py="3"
                display="flex"
                alignItems="center"
                gap="3"
                bg={p.id === activePresetId ? "blue.50" : "white"}
                _hover={{ bg: "editorGray.50" }}
                onClick={() => {
                  onSelectPresetId(p.id)
                  setOpen(false)
                }}
              >
                <BoxAny
                  width="18px"
                  display="flex"
                  justifyContent="center"
                  opacity={p.id === activePresetId ? 1 : 0}
                >
                  <Icon as={PiCheck} boxSize={4} color="editorBlue.600" />
                </BoxAny>
                <TextAny
                  fontSize="sm"
                  color={
                    p.id === activePresetId
                      ? "editorBlue.700"
                      : "editorGray.800"
                  }
                  flex="1"
                  isTruncated
                >
                  {p.name}
                </TextAny>
              </BoxAny>
            ))}
          </BoxAny>

          <BoxAny
            px="4"
            py="3"
            borderTopWidth="1px"
            borderColor="editorGray.300"
            bg="white"
          >
            <ButtonAny
              size="sm"
              variant="ghost"
              leftIcon={<Icon as={PiStack} boxSize={4} />}
              color="editorGray.700"
              fontWeight="normal"
              onClick={() => {
                setOpen(false)
                onManagePresets()
              }}
            >
              Manage presets
            </ButtonAny>
          </BoxAny>
        </BoxAny>
      ) : null}
    </BoxAny>
  )
}
