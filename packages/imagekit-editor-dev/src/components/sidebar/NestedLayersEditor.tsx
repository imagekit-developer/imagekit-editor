import {
  Box,
  Button,
  ButtonGroup,
  Select as ChakraSelect,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import * as React from "react"
import type {
  NestedLayer,
  NestedLayerPosition,
} from "../../layers/nestedLayers"
import AnchorField from "../common/AnchorField"

const emptyPosition = (): NestedLayerPosition => ({ mode: "none" })

function ensurePosition(layer: NestedLayer): NestedLayer {
  if (layer.position) return layer
  return { ...layer, position: emptyPosition() } as NestedLayer
}

function updateAt<T>(arr: T[], idx: number, next: T): T[] {
  return arr.map((v, i) => (i === idx ? next : v))
}

function removeAt<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx)
}

function addDefault(type: NestedLayer["type"]): NestedLayer {
  if (type === "text") {
    return {
      type: "text",
      text: "Hello",
      fontSize: 36,
      position: { mode: "lfo", lfo: "center" },
    }
  }
  if (type === "image") {
    return {
      type: "image",
      imageUrl: "example.jpg",
      width: 150,
      height: 100,
      position: { mode: "lfo", lfo: "center" },
    }
  }
  return {
    type: "canvas",
    width: 200,
    height: 100,
    backgroundColor: "#FF0000",
    radius: 20,
    position: { mode: "none" },
    children: [],
  }
}

