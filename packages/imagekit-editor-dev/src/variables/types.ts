export type DynamicVariableValueType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "imagePath"

export type DynamicVariableSortOption =
  | "ASC_NAME"
  | "DESC_NAME"
  | "ASC_CREATED"
  | "DESC_CREATED"
  | "ASC_UPDATED"
  | "DESC_UPDATED"
  | "ASC_HEIGHT"
  | "DESC_HEIGHT"
  | "ASC_WIDTH"
  | "DESC_WIDTH"
  | "ASC_SIZE"
  | "DESC_SIZE"
  | "ASC_RELEVANCE"
  | "DESC_RELEVANCE"

export interface DynamicVariableDateFilter {
  op: "gt" | "gte" | "lt" | "lte" | "eq"
  relative?: string
  value?: string
}

export interface DynamicVariableAssetSearchQuery {
  path?: string
  name?: string
  tags?: string[]
  fileType?: "all" | "image" | "non-image"
  type?: "file" | "file-version" | "folder" | "all"
  format?: string
  sort?: DynamicVariableSortOption
  skip?: number
  limit?: number
  createdAt?: DynamicVariableDateFilter
  updatedAt?: DynamicVariableDateFilter
  customMetadata?: Record<string, string>
  searchQuery?: string
}

export interface CustomMetadataFieldSchema {
  type:
    | "Text"
    | "Textarea"
    | "Number"
    | "Date"
    | "Boolean"
    | "SingleSelect"
    | "MultiSelect"
  minLength?: number
  maxLength?: number
  minValue?: number | string
  maxValue?: number | string
  defaultValue?: unknown
  isValueRequired?: boolean
  selectOptions?: Array<string | number | boolean>
}

export interface CustomMetadataFieldDefinition {
  id: string
  name: string
  label: string
  schema: CustomMetadataFieldSchema
}

interface DynamicVariableBase {
  id: string
  name: string
  displayLabel?: string
  description?: string
  valueType: DynamicVariableValueType
  sampleValue: string | number | boolean
  maxLength?: number
}

export interface LiteralDynamicVariableDefinition extends DynamicVariableBase {
  type: "literal"
}

export interface AssetSearchDynamicVariableDefinition
  extends DynamicVariableBase {
  type: "assetSearch"
  assetQuery: DynamicVariableAssetSearchQuery
}

export type DynamicVariableDefinition =
  | LiteralDynamicVariableDefinition
  | AssetSearchDynamicVariableDefinition

export interface VariableAssetResolverResult {
  value: string
  label?: string
  asset?: unknown
}

export type VariableAssetResolver = (request: {
  variable: DynamicVariableDefinition
  query: DynamicVariableAssetSearchQuery
  signal?: AbortSignal
}) => Promise<VariableAssetResolverResult>
