import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PiX } from "@react-icons/all-files/pi/PiX"
import { useCallback, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { canvasSchema } from "../../schema"
import { type CanvasState, useEditorStore } from "../../store"
import ColorPickerField from "../common/ColorPickerField"
import RadioCardField from "../common/RadioCardField"
import { SidebarBody } from "./sidebar-body"
import { SidebarFooter } from "./sidebar-footer"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"

type CanvasFormValues = {
  mode: "solid" | "image"
  width: number
  height: number
  color: string
  imageUrl: string
}

const CANVAS_MODE_OPTIONS = [
  { label: "Solid Color", value: "solid" },
  { label: "Image URL", value: "image" },
]

export const CanvasConfigSidebar = () => {
  const { canvas, updateCanvas, _setSidebarState } = useEditorStore()

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CanvasFormValues>({
    resolver: zodResolver(canvasSchema) as any,
    defaultValues: {
      mode: canvas?.mode ?? "solid",
      width: canvas?.width ?? 1080,
      height: canvas?.height ?? 1080,
      color: canvas?.color ?? "#00000000",
      imageUrl: canvas?.imageUrl ?? "",
    },
  })

  const values = watch()

  // Guard to skip the initial mount effect
  const isUpdatingRef = useRef(false)

  // Apply changes in real-time as user edits
  useEffect(() => {
    if (!canvas) return
    if (isUpdatingRef.current) return

    if (values.mode === "solid") {
      const hasChanges =
        values.mode !== canvas.mode ||
        values.width !== canvas.width ||
        values.height !== canvas.height ||
        values.color !== canvas.color
      if (hasChanges && values.width > 0 && values.height > 0) {
        updateCanvas({
          mode: "solid",
          width: values.width,
          height: values.height,
          color: values.color,
          imageUrl: undefined,
        })
      }
    } else if (values.mode === "image") {
      const hasChanges =
        values.mode !== canvas.mode || values.imageUrl !== (canvas.imageUrl ?? "")
      if (hasChanges && values.imageUrl) {
        try {
          new URL(values.imageUrl)
          updateCanvas({
            mode: "image",
            imageUrl: values.imageUrl,
          })
        } catch {
          // invalid URL — don't push to store yet
        }
      }
    }
  }, [values.mode, values.width, values.height, values.color, values.imageUrl])

  const setDirtyColor = useCallback(
    (_name: string, val: string) => {
      // Prevent the form→store→form loop by guarding store updates
      isUpdatingRef.current = true
      setValue("color", val, { shouldDirty: true })
      // Defer clearing the guard so the effect triggered by setValue is skipped
      queueMicrotask(() => {
        isUpdatingRef.current = false
        // Now apply the color change to the store
        if (canvas && val !== canvas.color) {
          updateCanvas({ color: val })
        }
      })
    },
    [canvas, setValue, updateCanvas],
  )

  const handleModeChange = useCallback(
    (newMode: string) => {
      setValue("mode", newMode as "solid" | "image", { shouldDirty: true })
    },
    [setValue],
  )

  return (
    <SidebarRoot>
      <SidebarHeader>
        <HStack w="full" justify="space-between" align="center">
          <Text fontSize="md" fontWeight="medium">
            Canvas
          </Text>
          <IconButton
            aria-label="Close canvas config"
            icon={<Icon as={PiX} boxSize={5} />}
            variant="ghost"
            size="sm"
            onClick={() => _setSidebarState("none")}
          />
        </HStack>
      </SidebarHeader>

      <SidebarBody as={VStack} gap={4} align="stretch" flex={1} p={4}>
        <FormControl>
          <FormLabel fontSize="sm">Canvas Source</FormLabel>
          <RadioCardField
            value={values.mode}
            options={CANVAS_MODE_OPTIONS}
            onChange={handleModeChange}
            columns={2}
          />
        </FormControl>

        {values.mode === "solid" && (
          <>
            <Box>
              <Text fontSize="xs" color="gray.500">
                Create a canvas with a fixed size and solid background color.
                All layers are placed on top of this background.
              </Text>
            </Box>

            <FormControl isInvalid={!!errors.width}>
              <FormLabel fontSize="sm">Width</FormLabel>
              <Input
                type="number"
                size="sm"
                {...register("width", { valueAsNumber: true })}
                min={1}
                max={10000}
              />
              {errors.width && (
                <FormErrorMessage>{errors.width.message}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.height}>
              <FormLabel fontSize="sm">Height</FormLabel>
              <Input
                type="number"
                size="sm"
                {...register("height", { valueAsNumber: true })}
                min={1}
                max={10000}
              />
              {errors.height && (
                <FormErrorMessage>{errors.height.message}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.color}>
              <FormLabel fontSize="sm">Background Color</FormLabel>
              <ColorPickerField
                fieldName="color"
                value={values.color}
                setValue={setDirtyColor}
              />
              {errors.color && (
                <FormErrorMessage>{errors.color.message}</FormErrorMessage>
              )}
            </FormControl>
          </>
        )}

        {values.mode === "image" && (
          <>
            <Box>
              <Text fontSize="xs" color="gray.500">
                Use an external image as the canvas base. The image dimensions
                will define the canvas size, and all layers are placed on top of
                it.
              </Text>
            </Box>

            <FormControl isInvalid={!!errors.imageUrl}>
              <FormLabel fontSize="sm">Image URL</FormLabel>
              <Input
                type="url"
                size="sm"
                placeholder="https://example.com/image.jpg"
                {...register("imageUrl")}
              />
              {errors.imageUrl && (
                <FormErrorMessage>{errors.imageUrl.message}</FormErrorMessage>
              )}
            </FormControl>
          </>
        )}

        <Box pt={2}>
          <Text fontSize="xs" color="gray.500">
            The canvas is the base layer of your template. All other
            transformations (text layers, image layers, etc.) are applied on top.
          </Text>
        </Box>
      </SidebarBody>

      <SidebarFooter>
        <Button
          variant="ghost"
          size="sm"
          fontWeight="normal"
          onClick={() => _setSidebarState("none")}
        >
          Close
        </Button>
      </SidebarFooter>
    </SidebarRoot>
  )
}
