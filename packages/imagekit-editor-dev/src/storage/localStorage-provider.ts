import type {
  LocalStorageProviderOptions,
  TemplateRecord,
  TemplateStorageProvider,
} from "./types"

const DEFAULT_TEMPLATES_KEY = "ik-editor-templates"

function generateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createLocalStorageProvider(
  options: LocalStorageProviderOptions = {},
): TemplateStorageProvider {
  const templatesKey = options.templatesKey ?? DEFAULT_TEMPLATES_KEY

  function readTemplates(): TemplateRecord[] {
    try {
      const raw = localStorage.getItem(templatesKey)
      if (!raw) return []
      return JSON.parse(raw) as TemplateRecord[]
    } catch {
      return []
    }
  }

  function writeTemplates(templates: TemplateRecord[]): void {
    localStorage.setItem(templatesKey, JSON.stringify(templates))
  }

  return {
    getProviderName() {
      return "localStorage"
    },

    async listTemplates(): Promise<TemplateRecord[]> {
      const templates = readTemplates()
      return [...templates].sort((a, b) => {
        const aTime = a.lastUsedAt ?? a.updatedAt
        const bTime = b.lastUsedAt ?? b.updatedAt
        return bTime - aTime
      })
    },

    async getTemplate(id: string): Promise<TemplateRecord | null> {
      const templates = readTemplates()
      return templates.find((t) => t.id === id) ?? null
    },

    async saveTemplate(
      record: Omit<TemplateRecord, "id" | "updatedAt" | "lastUsedAt"> & {
        id?: string
      },
    ): Promise<TemplateRecord> {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const templates = readTemplates()
      const now = Date.now()

      if (record.id) {
        const index = templates.findIndex((t) => t.id === record.id)
        if (index !== -1) {
          const updated: TemplateRecord = {
            ...templates[index],
            name: record.name,
            transformations: record.transformations,
            updatedAt: now,
          }
          templates[index] = updated
          writeTemplates(templates)
          return updated
        }
      }

      const newRecord: TemplateRecord = {
        id: record.id ?? generateId(),
        name: record.name,
        transformations: record.transformations,
        updatedAt: now,
      }
      templates.push(newRecord)
      writeTemplates(templates)
      return newRecord
    },

    async deleteTemplate(id: string): Promise<void> {
      const templates = readTemplates().filter((t) => t.id !== id)
      writeTemplates(templates)
    },
  }
}
