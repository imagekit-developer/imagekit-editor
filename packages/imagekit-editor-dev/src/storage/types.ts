import type { Transformation } from "../store"

export interface TemplateRecord {
  id: string
  name: string
  transformations: Omit<Transformation, "id">[]
  updatedAt: number
  lastUsedAt?: number
}

export interface TemplateStorageProvider {
  listTemplates(): Promise<TemplateRecord[]>
  getTemplate(id: string): Promise<TemplateRecord | null>
  saveTemplate(record: Omit<TemplateRecord, "id" | "updatedAt" | "lastUsedAt"> & { id?: string }): Promise<TemplateRecord>
  deleteTemplate?(id: string): Promise<void>
  getProviderName(): string
}

export interface LocalStorageProviderOptions {
  templatesKey?: string
}
