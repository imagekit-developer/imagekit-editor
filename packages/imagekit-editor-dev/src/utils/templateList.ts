import type { TemplateRecord } from "../storage"

export function sortTemplatesPinnedThenRecent(
  a: TemplateRecord,
  b: TemplateRecord,
): number {
  const aPinned = a.isPinned ? 1 : 0
  const bPinned = b.isPinned ? 1 : 0
  if (aPinned !== bPinned) return bPinned - aPinned

  const aTime = a.lastUsedAt ?? a.updatedAt
  const bTime = b.lastUsedAt ?? b.updatedAt
  return bTime - aTime
}

export function shouldHideTemplateBecauseMatchesUnsavedCurrent(args: {
  record: TemplateRecord
  /** Current template id in the editor store. */
  templateId: string | null
  /** Whether the UI should show the "Current" row (i.e. editor has live state). */
  shouldShowCurrent: boolean
  /** Current template name in the editor store. */
  templateName: string
}): boolean {
  const { record, templateId, shouldShowCurrent, templateName } = args
  return (
    shouldShowCurrent && templateId === null && record.name === templateName
  )
}

type SearchMode = "name" | "nameOrCreator"

function matchesSearch(
  record: TemplateRecord,
  searchLower: string,
  mode: SearchMode,
): boolean {
  if (!searchLower) return true
  if (record.name.toLowerCase().includes(searchLower)) return true
  if (mode === "name") return false
  return (
    record.createdBy.name.toLowerCase().includes(searchLower) ||
    record.createdBy.email.toLowerCase().includes(searchLower)
  )
}

export function getDisplayTemplates(args: {
  templates: TemplateRecord[]
  templateId: string | null
  templateName: string
  shouldShowCurrent: boolean
  search: string
  searchMode?: SearchMode
}): TemplateRecord[] {
  const {
    templates,
    templateId,
    templateName,
    shouldShowCurrent,
    search,
    searchMode = "name",
  } = args

  const searchLower = search.toLowerCase()

  return templates
    .filter((t) => t.id !== templateId)
    .filter(
      (t) =>
        !shouldHideTemplateBecauseMatchesUnsavedCurrent({
          record: t,
          templateId,
          shouldShowCurrent,
          templateName,
        }),
    )
    .filter((t) => matchesSearch(t, searchLower, searchMode))
    .slice()
    .sort(sortTemplatesPinnedThenRecent)
}
