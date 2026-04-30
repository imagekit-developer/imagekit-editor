/**
 * Thrown by host {@link TemplateStorageProvider} implementations when the
 * backend responds with 401/403 (e.g. template made private or access revoked).
 * Dashboard / API clients should `throw new TemplateAccessDeniedError(...)` or
 * attach `status: 401 | 403` to the rejected error so the editor can reset UI.
 */
export class TemplateAccessDeniedError extends Error {
  readonly status: number

  constructor(message?: string, status: number = 403) {
    super(message ?? "You no longer have access to this template.")
    this.name = "TemplateAccessDeniedError"
    this.status = status
  }
}

export function isTemplateAccessDeniedError(err: unknown): boolean {
  if (err instanceof TemplateAccessDeniedError) {
    return true
  }
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: unknown }).status
    if (s === 401 || s === 403) {
      return true
    }
  }
  return false
}

export type TemplateStorageFailureActions = {
  denyTemplateStorageAccessAndReset: (message?: string) => void
}

/** Clears the loaded template and surfaces an error when access was revoked. */
export function applyTemplateStorageAccessFailure(
  err: unknown,
  actions: TemplateStorageFailureActions,
): boolean {
  if (!isTemplateAccessDeniedError(err)) {
    return false
  }
  const message =
    err instanceof TemplateAccessDeniedError
      ? err.message
      : "You no longer have access to this template."
  actions.denyTemplateStorageAccessAndReset(message)
  return true
}
