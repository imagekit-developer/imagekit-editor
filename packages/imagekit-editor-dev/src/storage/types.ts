import type { Transformation } from "../store"

export interface TemplateCreator {
  userId: string
  name: string
  email: string
}

export interface TemplateVariable {
  name: string
  label: string
  fieldKey: string
  transformationKey: string
  defaultValue?: unknown
}

export interface TemplateRecord {
  id: string
  clientNumber: string
  isPrivate: boolean
  name: string
  transformations: Omit<Transformation, "id">[]
  variables: TemplateVariable[]
  isAutomationTemplate?: boolean
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
  variables?: TemplateVariable[]
  clientNumber?: string
  isPrivate?: boolean
  isPinned?: boolean
  isAutomationTemplate?: boolean
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
