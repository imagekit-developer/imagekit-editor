import type { ZodTypeAny } from "zod/v3"
import { transformationSchema, type TransformationItem } from "../schema"
import type { TemplateRecord } from "../storage"

export type TemplateSignature = {
  templateId: string
  templateName: string
  transformations: TemplateTransformationSignature[]
}

export type TemplateTransformationSignature = {
  index: number
  key: string
  name: string
  version?: string
  value: SignatureNode
}

export type SignatureNode =
  | { kind: "string"; optional?: boolean }
  | { kind: "number"; optional?: boolean }
  | { kind: "boolean"; optional?: boolean }
  | { kind: "null"; optional?: boolean }
  | { kind: "unknown"; optional?: boolean }
  | { kind: "literal"; value: string | number | boolean | null; optional?: boolean }
  | { kind: "enum"; values: string[]; optional?: boolean }
  | { kind: "array"; element: SignatureNode; optional?: boolean }
  | { kind: "object"; fields: Record<string, SignatureNode>; optional?: boolean }
  | { kind: "union"; options: SignatureNode[]; optional?: boolean }

function unwrap(schema: ZodTypeAny): { schema: ZodTypeAny; optional: boolean } {
  let current: any = schema
  let optional = false

  // unwrap optionals / defaults / effects / catches until stable
  // (zod/v3 uses `_def.typeName` as a discriminant)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const def = current?._def
    const typeName: string | undefined = def?.typeName

    if (typeName === "ZodOptional") {
      optional = true
      current = def.innerType
      continue
    }

    if (typeName === "ZodDefault") {
      current = def.innerType
      continue
    }

    if (typeName === "ZodCatch") {
      current = def.innerType
      continue
    }

    if (typeName === "ZodEffects") {
      current = def.schema
      continue
    }

    break
  }

  return { schema: current as ZodTypeAny, optional }
}

function zodToSignature(schema: ZodTypeAny): SignatureNode {
  const { schema: unwrapped, optional } = unwrap(schema)
  const def: any = (unwrapped as any)?._def
  const typeName: string | undefined = def?.typeName

  const withOptional = (node: SignatureNode): SignatureNode =>
    optional ? ({ ...node, optional: true } as SignatureNode) : node

  switch (typeName) {
    case "ZodString":
      return withOptional({ kind: "string" })
    case "ZodNumber":
      return withOptional({ kind: "number" })
    case "ZodBoolean":
      return withOptional({ kind: "boolean" })
    case "ZodNull":
      return withOptional({ kind: "null" })
    case "ZodLiteral":
      return withOptional({ kind: "literal", value: def.value })
    case "ZodEnum":
      return withOptional({ kind: "enum", values: def.values ?? [] })
    case "ZodNativeEnum":
      return withOptional({
        kind: "enum",
        values: Object.values(def.values ?? {}).filter(
          (v: unknown) => typeof v === "string",
        ) as string[],
      })
    case "ZodArray":
      return withOptional({ kind: "array", element: zodToSignature(def.type) })
    case "ZodUnion":
      return withOptional({
        kind: "union",
        options: (def.options ?? []).map((s: ZodTypeAny) => zodToSignature(s)),
      })
    case "ZodObject": {
      // In zod/v3, shape can be a function or a plain object depending on build.
      const shape =
        typeof def.shape === "function" ? def.shape() : (def.shape ?? {})
      const fields: Record<string, SignatureNode> = {}
      for (const [key, fieldSchema] of Object.entries(shape)) {
        fields[key] = zodToSignature(fieldSchema as ZodTypeAny)
      }
      return withOptional({ kind: "object", fields })
    }
    default:
      return withOptional({ kind: "unknown" })
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) {
    return value
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false
    }
    if (left.length !== right.length) {
      return false
    }
    return left.every((value, index) => deepEqual(value, right[index]))
  }

  if (isPlainObject(left) || isPlainObject(right)) {
    if (!isPlainObject(left) || !isPlainObject(right)) {
      return false
    }
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)
    if (leftKeys.length !== rightKeys.length) {
      return false
    }
    return leftKeys.every((key) => deepEqual(left[key], right[key]))
  }

  return false
}

// Reads a nested default field from an object-shaped default tree.
// Non-object defaults do not have child defaults, so they resolve undefined.
function getChildDefault(defaultValue: unknown, key: string): unknown {
  if (!isPlainObject(defaultValue)) {
    return undefined
  }
  return defaultValue[key]
}

// Identifies scalar schema nodes that can select a branch for a sibling value.
// These are candidates for internal UI controls, not CSV-exposed variables.
function canActAsDiscriminator(node: SignatureNode): boolean {
  return (
    node.kind === "enum" ||
    node.kind === "literal" ||
    node.kind === "string" ||
    node.kind === "union"
  )
}

// Detects a union whose saved value shape can be either composite or scalar.
// Radius and padding use this pattern for individual-vs-uniform editing.
function isBranchingUnion(node: SignatureNode): boolean {
  return (
    node.kind === "union" &&
    node.options.some(isComplexUnionOption) &&
    node.options.some((option) => !isComplexUnionOption(option))
  )
}

// Drops an internal branch selector when a sibling already carries the value.
// This keeps automation forms on the template's selected branch shape.
function isCompositeDiscriminatorField(
  child: SignatureNode,
  siblingFields: Record<string, SignatureNode>,
): boolean {
  if (!canActAsDiscriminator(child)) {
    return false
  }
  return Object.values(siblingFields).some(
    (sibling) => sibling !== child && isBranchingUnion(sibling),
  )
}

