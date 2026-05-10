import type { ZodTypeAny } from "zod/v3"
import {
  type TransformationField,
  type TransformationItem,
  transformationSchema,
} from "../schema"
import type { TemplateRecord } from "../storage"

export type TemplateSignature = {
  version: 2
  templateId: string
  templateName: string
  variables: TemplateVariableSignature[]
  /** @deprecated v2 signatures expose `variables`; kept empty for older consumers. */
  transformations: TemplateTransformationSignature[]
}

export type TemplateVariableValidation = {
  required?: boolean
  min?: number
  max?: number
  step?: number
  color?: boolean
  allowedValues?: Array<string | number | boolean | null>
  options?: Array<{ label: string; value: string }>
}

export type TemplateVariableSignature = {
  id: string
  label: string
  fieldPath: string
  valuePath: string
  transformationKey: string
  transformationIndex: number
  transformationName: string
  fieldType?: string
  valueType: "string" | "number" | "boolean" | "array" | "object" | "null"
  defaultValue: unknown
  validation: TemplateVariableValidation
  signatureNode?: SignatureNode
  specialSource?: "imageLayer"
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
  | {
      kind: "literal"
      value: string | number | boolean | null
      optional?: boolean
    }
  | { kind: "enum"; values: string[]; optional?: boolean }
  | { kind: "array"; element: SignatureNode; optional?: boolean }
  | {
      kind: "object"
      fields: Record<string, SignatureNode>
      optional?: boolean
    }
  | { kind: "union"; options: SignatureNode[]; optional?: boolean }

type ZodDefinition = {
  typeName?: string
  innerType?: ZodTypeAny
  schema?: ZodTypeAny
  value?: string | number | boolean | null
  values?: Record<string, unknown> | string[]
  type?: ZodTypeAny
  options?: ZodTypeAny[]
  shape?: Record<string, ZodTypeAny> | (() => Record<string, ZodTypeAny>)
}

function getZodDefinition(schema: ZodTypeAny): ZodDefinition {
  return (schema as ZodTypeAny & { _def?: ZodDefinition })._def ?? {}
}

function unwrap(schema: ZodTypeAny): { schema: ZodTypeAny; optional: boolean } {
  let current = schema
  let optional = false

  // unwrap optionals / defaults / effects / catches until stable
  // (zod/v3 uses `_def.typeName` as a discriminant)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const def = getZodDefinition(current)
    const typeName: string | undefined = def?.typeName

    if (typeName === "ZodOptional" && def.innerType) {
      optional = true
      current = def.innerType
      continue
    }

    if (typeName === "ZodDefault" && def.innerType) {
      current = def.innerType
      continue
    }

    if (typeName === "ZodCatch" && def.innerType) {
      current = def.innerType
      continue
    }

    if (typeName === "ZodEffects" && def.schema) {
      current = def.schema
      continue
    }

    break
  }

  return { schema: current as ZodTypeAny, optional }
}

function zodToSignature(schema: ZodTypeAny): SignatureNode {
  const { schema: unwrapped, optional } = unwrap(schema)
  const def = getZodDefinition(unwrapped)
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
      return withOptional({ kind: "literal", value: def.value ?? null })
    case "ZodEnum":
      return withOptional({
        kind: "enum",
        values: Array.isArray(def.values) ? def.values : [],
      })
    case "ZodNativeEnum":
      return withOptional({
        kind: "enum",
        values: Object.values(def.values ?? {}).filter(
          (v: unknown) => typeof v === "string",
        ) as string[],
      })
    case "ZodArray":
      return withOptional({
        kind: "array",
        element: def.type ? zodToSignature(def.type) : { kind: "unknown" },
      })
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

function isContainer(
  value: unknown,
): value is Record<string, unknown> | unknown[] {
  return Boolean(value) && typeof value === "object"
}

function isArrayIndex(segment: string): boolean {
  return /^\d+$/.test(segment)
}

function getValueAtPath(source: unknown, path: string): unknown {
  if (!path) {
    return source
  }
  if (!isContainer(source)) {
    return undefined
  }

  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (Array.isArray(current)) {
        return isArrayIndex(segment) ? current[Number(segment)] : undefined
      }
      if (!isPlainObject(current)) {
        return undefined
      }
      return current[segment]
    }, source)
}

