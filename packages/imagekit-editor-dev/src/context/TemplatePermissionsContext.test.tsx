import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { TemplateRecord } from "../storage"
import {
  resolveTemplatePermissionBuckets,
  resolveTemplatePermissions,
  TemplatePermissionsContextProvider,
  useTemplatePermissionBuckets,
  useTemplatePermissions,
} from "./TemplatePermissionsContext"

function makeTemplate(overrides: Partial<TemplateRecord> = {}): TemplateRecord {
  const base: TemplateRecord = {
    id: "t1",
    clientNumber: "c1",
    isPrivate: false,
    name: "My template",
    transformations: [],
    isPinned: false,
    createdBy: { userId: "u1", name: "A", email: "a@x.com" },
    updatedBy: { userId: "u1", name: "A", email: "a@x.com" },
    createdAt: 1,
    updatedAt: 2,
  }
  return { ...base, ...overrides }
}

describe("resolveTemplatePermissionBuckets", () => {
  it("returns allow-all when template is null", () => {
    const b = resolveTemplatePermissionBuckets({
      template: null,
      getTemplatePermissions: () => ({
        create: false,
        view: false,
        manage: false,
        changeVisibility: false,
        delete: false,
        pin: false,
      }),
    })
    expect(b.create).toBe(true)
    expect(b.view).toBe(true)
    expect(b.manage).toBe(true)
  })

  it("returns allow-all when getTemplatePermissions is null", () => {
    const b = resolveTemplatePermissionBuckets({
      template: makeTemplate(),
      getTemplatePermissions: null,
    })
    expect(b.delete).toBe(true)
    expect(b.pin).toBe(true)
  })

  it("delegates to host callback when both template and getter exist", () => {
    const b = resolveTemplatePermissionBuckets({
      template: makeTemplate(),
      getTemplatePermissions: () => ({
        create: false,
        view: true,
        manage: false,
        changeVisibility: true,
        delete: false,
        pin: true,
      }),
    })
    expect(b.create).toBe(false)
    expect(b.view).toBe(true)
    expect(b.manage).toBe(false)
    expect(b.changeVisibility).toBe(true)
    expect(b.delete).toBe(false)
    expect(b.pin).toBe(true)
  })
})

describe("resolveTemplatePermissions", () => {
  it("maps manage bucket to rename and save", () => {
    const p = resolveTemplatePermissions({
      template: makeTemplate(),
      getTemplatePermissions: () => ({
        create: true,
        view: true,
        manage: false,
        changeVisibility: true,
        delete: false,
        pin: false,
      }),
    })
    expect(p.rename).toBe(false)
    expect(p.save).toBe(false)
    expect(p.changeVisibility).toBe(true)
    expect(p.create).toBe(true)
    expect(p.delete).toBe(false)
    expect(p.pin).toBe(false)
  })
})

function PermissionsConsumer() {
  const perms = useTemplatePermissions(makeTemplate())
  const buckets = useTemplatePermissionBuckets(makeTemplate())
  return (
    <div>
      <span data-testid="save">{String(perms.save)}</span>
      <span data-testid="manage">{String(buckets.manage)}</span>
    </div>
  )
}

describe("TemplatePermissionsContextProvider + hooks", () => {
  it("useTemplatePermissions allows all when no getter is supplied", () => {
    render(
      <TemplatePermissionsContextProvider>
        <PermissionsConsumer />
      </TemplatePermissionsContextProvider>,
    )
    expect(screen.getByTestId("save").textContent).toBe("true")
    expect(screen.getByTestId("manage").textContent).toBe("true")
  })

  it("useTemplatePermissionBuckets reflects host getter", () => {
    render(
      <TemplatePermissionsContextProvider
        getTemplatePermissions={() => ({
          create: true,
          view: true,
          manage: false,
          changeVisibility: false,
          delete: false,
          pin: false,
        })}
      >
        <PermissionsConsumer />
      </TemplatePermissionsContextProvider>,
    )
    expect(screen.getByTestId("manage").textContent).toBe("false")
    expect(screen.getByTestId("save").textContent).toBe("false")
  })
})
