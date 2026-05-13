import type { Transformation } from "../store"
import type { DynamicVariableDefinition } from "../variables/types"

export interface TemplateCreator {
  userId: string
  name: string
  email: string
}

export interface TemplateRecord {
  id: string
  clientNumber: string
  isPrivate: boolean
  name: string
  transformations: Omit<Transformation, "id">[]
  variables?: DynamicVariableDefinition[]
  /**
   * URL transformation string with `{{variableName}}` placeholders preserved.
   * Consumers can do simple string replacement to generate final URLs.
   * Example: `w-{{width}},h-300,f-auto`
   */
  urlTemplate?: string
  /** Whether the active user has this template pinned. */
  isPinned: boolean
  createdBy: TemplateCreator
  updatedBy: TemplateCreator
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export type SaveTemplateInput = {
  id?: string
  name: string
  transformations: Omit<Transformation, "id">[]
  variables?: DynamicVariableDefinition[]
  /**
   * URL transformation string with `{{variableName}}` placeholders preserved.
   * Computed by the editor from the current transformations and variables.
   */
  urlTemplate?: string
  clientNumber?: string
  isPrivate?: boolean
  isPinned?: boolean
  createdBy?: TemplateCreator
  updatedBy?: TemplateCreator
  createdAt?: number
  /**
   * Optional override for updatedAt. When provided, the local storage provider
   * will respect this value instead of always touching updatedAt.
   */
  updatedAt?: number
}

export interface TemplateStorageProvider {
  listTemplates(): Promise<TemplateRecord[]>
  getTemplate(id: string): Promise<TemplateRecord | null>
  saveTemplate(record: SaveTemplateInput): Promise<TemplateRecord>
  deleteTemplate?(id: string): Promise<void>
  setTemplatePinned(id: string, isPinned: boolean): Promise<TemplateRecord>
  getProviderName(): string
  getCurrentUserSession(): unknown
}

/**
 * Minimal HTTP surface for host-implemented template storage (e.g. dashboard `use-http` request).
 */
export interface TemplateStorageHttpClient {
  get(path: string): Promise<unknown>
  post(path: string, body?: unknown): Promise<unknown>
  patch(path: string, body?: unknown): Promise<unknown>
  put(path: string, body?: unknown): Promise<unknown>
  delete(path: string): Promise<unknown>
}
