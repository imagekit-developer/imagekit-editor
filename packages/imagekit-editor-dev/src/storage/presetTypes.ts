import type { TemplateCreator } from "./types"

/**
 * Layer transformation types that currently support presets.
 *
 * Each preset is bound to exactly one of these keys, so the field-name
 * collisions that exist across them (e.g. `positionX`, `opacity`, `rotation`)
 * are not a concern: the UI filters presets by `layerType` before listing or
 * applying them.
 *
 * Future extension: broaden to a generic `transformationKey: string` to
 * support presets for other transformation categories without an API break.
 */
export type PresetLayerType = "layers-text" | "layers-image"

/**
 * A reusable, named set of form values (plus optional variable bindings) for
 * a single layer type. Applying a preset auto-fills the layer config form.
 */
export interface PresetRecord {
  id: string
  clientNumber: string
  isPrivate: boolean
  name: string
  layerType: PresetLayerType
  /**
   * Snapshot of the layer config form's values (the same shape used as
   * `Transformation.value` for this layer type).
   */
  fieldValues: Record<string, unknown>
  /**
   * Optional snapshot of field→variable bindings (mirrors
   * `Transformation.params`). Applied alongside `fieldValues` when the user
   * opts in.
   */
  params?: Record<string, string>
  createdBy: TemplateCreator
  updatedBy: TemplateCreator
  createdAt: number
  updatedAt: number
}

export type SavePresetInput = {
  id?: string
  name: string
  layerType: PresetLayerType
  fieldValues: Record<string, unknown>
  params?: Record<string, string>
  clientNumber?: string
  isPrivate?: boolean
  createdBy?: TemplateCreator
  updatedBy?: TemplateCreator
  createdAt?: number
  updatedAt?: number
}

/**
 * Host-implemented storage for presets. Mirrors `TemplateStorageProvider` but
 * lives in its own namespace and is injected through a separate context so
 * host apps can wire presets independently of templates.
 */
export interface PresetStorageProvider {
  /**
   * List presets, optionally filtered to a single layer type. When called
   * without a filter, returns presets for all supported layer types.
   */
  listPresets(layerType?: PresetLayerType): Promise<PresetRecord[]>
  getPreset(id: string): Promise<PresetRecord | null>
  savePreset(record: SavePresetInput): Promise<PresetRecord>
  deletePreset?(id: string): Promise<void>
  getProviderName(): string
  getCurrentUserSession(): unknown
}
