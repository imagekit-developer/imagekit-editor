export type TemplateSyncVersions = {
  /** Monotonically increases whenever local committed state changes. */
  localChangeVersion: number
  /** Latest version known to be persisted in the remote storage. */
  lastSyncedVersion: number
}

export function hasUnsyncedChanges(v: TemplateSyncVersions): boolean {
  return v.localChangeVersion !== v.lastSyncedVersion
}

export function bumpLocalChangeVersion(prev: number): number {
  return prev + 1
}

export function shouldMarkSyncedAfterSave(args: {
  saveStartedAtVersion: number
  localChangeVersionAtCompletion: number
}): boolean {
  return args.saveStartedAtVersion === args.localChangeVersionAtCompletion
}
