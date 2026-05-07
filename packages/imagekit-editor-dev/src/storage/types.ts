import type { Transformation } from "../store"

export type TemplateVariableId = string
export type TemplatePresetId = string

/**
 * A variable is a template-scoped placeholder that can be bound to a value
 * during preview (via a Preset) or during automation (via CSV / API input).
 *
 * Note: `id` is the stable identity. `name` may be user-editable and can be
 * used as a CSV header / placeholder label, but should not be relied upon as
 * the primary key in stored references.
 */
export interface TemplateVariable {
  /** Stable id; URLs / transformation strings reference `{{id}}` (see editor serialization). */
  id: TemplateVariableId
  /**
   * Human-friendly name (e.g. "headline_text"); editable without changing `{{id}}` in saved URLs.
   */
  name: string
  /** Used when no Preset provides an override (and for "Defaults only"). */
  defaultValue: string
  description?: string
  /**
   * Optional: reserved for future constraints (validation, UI hints, etc).
   * Keep as a free-form bag to avoid schema churn.
   */
  meta?: Record<string, unknown>
}

/**
 * Preset = a named set of overrides for template variables.
 * Values are sparse: missing/empty values should fall back to the variable default.
 */
export interface TemplatePreset {
  id: TemplatePresetId
  name: string
  /**
   * Sparse overrides keyed by TemplateVariable.id (preferred).
   * When resolving a value, prefer preset overrides when present and non-empty,
   * otherwise fall back to TemplateVariable.defaultValue.
   */
  valuesByVariableId: Record<TemplateVariableId, string | undefined>
  /**
   * Optional: useful for UI ordering/pinning without changing names.
   */
  meta?: Record<string, unknown>
}

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
  /**
   * Optional for backward compatibility with older stored templates.
   * When absent, the template is treated as having zero variables/presets.
   */
  variables?: TemplateVariable[]
  presets?: TemplatePreset[]
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
  presets?: TemplatePreset[]
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
