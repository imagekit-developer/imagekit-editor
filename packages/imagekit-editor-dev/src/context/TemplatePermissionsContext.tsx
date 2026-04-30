import type React from "react"
import { createContext, useContext, useMemo } from "react"
import type { TemplateRecord } from "../storage"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Raw permission buckets returned by the host-supplied `getTemplatePermissions`
 * callback. Each bucket maps to one or more editor actions.
 *
 * - `create`           – can create new templates
 * - `view`             – template is visible in lists / can be loaded
 * - `manage`           – can rename, save transforms, open settings
 * - `changeVisibility` – can toggle isPrivate (creator-only in most hosts)
 * - `delete`           – can delete the template
 * - `pin`              – can pin / unpin the template
 * - `reason`           – optional human-readable denial message per bucket
 */
export type TemplatePermissionBuckets = {
  create: boolean
  view: boolean
  manage: boolean
  changeVisibility: boolean
  delete: boolean
  pin: boolean
  reason?: Partial<
    Record<
      "create" | "view" | "manage" | "changeVisibility" | "delete" | "pin",
      string | undefined
    >
  >
}

/**
 * Granular action-level permissions derived from `TemplatePermissionBuckets`.
 * Components consume this for conditional rendering.
 */
export type TemplatePermissions = {
  create: boolean
  rename: boolean
  changeVisibility: boolean
  save: boolean
  delete: boolean
  pin: boolean
}

/**
 * Host-supplied callback: given a template record, return its permission buckets.
 * If omitted, all actions are allowed (open / anonymous usage).
 */
export type GetTemplatePermissions = (
  template: TemplateRecord,
) => TemplatePermissionBuckets

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const ALLOW_ALL: TemplatePermissionBuckets = {
  create: true,
  view: true,
  manage: true,
  changeVisibility: true,
  delete: true,
  pin: true,
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const TemplatePermissionsContext = createContext<GetTemplatePermissions | null>(
  null,
)

export function TemplatePermissionsContextProvider({
  getTemplatePermissions,
  children,
}: {
  getTemplatePermissions?: GetTemplatePermissions
  children: React.ReactNode
}) {
  return (
    <TemplatePermissionsContext.Provider value={getTemplatePermissions ?? null}>
      {children}
    </TemplatePermissionsContext.Provider>
  )
}

export function useGetTemplatePermissions(): GetTemplatePermissions | null {
  return useContext(TemplatePermissionsContext)
}

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

export function resolveTemplatePermissionBuckets(args: {
  template: TemplateRecord | null
  getTemplatePermissions: GetTemplatePermissions | null
}): TemplatePermissionBuckets {
  const { template, getTemplatePermissions } = args

  if (!template || !getTemplatePermissions) return ALLOW_ALL

  return getTemplatePermissions(template)
}

export function resolveTemplatePermissions(args: {
  template: TemplateRecord | null
  getTemplatePermissions: GetTemplatePermissions | null
}): TemplatePermissions {
  const b = resolveTemplatePermissionBuckets(args)

  return {
    create: b.create,
    rename: b.manage,
    changeVisibility: b.changeVisibility,
    save: b.manage,
    delete: b.delete,
    pin: b.pin,
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTemplatePermissions(
  template: TemplateRecord | null,
): TemplatePermissions {
  const getTemplatePermissions = useGetTemplatePermissions()

  return useMemo(
    () => resolveTemplatePermissions({ template, getTemplatePermissions }),
    [template, getTemplatePermissions],
  )
}

export function useTemplatePermissionBuckets(
  template: TemplateRecord | null,
): TemplatePermissionBuckets {
  const getTemplatePermissions = useGetTemplatePermissions()

  return useMemo(
    () =>
      resolveTemplatePermissionBuckets({ template, getTemplatePermissions }),
    [template, getTemplatePermissions],
  )
}