function cloneValue<T>(value: T): T {
  if (value === undefined || value === null) {
    return value
  }
  return JSON.parse(JSON.stringify(value)) as T
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
    const radius = isPlainObject(defaultValue) ? defaultValue.radius : undefined
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

function getDuplicateTransformationKeys(
  transformations: TemplateRecord["transformations"],
): Set<string> {
  const counts = transformations.reduce<Record<string, number>>((acc, step) => {
    acc[step.key] = (acc[step.key] ?? 0) + 1
    return acc
  }, {})
  return new Set(
    Object.entries(counts)
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  )
}

function getVariableFieldPath(options: {
  stepKey: string
  stepIndex: number
  valuePath: string
  useIndexedPath: boolean
}): string {
  const prefix = options.useIndexedPath
    ? `transformations.${options.stepIndex}.${options.stepKey}`
    : options.stepKey
  return options.valuePath ? `${prefix}.${options.valuePath}` : prefix
}

function getSignatureNodeAtPath(
  node: SignatureNode | undefined,
  valuePath: string,
): SignatureNode | undefined {
  if (!node || !valuePath) {
    return node
  }

  return valuePath
    .split(".")
    .filter(Boolean)
    .reduce<SignatureNode | undefined>((current, segment) => {
      if (!current) {
        return undefined
      }
      if (current.kind === "object") {
        return current.fields[segment]
      }
      if (current.kind === "array") {
        return current.element
      }
      if (current.kind === "union") {
        const objectOption = current.options.find(
          (option) => option.kind === "object",
        )
        const arrayOption = current.options.find(
          (option) => option.kind === "array",
        )
        return getSignatureNodeAtPath(objectOption ?? arrayOption, segment)
      }
      return undefined
    }, node)
}

type VariableFieldContext = {
  field?: TransformationField
  fieldType?: string
  fieldProps?: Record<string, unknown>
  signatureNode?: SignatureNode
  fallbackDefault?: unknown
  owningTransformationKey?: string
}

function getNestedLayerAtPath(
  value: unknown,
  nestedLayersField: string,
  indexSegment: string,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value) || !isArrayIndex(indexSegment)) {
    return undefined
  }

  const nestedLayers = value[nestedLayersField]
  if (!Array.isArray(nestedLayers)) {
    return undefined
  }

  const layer = nestedLayers[Number(indexSegment)]
  return isPlainObject(layer) ? layer : undefined
}

function getLayerValue(layer: Record<string, unknown> | undefined): unknown {
  const layerValue = layer?.value
  return isPlainObject(layerValue) ? layerValue : {}
}

function resolveVariableFieldContext(
  item: TransformationItem | null,
  value: unknown,
  valuePath: string,
): VariableFieldContext {
  if (!item) {
    return {}
  }

  const segments = valuePath.split(".").filter(Boolean)
  const [fieldName, indexSegment, valueSegment] = segments

  if (
    fieldName === "nestedLayers" &&
    indexSegment &&
    valueSegment === "value"
  ) {
    const layer = getNestedLayerAtPath(value, fieldName, indexSegment)
    const layerKey = layer?.key
    const layerItem =
      typeof layerKey === "string"
        ? findTransformationItemForKey(layerKey)
        : null
    const childPath = segments.slice(3).join(".")

    return resolveVariableFieldContext(
      layerItem,
      getLayerValue(layer),
      childPath,
    )
  }

  const fullSignature = item.schema
    ? zodToSignature(item.schema)
    : ({ kind: "unknown" } as const)
  const field = item.transformations.find(
    (candidate) => candidate.name === fieldName,
  )

  return {
    field,
    fieldType: field?.fieldType,
    fieldProps: field?.fieldProps,
    signatureNode: getSignatureNodeAtPath(fullSignature, valuePath),
    fallbackDefault: getValueAtPath(getDefaultValueTree(item), valuePath),
    owningTransformationKey: item.key,
  }
}

function getSignatureAllowedValues(
  node: SignatureNode | undefined,
): Array<string | number | boolean | null> | undefined {
  if (!node) {
    return undefined
  }
  if (node.kind === "enum") {
    return node.values
  }
  if (node.kind === "literal") {
    return [node.value]
  }
  if (node.kind === "union") {
    const values = node.options.flatMap((option) => {
      const allowed = getSignatureAllowedValues(option)
      return allowed ?? []
    })
    return values.length ? Array.from(new Set(values)) : undefined
  }
  return undefined
}

