import type { Transformation } from "../store"

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
  pinnedBy: string[]
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
  clientNumber?: string
  isPrivate?: boolean
  pinnedBy?: string[]
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
  getProviderName(): string
}

export interface LocalStorageProviderOptions {
  templatesKey?: string
}