function PositionEditor(props: {
  value?: NestedLayerPosition
  onChange: (next: NestedLayerPosition) => void
}) {
  const value = props.value ?? emptyPosition()
  return (
    <VStack align="stretch" spacing={2}>
      <FormControl>
        <FormLabel fontSize="sm">Position mode</FormLabel>
        <ChakraSelect
          size="sm"
          value={value.mode}
          onChange={(e) => {
            const mode = e.target.value as NestedLayerPosition["mode"]
            if (mode === "none") return props.onChange({ mode: "none" })
            if (mode === "lfo")
              return props.onChange({ mode: "lfo", lfo: "center" })
            if (mode === "topLeft")
              return props.onChange({
                mode: "topLeft",
                lx: "",
                ly: "",
                lap: "",
              })
            return props.onChange({ mode: "center", lxc: "", lyc: "", lap: "" })
          }}
        >
          <option value="none">None</option>
          <option value="lfo">Relative focus (lfo)</option>
          <option value="topLeft">Absolute top-left (lx/ly)</option>
          <option value="center">Absolute center (lxc/lyc)</option>
        </ChakraSelect>
      </FormControl>

      {value.mode === "lfo" && (
        <FormControl>
          <FormLabel fontSize="sm">Relative focus (lfo)</FormLabel>
          <AnchorField
            value={value.lfo ?? "center"}
            onChange={(next) =>
              props.onChange({
                mode: "lfo",
                lfo: next || "center",
              })
            }
            positions={[
              "center",
              "top",
              "bottom",
              "left",
              "right",
              "top_left",
              "top_right",
              "bottom_left",
              "bottom_right",
            ]}
          />
        </FormControl>
      )}

      {value.mode === "topLeft" && (
        <HStack spacing={2}>
          <FormControl>
            <FormLabel fontSize="sm">lx</FormLabel>
            <Input
              size="sm"
              value={value.lx ?? ""}
              onChange={(e) => props.onChange({ ...value, lx: e.target.value })}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">ly</FormLabel>
            <Input
              size="sm"
              value={value.ly ?? ""}
              onChange={(e) => props.onChange({ ...value, ly: e.target.value })}
            />
          </FormControl>
        </HStack>
      )}

      {value.mode === "center" && (
        <HStack spacing={2}>
          <FormControl>
            <FormLabel fontSize="sm">lxc</FormLabel>
            <Input
              size="sm"
              value={value.lxc ?? ""}
              onChange={(e) =>
                props.onChange({ ...value, lxc: e.target.value })
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">lyc</FormLabel>
            <Input
              size="sm"
              value={value.lyc ?? ""}
              onChange={(e) =>
                props.onChange({ ...value, lyc: e.target.value })
              }
            />
          </FormControl>
        </HStack>
      )}
    </VStack>
  )
}

function LayerCard(props: {
  layer: NestedLayer
  depth: number
  onChange: (next: NestedLayer) => void
  onRemove: () => void
}) {
  const layer = ensurePosition(props.layer)
  const title =
    layer.type === "canvas"
      ? "Canvas"
      : layer.type === "text"
        ? "Text"
        : "Image"
  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={3}
      bg="white"
      ml={props.depth * 4}
    >
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" fontWeight="semibold">
          {title} layer
        </Text>
        <Button
          size="xs"
          variant="ghost"
          colorScheme="red"
          onClick={props.onRemove}
        >
          Remove
        </Button>
      </HStack>

      {layer.type === "text" && (
        <VStack align="stretch" spacing={2}>
          <FormControl>
            <FormLabel fontSize="sm">Text</FormLabel>
            <Input
              size="sm"
              value={layer.text}
              onChange={(e) =>
                props.onChange({ ...layer, text: e.target.value })
              }
            />
          </FormControl>
          <HStack spacing={2}>
            <FormControl>
              <FormLabel fontSize="sm">Font size</FormLabel>
              <Input
                size="sm"
                value={layer.fontSize ?? ""}
                onChange={(e) =>
                  props.onChange({ ...layer, fontSize: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Color</FormLabel>
              <Input
                size="sm"
                value={layer.color ?? ""}
                onChange={(e) =>
                  props.onChange({ ...layer, color: e.target.value })
                }
                placeholder="#000000"
              />
            </FormControl>
          </HStack>
        </VStack>
      )}

      {layer.type === "image" && (
        <VStack align="stretch" spacing={2}>
          <FormControl>
            <FormLabel fontSize="sm">Image URL / path</FormLabel>
            <Input
              size="sm"
              value={layer.imageUrl}
              onChange={(e) =>
                props.onChange({ ...layer, imageUrl: e.target.value })
              }
            />
          </FormControl>
          <HStack spacing={2}>
            <FormControl>
              <FormLabel fontSize="sm">Width</FormLabel>
              <Input
                size="sm"
                value={layer.width ?? ""}
                onChange={(e) =>
                  props.onChange({ ...layer, width: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Height</FormLabel>
              <Input
                size="sm"
                value={layer.height ?? ""}
                onChange={(e) =>
                  props.onChange({ ...layer, height: e.target.value })
                }
              />
            </FormControl>
          </HStack>
        </VStack>
      )}

      {layer.type === "canvas" && (
        <VStack align="stretch" spacing={2}>
          <HStack spacing={2}>
            <FormControl>
              <FormLabel fontSize="sm">Width</FormLabel>
              <Input
                size="sm"
                value={layer.width ?? ""}
                onChange={(e) =>
                  props.onChange({ ...layer, width: e.target.value })
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Height</FormLabel>
              <Input
                size="sm"
                value={layer.height ?? ""}
                onChange={(e) =>
                  props.onChange({ ...layer, height: e.target.value })
                }
              />
            </FormControl>
          </HStack>
          <FormControl>
            <FormLabel fontSize="sm">Background</FormLabel>
            <Input
              size="sm"
              value={layer.backgroundColor ?? ""}
              onChange={(e) =>
                props.onChange({ ...layer, backgroundColor: e.target.value })
              }
              placeholder="#FF0000"
            />
          </FormControl>
        </VStack>
      )}

      <Divider my={3} />
      <PositionEditor
        value={layer.position}
        onChange={(pos) =>
          props.onChange({ ...layer, position: pos } as NestedLayer)
        }
      />

      {layer.type === "canvas" && (
        <>
          <Divider my={3} />
          <NestedLayersEditor
            title="Children"
            value={layer.children ?? []}
            onChange={(nextChildren) =>
              props.onChange({ ...layer, children: nextChildren })
            }
            depth={props.depth + 1}
          />
        </>
      )}
    </Box>
  )
}

export function NestedLayersEditor(props: {
  title?: string
  value: NestedLayer[]
  onChange: (next: NestedLayer[]) => void
  depth?: number
}) {
  const depth = props.depth ?? 0
  const value = Array.isArray(props.value) ? props.value : []
  const canAddMore = depth < 2

  return (
    <VStack align="stretch" spacing={3}>
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="semibold">
          {props.title ?? "Nested layers"}
        </Text>
        <ButtonGroup size="xs" isAttached variant="outline">
          <Button
            onClick={() => props.onChange([...value, addDefault("text")])}
            isDisabled={!canAddMore}
          >
            + Text
          </Button>
          <Button
            onClick={() => props.onChange([...value, addDefault("image")])}
            isDisabled={!canAddMore}
          >
            + Image
          </Button>
          <Button
            onClick={() => props.onChange([...value, addDefault("canvas")])}
            isDisabled={!canAddMore}
          >
            + Canvas
          </Button>
        </ButtonGroup>
      </HStack>

      {!canAddMore && (
        <Text fontSize="sm" color="gray.500">
          Nesting is limited to 3 levels (ImageKit limit).
        </Text>
      )}

      {value.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No nested layers.
        </Text>
      ) : (
        <VStack align="stretch" spacing={3}>
          {value.map((layer, idx) => (
            <LayerCard
              // eslint-disable-next-line react/no-array-index-key
              key={`${layer.type}-${idx}`}
              layer={layer}
              depth={depth}
              onChange={(next) => props.onChange(updateAt(value, idx, next))}
              onRemove={() => props.onChange(removeAt(value, idx))}
            />
          ))}
        </VStack>
      )}
    </VStack>
  )
}