function getValueType(
  node: SignatureNode | undefined,
  defaultValue: unknown,
): TemplateVariableSignature["valueType"] {
  if (node?.kind === "number") return "number"
  if (node?.kind === "boolean") return "boolean"
  if (node?.kind === "array") return "array"
  if (node?.kind === "object") return "object"
  if (node?.kind === "null") return "null"
  if (node?.kind === "literal") {
    if (node.value === null) return "null"
    if (Array.isArray(node.value)) return "array"
    return typeof node.value as TemplateVariableSignature["valueType"]
  }
  if (node?.kind === "union") {
    const nonLiteral = node.options.find(
      (option) => option.kind !== "literal" && option.kind !== "null",
    )
    return getValueType(nonLiteral ?? node.options[0], defaultValue)
  }
  if (defaultValue === null || defaultValue === undefined) return "null"
  if (Array.isArray(defaultValue)) return "array"
  if (typeof defaultValue === "number") return "number"
  if (typeof defaultValue === "boolean") return "boolean"
  if (typeof defaultValue === "object") return "object"
  return "string"
}

function getVariableValidation(options: {
  fieldType?: string
  fieldProps?: Record<string, unknown>
  signatureNode?: SignatureNode
  valuePath: string
}): TemplateVariableValidation {
  const { fieldType, fieldProps, signatureNode, valuePath } = options
  const allowedValues = getSignatureAllowedValues(signatureNode)
  const validation: TemplateVariableValidation = {
    required: signatureNode?.optional === true ? false : undefined,
    color:
      fieldType === "color-picker" ||
      valuePath.toLowerCase().includes("color") ||
      undefined,
    allowedValues,
  }

  if (typeof fieldProps?.min === "number") validation.min = fieldProps.min
  if (typeof fieldProps?.max === "number") validation.max = fieldProps.max
  if (typeof fieldProps?.step === "number") validation.step = fieldProps.step
  if (Array.isArray(fieldProps?.options)) {
    validation.options = fieldProps.options
      .filter(
        (option): option is { label: string; value: string } =>
          isPlainObject(option) &&
          typeof option.label === "string" &&
          typeof option.value === "string",
      )
      .map((option) => ({ label: option.label, value: option.value }))
  }

  return validation
}

function getSpecialSource(options: {
  transformationKey: string
  valuePath: string
}): TemplateVariableSignature["specialSource"] | undefined {
  return options.transformationKey === "layers-image" &&
    (options.valuePath === "imageUrl" ||
      options.valuePath.endsWith(".imageUrl"))
    ? "imageLayer"
    : undefined
}

/**
 * Returns the editor-authored automation variables for a template.
 */
export function getTemplateSignature(
  record: TemplateRecord,
): TemplateSignature {
  const duplicateKeys = getDuplicateTransformationKeys(record.transformations)
  const variables = record.transformations.flatMap((t, index) => {
    const item = findTransformationItemForKey(t.key)
    const automationVariables = Array.isArray(t.automationVariables)
      ? t.automationVariables
      : []

    return automationVariables
      .filter((variable) => variable.label.trim() && variable.valuePath.trim())
      .map((variable) => {
        const fieldContext = resolveVariableFieldContext(
          item,
          t.value,
          variable.valuePath,
        )
        const signatureNode = fieldContext.signatureNode
        const savedValue = getValueAtPath(t.value, variable.valuePath)
        const defaultForVariable =
          savedValue !== undefined ? savedValue : fieldContext.fallbackDefault

        return {
          id: variable.id,
          label: variable.label,
          fieldPath: getVariableFieldPath({
            stepKey: t.key,
            stepIndex: index,
            valuePath: variable.valuePath,
            useIndexedPath: duplicateKeys.has(t.key),
          }),
          valuePath: variable.valuePath,
          transformationKey: t.key,
          transformationIndex: index,
          transformationName: t.name,
          fieldType: variable.fieldType ?? fieldContext.fieldType,
          valueType: getValueType(signatureNode, defaultForVariable),
          defaultValue: defaultForVariable ?? null,
          validation: getVariableValidation({
            fieldType: variable.fieldType ?? fieldContext.fieldType,
            fieldProps: fieldContext.fieldProps,
            signatureNode,
            valuePath: variable.valuePath,
          }),
          signatureNode,
          specialSource: getSpecialSource({
            transformationKey: fieldContext.owningTransformationKey ?? t.key,
            valuePath: variable.valuePath,
          }),
        }
      })
  })

  return {
    version: 2,
    templateId: record.id,
    templateName: record.name,
    variables,
    transformations: [],
  }
}
