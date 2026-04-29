import { describe, expect, it } from "vitest"
import type { TemplateRecord } from "../storage"
import {
  getDisplayTemplates,
  shouldHideTemplateBecauseMatchesUnsavedCurrent,
  sortTemplatesPinnedThenRecent,
} from "./templateList"

function makeTemplate(partial: Partial<TemplateRecord>): TemplateRecord {
  const now = 1_000_000
  return {
    id: "t-1",
    clientNumber: "c1",
    isPrivate: true,
    name: "Template 1",
    transformations: [],
    isPinned: false,
    createdBy: { userId: "u1", name: "Creator", email: "c@example.com" },
    updatedBy: { userId: "u1", name: "Creator", email: "c@example.com" },
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

describe("templateList utilities", () => {
  describe("shouldHideTemplateBecauseMatchesUnsavedCurrent", () => {
    it("hides a record with same name when current is unsaved (templateId null) and Current row is shown", () => {
      const record = makeTemplate({ id: "saved", name: "In progress" })
      expect(
        shouldHideTemplateBecauseMatchesUnsavedCurrent({
          record,
          templateId: null,
          shouldShowCurrent: true,
          templateName: "In progress",
        }),
      ).toBe(true)
    })

    it("does not hide when Current row is not shown", () => {
      const record = makeTemplate({ id: "saved", name: "In progress" })
      expect(
        shouldHideTemplateBecauseMatchesUnsavedCurrent({
          record,
          templateId: null,
          shouldShowCurrent: false,
          templateName: "In progress",
        }),
      ).toBe(false)
    })

    it("does not hide when a saved template is active (templateId not null)", () => {
      const record = makeTemplate({ id: "saved", name: "Same" })
      expect(
        shouldHideTemplateBecauseMatchesUnsavedCurrent({
          record,
          templateId: "active-id",
          shouldShowCurrent: true,
          templateName: "Same",
        }),
      ).toBe(false)
    })
  })

  describe("sortTemplatesPinnedThenRecent", () => {
    it("sorts pinned before unpinned", () => {
      const a = makeTemplate({ id: "a", isPinned: false, updatedAt: 5 })
      const b = makeTemplate({ id: "b", isPinned: true, updatedAt: 1 })
      const sorted = [a, b].sort(sortTemplatesPinnedThenRecent)
      expect(sorted.map((t) => t.id)).toEqual(["b", "a"])
    })

    it("sorts by lastUsedAt when present, else updatedAt", () => {
      const olderButUsed = makeTemplate({
        id: "used",
        isPinned: false,
        updatedAt: 10,
        lastUsedAt: 200,
      })
      const newerButNotUsed = makeTemplate({
        id: "updated",
        isPinned: false,
        updatedAt: 300,
        lastUsedAt: undefined,
      })
      const sorted = [olderButUsed, newerButNotUsed].sort(
        sortTemplatesPinnedThenRecent,
      )
      expect(sorted.map((t) => t.id)).toEqual(["updated", "used"])
    })
  })

  describe("getDisplayTemplates", () => {
    it("excludes the active template by id", () => {
      const t1 = makeTemplate({ id: "t1", name: "One", updatedAt: 1 })
      const t2 = makeTemplate({ id: "t2", name: "Two", updatedAt: 2 })
      const list = getDisplayTemplates({
        templates: [t1, t2],
        templateId: "t2",
        templateName: "Two",
        shouldShowCurrent: true,
        search: "",
      })
      expect(list.map((t) => t.id)).toEqual(["t1"])
    })

    it("hides the saved record that matches unsaved current name when templateId is null", () => {
      const savedSameName = makeTemplate({
        id: "saved",
        name: "In progress",
        updatedAt: 2,
      })
      const other = makeTemplate({ id: "other", name: "Other", updatedAt: 1 })
      const list = getDisplayTemplates({
        templates: [savedSameName, other],
        templateId: null,
        templateName: "In progress",
        shouldShowCurrent: true,
        search: "",
      })
      expect(list.map((t) => t.id)).toEqual(["other"])
    })

    it("filters by name search (case-insensitive) by default", () => {
      const alpha = makeTemplate({ id: "a", name: "Alpha", updatedAt: 1 })
      const beta = makeTemplate({ id: "b", name: "Beta", updatedAt: 2 })
      const list = getDisplayTemplates({
        templates: [alpha, beta],
        templateId: null,
        templateName: "New",
        shouldShowCurrent: false,
        search: "alP",
      })
      expect(list.map((t) => t.id)).toEqual(["a"])
    })

    it('supports searchMode "nameOrCreator"', () => {
      const byCreator = makeTemplate({
        id: "c",
        name: "Unrelated",
        createdBy: { userId: "u2", name: "Ada Lovelace", email: "ada@ex.com" },
        updatedAt: 1,
      })
      const other = makeTemplate({
        id: "o",
        name: "Other",
        createdBy: { userId: "u3", name: "Grace", email: "g@ex.com" },
        updatedAt: 2,
      })
      const list = getDisplayTemplates({
        templates: [byCreator, other],
        templateId: null,
        templateName: "New",
        shouldShowCurrent: false,
        search: "ada",
        searchMode: "nameOrCreator",
      })
      expect(list.map((t) => t.id)).toEqual(["c"])
    })

    it("returns pinned+recent sorted results", () => {
      const pinnedOld = makeTemplate({
        id: "p",
        name: "Pinned",
        isPinned: true,
        updatedAt: 1,
      })
      const unpinnedNew = makeTemplate({
        id: "u",
        name: "Unpinned",
        isPinned: false,
        updatedAt: 999,
      })
      const list = getDisplayTemplates({
        templates: [unpinnedNew, pinnedOld],
        templateId: null,
        templateName: "New",
        shouldShowCurrent: false,
        search: "",
      })
      expect(list.map((t) => t.id)).toEqual(["p", "u"])
    })
  })
})