// Mirrors form initialization defaults from transformation field metadata.
// Composite inputs get their runtime mode/value shape normalized explicitly.
function normalizeFieldDefault(field: {
  fieldType?: string
  name: string
  fieldProps?: { defaultValue?: unknown }
}): unknown {
  if (field.fieldType === "radius-input") {
    const defaultValue = field.fieldProps?.defaultValue
    const radius = isPlainObject(defaultValue)
      ? defaultValue.radius
      : undefined
    const mode = isPlainObject(defaultValue) ? defaultValue.mode : undefined

    return {
      mode: typeof mode === "string" ? mode : "uniform",
      radius: radius ?? "",
    }
  }

  if (field.fieldType === "padding-input") {
    const defaultValue = field.fieldProps?.defaultValue
    const padding = isPlainObject(defaultValue)
      ? defaultValue.padding
      : undefined
    const mode = isPlainObject(defaultValue) ? defaultValue.mode : undefined

    return {
      mode: typeof mode === "string" ? mode : "uniform",
      padding: padding ?? "",
    }
  }

  return field.fieldProps?.defaultValue ?? ""
}

// Builds the default tree used to decide which saved values are user-set.
// Field defaults win over the raw defaultTransformation for editor UI fields.
function getDefaultValueTree(
  item: TransformationItem | null,
): Record<string, unknown> {
  if (!item) {
    return {}
  }

  const defaults = isPlainObject(item.defaultTransformation)
    ? cloneValue(item.defaultTransformation)
    : {}

  item.transformations.forEach((field) => {
    defaults[field.name] = normalizeFieldDefault(field)
  })

  return defaults
}

function withUnionOptions(
  node: Extract<SignatureNode, { kind: "union" }>,
  options: SignatureNode[],
): SignatureNode | null {
  if (!options.length) {
    return null
  }
  return {
    ...node,
    options,
  }
}

function isComplexUnionOption(node: SignatureNode): boolean {
  return node.kind === "object" || node.kind === "array"
}

function pruneSignatureNode(
  node: SignatureNode,
  value: unknown,
  defaultValue: unknown,
): SignatureNode | null {
  if (value === null || value === undefined) {
    return null
  }

  if (node.kind === "object") {
    if (!isPlainObject(value)) {
      return deepEqual(value, defaultValue) ? null : node
    }

    const fields: Record<string, SignatureNode> = {}
    for (const [key, child] of Object.entries(node.fields)) {
      if (isCompositeDiscriminatorField(child, node.fields)) {
        continue
      }

      const prunedChild = pruneSignatureNode(
        child,
        value[key],
        getChildDefault(defaultValue, key),
      )
      if (prunedChild) {
        fields[key] = prunedChild
      }
    }

    for (const [key, childValue] of Object.entries(value)) {
      if (key in node.fields) {
        continue
      }
      if (
        childValue !== null &&
        childValue !== undefined &&
        !deepEqual(childValue, getChildDefault(defaultValue, key))
      ) {
        fields[key] = { kind: "unknown" }
      }
    }

    if (!Object.keys(fields).length) {
      return null
    }

    return {
      ...node,
      fields,
    }
  }

  if (node.kind === "union") {
    const hasComplexOptions = node.options.some(isComplexUnionOption)
    if (!hasComplexOptions) {
      return deepEqual(value, defaultValue) ? null : node
    }

    if (isPlainObject(value)) {
      const objectOption = node.options.find(
        (option) => option.kind === "object",
      )
      return objectOption
        ? pruneSignatureNode(objectOption, value, defaultValue)
        : null
    }

    if (Array.isArray(value)) {
      const arrayOption = node.options.find((option) => option.kind === "array")
      return arrayOption
        ? pruneSignatureNode(arrayOption, value, defaultValue)
        : null
    }

    if (deepEqual(value, defaultValue)) {
      return null
    }

    return withUnionOptions(
      node,
      node.options.filter((option) => !isComplexUnionOption(option)),
    )
  }

  return deepEqual(value, defaultValue) ? null : node
}

function findTransformationItemForKey(key: string): TransformationItem | null {
  for (const category of transformationSchema) {
    for (const item of category.items) {
      if (item.key === key) {
        return item
      }
    }
  }
  return null
}

/**
 * Returns a JSON-friendly signature (keys + expected types) for each transformation's `value`,
 * based on the editor's internal Zod schema registry.
 */
export function getTemplateSignature(record: TemplateRecord): TemplateSignature {
  const transformations = record.transformations.flatMap((t, index) => {
    const item = findTransformationItemForKey(t.key)
    const schema = item?.schema ?? null
    const fullSignature = schema
      ? zodToSignature(schema)
      : ({ kind: "unknown" } as const)
    const defaultValue = getDefaultValueTree(item)
    const prunedSignature = pruneSignatureNode(
      fullSignature,
      t.value,
      defaultValue,
    )

    if (!prunedSignature) {
      return []
    }

    return [
      {
        index,
        key: t.key,
        name: t.name,
        version: t.version,
        value: prunedSignature,
      },
    ]
  })

  return {
    templateId: record.id,
    templateName: record.name,
    transformations,
  }
}
