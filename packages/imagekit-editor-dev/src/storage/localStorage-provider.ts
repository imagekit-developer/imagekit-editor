import type {
  LocalStorageProviderOptions,
  SaveTemplateInput,
  TemplateCreator,
  TemplateRecord,
  TemplateStorageProvider,
} from "./types"

const DEFAULT_TEMPLATES_KEY = "ik-editor-templates"

const LOCAL_USER: TemplateCreator = { userId: "local", name: "You", email: "" }

function generateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeRecord(raw: Record<string, unknown>): TemplateRecord {
  const now = Date.now()
  const updatedAt = (raw.updatedAt as number) || now
  return {
    id: (raw.id as string) || generateId(),
    clientNumber: (raw.clientNumber as string) || "local",
    isPrivate:
      raw.isPrivate !== undefined ? (raw.isPrivate as boolean) : true,
    name: (raw.name as string) || "",
    transformations:
      (raw.transformations as TemplateRecord["transformations"]) || [],
    pinnedBy: (raw.pinnedBy as string[]) || [],
    createdBy: (raw.createdBy as TemplateCreator) || LOCAL_USER,
    updatedBy: (raw.updatedBy as TemplateCreator) || LOCAL_USER,
    createdAt: (raw.createdAt as number) || updatedAt,
    updatedAt,
    lastUsedAt: raw.lastUsedAt as number | undefined,
  }
}

export function createLocalStorageProvider(
  options: LocalStorageProviderOptions = {},
): TemplateStorageProvider {
  const templatesKey = options.templatesKey ?? DEFAULT_TEMPLATES_KEY

  function readTemplates(): TemplateRecord[] {
    try {
      const raw = localStorage.getItem(templatesKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as Record<string, unknown>[]
      return parsed.map(normalizeRecord)
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

    async saveTemplate(record: SaveTemplateInput): Promise<TemplateRecord> {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const templates = readTemplates()
      const now = Date.now()

      if (record.id) {
        const index = templates.findIndex((t) => t.id === record.id)
        if (index !== -1) {
          const existing = templates[index]
          const updated: TemplateRecord = {
            ...existing,
            name: record.name,
            transformations: record.transformations,
            isPrivate: record.isPrivate ?? existing.isPrivate,
            pinnedBy: record.pinnedBy ?? existing.pinnedBy,
            updatedAt: now,
            updatedBy: record.updatedBy ?? LOCAL_USER,
          }
          templates[index] = updated
          writeTemplates(templates)
          return updated
        }
      }

      const newRecord: TemplateRecord = {
        id: record.id ?? generateId(),
        clientNumber: record.clientNumber ?? "local",
        isPrivate: record.isPrivate ?? true,
        name: record.name,
        transformations: record.transformations,
        pinnedBy: record.pinnedBy ?? [],
        createdBy: record.createdBy ?? LOCAL_USER,
        updatedBy: record.updatedBy ?? record.createdBy ?? LOCAL_USER,
        createdAt: record.createdAt ?? now,
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
