import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  VStack,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { PiArrowLeft } from "@react-icons/all-files/pi/PiArrowLeft"
import { PiCaretDown } from "@react-icons/all-files/pi/PiCaretDown"
import { PiInfo } from "@react-icons/all-files/pi/PiInfo"
import { PiX } from "@react-icons/all-files/pi/PiX"
import startCase from "lodash/startCase"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod/v3"
import { useTemplateSync } from "../../hooks/useTemplateSync"
import type { TransformationField } from "../../schema"
import {
  DEFAULT_FOCUS_OBJECTS,
  RESIZE_CROP_HELP_TEXT,
  RESIZE_CROP_MODES,
  transformationSchema,
} from "../../schema"
import {
  findTransformationDeep,
  type SyncStatus,
  useEditorStore,
} from "../../store"
import {
  isVariableRef,
  type VariableRef,
  walkVariableRefs,
} from "../../variables"
import { listVariables } from "../../variables/listVariables"
import {
  BoundVariableChip,
  isVariablizableField,
  MakeVariableButton,
} from "./MakeVariableButton"
import { SidebarBody } from "./sidebar-body"
import { SidebarFooter } from "./sidebar-footer"
import { SidebarHeader } from "./sidebar-header"
import { SidebarRoot } from "./sidebar-root"
import { TransformationFieldRenderer } from "./TransformationFieldRenderer"

// Stable references to prevent unnecessary re-renders
const EMPTY_ERRORS = {}
const NOOP = () => {}

// Convert a path array (e.g., ["backgroundGradient", "from"]) into the
// dot-notation key used to index `boundFields`.
const pathToKey = (path: string[]): string => path.join(".")

// Read a nested value from an object by walking `path`. Returns `undefined`
// at the first missing/non-object segment.
const getNestedValue = (
  obj: Record<string, unknown>,
  path: string[],
): unknown => {
  let current: unknown = obj
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

// Write a nested value into `obj`, creating intermediate plain-object
// segments as needed. Mutates `obj` in place.
const setNestedValue = (
  obj: Record<string, unknown>,
  path: string[],
  value: unknown,
): void => {
  if (path.length === 0) return
  if (path.length === 1) {
    obj[path[0]] = value
    return
  }
  const key = path[0]
  if (!(key in obj) || typeof obj[key] !== "object" || obj[key] === null) {
    obj[key] = {}
  }
  setNestedValue(obj[key] as Record<string, unknown>, path.slice(1), value)
}

// Recursively replace every VariableRef in a value tree with its
// `defaultValue`, so the form / Zod validator can operate on plain values
// while the original markers stay in `boundFields`.
const replaceVariableRefsWithDefaults = (value: unknown): unknown => {
  if (isVariableRef(value)) {
    return value.defaultValue
  }
  if (Array.isArray(value)) {
    return value.map(replaceVariableRefsWithDefaults)
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = replaceVariableRefsWithDefaults(v)
    }
    return out
  }
  return value
}

export type TransformationFooterActionMode =
  | "fullySynced"
  | "applyFlow"
  | "saveFlow"

/** Pure state machine for transformation sidebar footer primary + menu labels and disabled flags. */
export function getTransformationFooterActionsConfig(input: {
  isDirty: boolean
  syncStatus: SyncStatus
  hasAppliedInSession: boolean
  templateStorageWriteBlocked: boolean
  hasUnsyncedChanges: boolean
  hasInvalidDefaultValues?: boolean
}): {
  mode: TransformationFooterActionMode
  primary: { label: string; disabled: boolean }
  menu: Array<{ label: string; disabled: boolean }>
  menuTriggerDisabled: boolean
} {
  const {
    isDirty,
    syncStatus,
    hasAppliedInSession,
    templateStorageWriteBlocked,
    hasUnsyncedChanges,
    hasInvalidDefaultValues = false,
  } = input

  const fullySynced = !isDirty && !hasUnsyncedChanges && syncStatus === "saved"
  if (fullySynced) {
    return {
      mode: "fullySynced",
      primary: { label: "Apply", disabled: true },
      menu: [
        { label: "Apply & Close", disabled: true },
        { label: "Apply & Save", disabled: true },
      ],
      menuTriggerDisabled: true,
    }
  }

  const showApplyFlow = !hasAppliedInSession || isDirty
  if (showApplyFlow) {
    const canApply = isDirty && !hasInvalidDefaultValues
    const primaryDisabled = !canApply
    return {
      mode: "applyFlow",
      primary: { label: "Apply", disabled: primaryDisabled },
      menu: [
        { label: "Apply & Close", disabled: primaryDisabled },
        { label: "Apply & Save", disabled: primaryDisabled },
      ],
      menuTriggerDisabled: primaryDisabled,
    }
  }

  const saveDisabled = templateStorageWriteBlocked || syncStatus === "saving"

  return {
    mode: "saveFlow",
    primary: { label: "Save Changes", disabled: saveDisabled },
    menu: [{ label: "Save & Close", disabled: saveDisabled }],
    menuTriggerDisabled: saveDisabled,
  }
}

export const TransformationConfigSidebar: React.FC = () => {
  const {
    transformations,
    addTransformation,
    addChildTransformation,
    updateTransformation,
    imageList,
    focusObjects,
    _setSidebarState,
    _internalState,
    _setTransformationToEdit,
    _setSelectedTransformationKey,
    _setParentForChild,
    setTransformationConfigFormDirty,
  } = useEditorStore()
  const syncStatus = useEditorStore((s) => s.syncStatus)
  const templateStorageWriteBlocked = useEditorStore(
    (s) => s.templateStorageWriteBlocked,
  )
  const { saveNow } = useTemplateSync()
  const hasUnsyncedChanges = useEditorStore(
    (s) => s.localChangeVersion !== s.lastSyncedVersion,
  )
  const save = useCallback(() => saveNow({ reason: "sidebar" }), [saveNow])

  const selectedTransformation = useMemo(() => {
    return transformationSchema
      .find(
        (transformation) =>
          transformation.key ===
          _internalState.selectedTransformationKey?.split("-")[0],
      )
      ?.items.find(
        (item) => item.key === _internalState.selectedTransformationKey,
      )
  }, [_internalState.selectedTransformationKey])

  const transformationToEdit = _internalState.transformationToEdit as {
    transformationId: string
    position: "inplace"
  }

  const editedTransformation = useMemo(() => {
    if (!transformationToEdit) return undefined
    return findTransformationDeep(
      transformations,
      transformationToEdit.transformationId,
    )
  }, [transformations, transformationToEdit])

  const [hasAppliedInSession, setHasAppliedInSession] = useState(false)

  const footerSessionResetKey = `${_internalState.selectedTransformationKey ?? ""}:${editedTransformation?.id ?? ""}`

  // biome-ignore lint/correctness/useExhaustiveDependencies: must reset when switching transformation / edit target
  useEffect(() => {
    setHasAppliedInSession(false)
  }, [footerSessionResetKey])

  const editedTransformationValue = editedTransformation?.value as
    | Record<string, unknown>
    | undefined

  // ── Variables (canvas mode only) ─────────────────────────────────────────
  // The marker `{ $var, label }` is the source of truth and lives
  // inside the persisted transformation value. While the user is editing in
  // the sidebar we keep two parallel mirrors:
  //   - RHF holds the resolved default for each variabilized field, so Zod
  //     validation passes and the live editor preview keeps rendering with
  //     real values;
  //   - `boundFields` holds the marker, indexed by field name, so on Apply
  //     we can overlay markers back onto `data` before persistence.
  // This split avoids two earlier failure modes: Zod rejecting non-scalar
  // values, and the dirty flag not flipping on bind/unbind alone.
  const editorMode = useEditorStore((s) => s.mode)
  const isCanvasMode = editorMode === "canvas"
  const allTransformations = useEditorStore((s) => s.transformations)
  const onPickImage = useEditorStore((s) => s.onPickImage)
  const allTakenVariableNames = useMemo(
    () => listVariables(allTransformations).map((v) => v.name),
    [allTransformations],
  )

  const initialBoundFields = useMemo(() => {
    const out: Record<string, VariableRef> = {}
    if (!editedTransformationValue) return out

    // Walk the entire value tree to find all VariableRefs at any depth
    walkVariableRefs(editedTransformationValue, (ref, path) => {
      const key = pathToKey(path)
      out[key] = ref
    })

    return out
  }, [editedTransformationValue])

  const [boundFields, setBoundFields] =
    useState<Record<string, VariableRef>>(initialBoundFields)
  // Flips when the user binds, unbinds, or renames a variable. RHF's own
  // `isDirty` only reflects field-value diffs; binding can leave the
  // resolved default identical to RHF's seed value, so we need a separate
  // signal to enable Apply.
  const [bindingDirty, setBindingDirty] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when switching transformations / edit targets
  useEffect(() => {
    setBoundFields(initialBoundFields)
    setBindingDirty(false)
  }, [initialBoundFields, footerSessionResetKey])

  const defaultValues = useMemo(() => {
    if (!selectedTransformation) return {}

    // Seed defaults in field declaration order so cross-field `isVisible`
    // checks (e.g. `dpr` depends on `width`/`height`/`dprEnabled`) see the
    // values seeded earlier in the same pass. Fields whose `isVisible`
    // returns false against the accumulated seed are left `undefined` —
    // their `.optional()` Zod schemas accept that, and cross-field
    // `superRefine` rules (e.g. "DPR can only be used when width or height
    // is specified") don't fire on undefined values. Without this, hidden
    // fields with truthy defaults (`dpr: 1`) would block Apply even though
    // the user never saw them.
    const isInplace =
      transformationToEdit?.position === "inplace" &&
      !!editedTransformationValue
    const acc: Record<string, unknown> = {}

    for (const field of selectedTransformation.transformations) {
      // Stored value (inplace edit) always wins, even if the field would
      // currently be hidden — we don't want to silently drop user data.
      if (
        isInplace &&
        editedTransformationValue &&
        field.name in editedTransformationValue
      ) {
        const stored = editedTransformationValue[field.name]
        // Replace all VariableRefs (including nested ones) with their defaultValue
        // so the form and Zod validator have something to work with.
        acc[field.name] = replaceVariableRefsWithDefaults(stored)
        continue
      }

      if (field.isVisible && !field.isVisible(acc)) {
        // Hidden field: leave undefined so cross-field refines don't fire.
        continue
      }

      acc[field.name] = field.fieldProps?.defaultValue ?? ""
    }

    return acc
  }, [transformationToEdit, selectedTransformation, editedTransformationValue])

  // Variable-bound fields are not edited via the normal input — the user
  // sees a chip and the form holds a placeholder seed (e.g. "" for a hex
  // color, default for a slider). Per-field Zod errors on those fields
  // would block Apply for values the user can't directly fix. Strip
  // errors keyed by a bound field name; cross-field refines on the same
  // object are unaffected (they ran against the seed, which is the same
  // as it would be without binding).
  const resolver = useMemo(() => {
    const baseResolver = zodResolver(
      selectedTransformation?.schema ?? z.object({}),
    )
    return async (
      values: Record<string, unknown>,
      context: unknown,
      options: Parameters<typeof baseResolver>[2],
    ) => {
      const result = await baseResolver(values, context, options)
      const boundNames = Object.keys(boundFields)
      if (boundNames.length === 0 || !result.errors) return result
      const filtered: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(result.errors)) {
        if (!boundNames.includes(k)) filtered[k] = v
      }
      return { ...result, errors: filtered }
    }
  }, [selectedTransformation, boundFields])

  const {
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
    control,
    trigger,
  } = useForm<Record<string, unknown>>({
    resolver,
    defaultValues: defaultValues,
  })

  useEffect(() => {
    reset(defaultValues)
  }, [reset, defaultValues])

  useEffect(() => {
    setTransformationConfigFormDirty(isDirty)
    return () => setTransformationConfigFormDirty(false)
  }, [isDirty, setTransformationConfigFormDirty])

  const setDirtyValue = useCallback(
    (name: string, value: unknown) => {
      setValue(name, value, { shouldDirty: true, shouldTouch: true })
    },
    [setValue],
  )

  const values = watch()

  const focusObjectOptions = useMemo(
    () =>
      (focusObjects || DEFAULT_FOCUS_OBJECTS).map((obj) => ({
        value: obj,
        label: startCase(obj),
      })),
    [focusObjects],
  )

  // Cache stable onChange handlers per field to prevent infinite loops
  // in TransformationFieldRenderer (ColorPicker/GradientPicker are sensitive to identity)
  const onChangeHandlers = useRef<Map<string, (value: unknown) => void>>(
    new Map(),
  )
  const nestedVariableHandlers = useRef<{
    onCreate: Map<
      string,
      (
        path: string[],
        variable: { name: string; label: string; description?: string },
      ) => void
    >
    onUpdate: Map<
      string,
      (
        path: string[],
        updates: { label?: string; description?: string },
      ) => void
    >
    onUnbind: Map<string, (path: string[]) => void>
    onChange: Map<string, (path: string[], value: unknown) => void>
  }>({
    onCreate: new Map(),
    onUpdate: new Map(),
    onUnbind: new Map(),
    onChange: new Map(),
  })

  const getOnChangeHandler = useCallback((fieldName: string) => {
    if (!onChangeHandlers.current.has(fieldName)) {
      onChangeHandlers.current.set(fieldName, (value: unknown) => {
        setBoundFields((prev) => ({
          ...prev,
          [fieldName]: {
            ...prev[fieldName],
            defaultValue: value,
          },
        }))
        setBindingDirty(true)
      })
    }
    return onChangeHandlers.current.get(fieldName) as (value: unknown) => void
  }, [])

  const handleVariableRename = useCallback(
    (fieldName: string, updates: { label?: string; description?: string }) => {
      setBoundFields((prev) => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], ...updates },
      }))
      setBindingDirty(true)
    },
    [],
  )

  const handleVariableUnbind = useCallback((fieldName: string) => {
    setBoundFields((prev) => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
    setBindingDirty(true)
  }, [])

  // Stable handlers for nested variables (e.g., gradient from/to colors)
  const handleCreateNestedVariable = useCallback(
    (
      fieldName: string,
      path: string[],
      variable: { name: string; label: string; description?: string },
    ) => {
      const currentValue = getNestedValue(
        values[fieldName] as Record<string, unknown>,
        path,
      )
      const fullPath = [fieldName, ...path].join(".")
      setBoundFields((prev) => ({
        ...prev,
        [fullPath]: {
          $var: variable.name,
          label: variable.label,
          defaultValue: currentValue ?? "",
          ...(variable.description && { description: variable.description }),
        },
      }))
      setBindingDirty(true)
    },
    [values],
  )

  const handleUpdateNestedVariable = useCallback(
    (
      fieldName: string,
      path: string[],
      updates: { label?: string; description?: string },
    ) => {
      const fullPath = [fieldName, ...path].join(".")
      setBoundFields((prev) => ({
        ...prev,
        [fullPath]: { ...prev[fullPath], ...updates },
      }))
      setBindingDirty(true)
    },
    [],
  )

  const handleUnbindNestedVariable = useCallback(
    (fieldName: string, path: string[]) => {
      const fullPath = [fieldName, ...path].join(".")
      setBoundFields((prev) => {
        const next = { ...prev }
        delete next[fullPath]
        return next
      })
      setBindingDirty(true)
    },
    [],
  )

  const handleChangeNestedVariableDefault = useCallback(
    (fieldName: string, path: string[], value: unknown) => {
      const fullPath = [fieldName, ...path].join(".")
      setBoundFields((prev) => ({
        ...prev,
        [fullPath]: {
          ...prev[fullPath],
          defaultValue: value,
        },
      }))
      setBindingDirty(true)
    },
    [],
  )

  // Pre-compute nested variable bindings per top-level field. Returning a
  // memoized record (rather than recomputing on each call) keeps the
  // `nestedVariables` prop reference stable across renders, which is
  // critical for child components like ColorPicker / GradientPicker whose
  // internal effects react to prop identity.
  const nestedVariablesByField = useMemo(() => {
    const out: Record<string, Record<string, VariableRef>> = {}
    for (const [key, ref] of Object.entries(boundFields)) {
      const dotIndex = key.indexOf(".")
      if (dotIndex === -1) continue
      const fieldName = key.slice(0, dotIndex)
      const nestedPath = key.slice(dotIndex + 1)
      if (!out[fieldName]) out[fieldName] = {}
      out[fieldName][nestedPath] = ref
    }
    return out
  }, [boundFields])

  const EMPTY_NESTED: Record<string, VariableRef> = useMemo(() => ({}), [])

  const getNestedVariables = useCallback(
    (fieldName: string): Record<string, VariableRef> =>
      nestedVariablesByField[fieldName] ?? EMPTY_NESTED,
    [nestedVariablesByField, EMPTY_NESTED],
  )

  // Get cached nested variable handlers per field
  const getNestedVariableHandlers = useCallback(
    (fieldName: string) => {
      // onCreate handler
      if (!nestedVariableHandlers.current.onCreate.has(fieldName)) {
        nestedVariableHandlers.current.onCreate.set(
          fieldName,
          (path, variable) => {
            handleCreateNestedVariable(fieldName, path, variable)
          },
        )
      }

      // onUpdate handler
      if (!nestedVariableHandlers.current.onUpdate.has(fieldName)) {
        nestedVariableHandlers.current.onUpdate.set(
          fieldName,
          (path, updates) => {
            handleUpdateNestedVariable(fieldName, path, updates)
          },
        )
      }

      // onUnbind handler
      if (!nestedVariableHandlers.current.onUnbind.has(fieldName)) {
        nestedVariableHandlers.current.onUnbind.set(fieldName, (path) => {
          handleUnbindNestedVariable(fieldName, path)
        })
      }

      // onChange handler
      if (!nestedVariableHandlers.current.onChange.has(fieldName)) {
        nestedVariableHandlers.current.onChange.set(
          fieldName,
          (path, value) => {
            handleChangeNestedVariableDefault(fieldName, path, value)
          },
        )
      }

      return {
        onCreate: nestedVariableHandlers.current.onCreate.get(
          fieldName,
        ) as NonNullable<
          ReturnType<typeof nestedVariableHandlers.current.onCreate.get>
        >,
        onUpdate: nestedVariableHandlers.current.onUpdate.get(
          fieldName,
        ) as NonNullable<
          ReturnType<typeof nestedVariableHandlers.current.onUpdate.get>
        >,
        onUnbind: nestedVariableHandlers.current.onUnbind.get(
          fieldName,
        ) as NonNullable<
          ReturnType<typeof nestedVariableHandlers.current.onUnbind.get>
        >,
        onChange: nestedVariableHandlers.current.onChange.get(
          fieldName,
        ) as NonNullable<
          ReturnType<typeof nestedVariableHandlers.current.onChange.get>
        >,
      }
    },
    [
      handleCreateNestedVariable,
      handleUpdateNestedVariable,
      handleUnbindNestedVariable,
      handleChangeNestedVariableDefault,
    ],
  )

  const onClose = useCallback(() => {
    if (transformations.length === 0) {
      _setSidebarState("type")
    } else {
      _setSidebarState("none")
    }
    _setSelectedTransformationKey(null)
    _setTransformationToEdit(null)
    // Cancel any in-flight child-add: prevents the next root-level "Add"
    // from being silently re-routed into the previously-targeted parent.
    _setParentForChild(null)
  }, [
    transformations.length,
    _setSidebarState,
    _setSelectedTransformationKey,
    _setTransformationToEdit,
    _setParentForChild,
  ])

  const onBack = () => {
    _setSidebarState("type")
  }

  const onApply = useCallback(
    (data: Record<string, unknown>) => {
      if (!selectedTransformation) {
        return
      }

      const transformationToEdit = _internalState.transformationToEdit

      // Generate display name for resize_and_crop transformation
      let displayName = selectedTransformation.name
      if (
        selectedTransformation.key === "resize_and_crop-resize_and_crop" &&
        data.mode
      ) {
        const modeInfo = RESIZE_CROP_MODES.find((m) => m.value === data.mode)
        if (modeInfo) {
          displayName = `Resize and Crop (${modeInfo.label})`
        }
      }

      // Helper to check if a name is auto-generated for resize_and_crop
      const isAutoGeneratedName = (name: string) => {
        if (name === "Resize and Crop") return true
        // Check if it matches pattern "Resize and Crop (ModeName)"
        return RESIZE_CROP_MODES.some(
          (mode) => name === `Resize and Crop (${mode.label})`,
        )
      }

      if (transformationToEdit && transformationToEdit.position === "inplace") {
        // For resize_and_crop, only update name if it's still auto-generated
        // If user has manually changed it, preserve their custom name
        let finalName = editedTransformation?.name ?? displayName
        if (
          selectedTransformation.key === "resize_and_crop-resize_and_crop" &&
          editedTransformation?.name
        ) {
          if (isAutoGeneratedName(editedTransformation.name)) {
            finalName = displayName
          }
        }

        // Overlay variable markers onto the form data so the persisted
        // value carries the marker rather than the placeholder seeded into
        // RHF for the (hidden) input.
        const persistedData: Record<string, unknown> = { ...data }
        for (const [pathKey, ref] of Object.entries(boundFields)) {
          const path = pathKey.split(".")
          setNestedValue(persistedData, path, ref)
        }

        updateTransformation(transformationToEdit.transformationId, {
          type: "transformation",
          name: finalName,
          key: selectedTransformation.key,
          value: persistedData,
        })
      } else if (
        transformationToEdit &&
        (transformationToEdit.position === "above" ||
          transformationToEdit.position === "below")
      ) {
        const index = transformations.findIndex(
          (transformation) =>
            transformation.id === transformationToEdit.targetId,
        )

        const persistedData: Record<string, unknown> = { ...data }
        for (const [pathKey, ref] of Object.entries(boundFields)) {
          const path = pathKey.split(".")
          setNestedValue(persistedData, path, ref)
        }

        const transformationId = addTransformation(
          {
            type: "transformation",
            name: displayName,
            key: selectedTransformation.key,
            value: persistedData,
          },
          index + (transformationToEdit.position === "above" ? 0 : 1),
        )

        _setTransformationToEdit(transformationId, "inplace")
      } else {
        const persistedData: Record<string, unknown> = { ...data }
        for (const [pathKey, ref] of Object.entries(boundFields)) {
          const path = pathKey.split(".")
          setNestedValue(persistedData, path, ref)
        }
        // If a parent layer is in scope (the user clicked the "+" on a layer
        // row), append the new step as a nested child rather than as a new
        // top-level transformation. The parent context is one-shot — we
        // clear it after the addition completes so subsequent root-level
        // additions behave normally.
        const parentId = _internalState.parentForChild
        const transformationId = parentId
          ? addChildTransformation(parentId, {
              type: "transformation",
              name: displayName,
              key: selectedTransformation.key,
              value: persistedData,
            })
          : addTransformation({
              type: "transformation",
              name: displayName,
              key: selectedTransformation.key,
              value: persistedData,
            })
        if (parentId) {
          _setParentForChild(null)
        }

        _setTransformationToEdit(transformationId, "inplace")
      }

      setHasAppliedInSession(true)
      setBindingDirty(false)
    },
    [
      _internalState.transformationToEdit,
      _internalState.parentForChild,
      addTransformation,
      addChildTransformation,
      editedTransformation,
      selectedTransformation,
      transformations,
      updateTransformation,
      _setTransformationToEdit,
      _setParentForChild,
      boundFields,
    ],
  )

  const onSubmit = useCallback(
    (shouldClose = false): SubmitHandler<Record<string, unknown>> => {
      return (data) => {
        onApply(data)
        if (shouldClose) {
          onClose()
        }
      }
    },
    [onApply, onClose],
  )

  // Helper to check if a variable's default value is invalid
  const isDefaultValueInvalid = useCallback((ref: VariableRef) => {
    const defaultVal = ref.defaultValue
    return (
      defaultVal === undefined ||
      defaultVal === null ||
      (typeof defaultVal === "string" && defaultVal.trim() === "")
    )
  }, [])

  const footerActionsConfig = useMemo(() => {
    // Validate that all bound fields have non-empty defaultValues
    const hasInvalidDefaultValues = Object.values(boundFields).some(
      isDefaultValueInvalid,
    )

    return getTransformationFooterActionsConfig({
      isDirty: isDirty || bindingDirty,
      syncStatus,
      hasAppliedInSession,
      templateStorageWriteBlocked,
      hasUnsyncedChanges,
      hasInvalidDefaultValues,
    })
  }, [
    isDirty,
    bindingDirty,
    syncStatus,
    hasAppliedInSession,
    templateStorageWriteBlocked,
    hasUnsyncedChanges,
    boundFields,
    isDefaultValueInvalid,
  ])

  const footerActions = useMemo(() => {
    const noop = () => {}
    const applySubmit = handleSubmit(onSubmit())
    const applyCloseSubmit = handleSubmit(onSubmit(true))
    const applySaveSubmit = handleSubmit((data) => {
      onApply(data)
      void save()
    })

    switch (footerActionsConfig.mode) {
      case "fullySynced":
        return {
          primary: { ...footerActionsConfig.primary, onClick: noop },
          menuItems: footerActionsConfig.menu.map((item) => ({
            ...item,
            onClick: noop,
          })),
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled,
        }
      case "applyFlow":
        return {
          primary: {
            ...footerActionsConfig.primary,
            onClick: () => {
              void applySubmit()
            },
          },
          menuItems: [
            {
              ...footerActionsConfig.menu[0],
              onClick: () => {
                void applyCloseSubmit()
              },
            },
            {
              ...footerActionsConfig.menu[1],
              onClick: () => {
                void applySaveSubmit()
              },
            },
          ],
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled,
        }
      case "saveFlow":
        return {
          primary: {
            ...footerActionsConfig.primary,
            onClick: () => {
              void save()
            },
          },
          menuItems: [
            {
              ...footerActionsConfig.menu[0],
              onClick: () => {
                void save().finally(() => onClose())
              },
            },
          ],
          menuTriggerDisabled: footerActionsConfig.menuTriggerDisabled,
        }
    }
  }, [footerActionsConfig, handleSubmit, onSubmit, onApply, save, onClose])

  if (!selectedTransformation) {
    return null
  }

  return (
    <SidebarRoot>
      <SidebarHeader>
        {!_internalState.transformationToEdit ? (
          <IconButton
            icon={<Icon as={PiArrowLeft} />}
            onClick={onBack}
            variant="ghost"
            size="sm"
            aria-label="Back Button"
          />
        ) : null}
        <Text fontSize="md" fontWeight="normal">
          {selectedTransformation.name}
        </Text>

        {(selectedTransformation.description ||
          selectedTransformation.docsLink) && (
          <Popover
            trigger="hover"
            isLazy
            lazyBehavior="unmount"
            gutter={2}
            placement="bottom-end"
          >
            <PopoverTrigger>
              <IconButton
                icon={<Icon as={PiInfo} />}
                variant="ghost"
                size="sm"
                aria-label="Info Button"
              />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverBody fontSize="sm">
                {selectedTransformation.description && (
                  <Text>{selectedTransformation.description}</Text>
                )}
                {selectedTransformation.docsLink && (
                  <Link
                    fontSize="10px"
                    href={selectedTransformation.docsLink}
                    isExternal
                    color="editorBlue.500"
                  >
                    Click here to view docs
                  </Link>
                )}
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}
        {_internalState.transformationToEdit && (
          <IconButton
            icon={<Icon as={PiX} />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            aria-label="Close Button"
            ml="auto"
          />
        )}
      </SidebarHeader>

      <SidebarBody gap="6" p="4">
        {selectedTransformation.key === "resize_and_crop-resize_and_crop" && (
          <Text fontSize="sm" color="gray.600" mb={2}>
            {RESIZE_CROP_HELP_TEXT}
          </Text>
        )}
        {selectedTransformation.transformations
          .filter((field) => {
            if (field.isVisible) {
              return field.isVisible(values)
            }
            return true
          })
          .map((field: TransformationField) => {
            const boundVariable = boundFields[field.name]
            const showMakeVariable =
              isCanvasMode && !boundVariable && isVariablizableField(field)
            const hasInvalidDefaultValue = Boolean(
              boundVariable && isDefaultValueInvalid(boundVariable),
            )
            return (
              <FormControl
                key={field.name}
                isInvalid={
                  (!!errors[field.name] &&
                    !["gradient-picker", "padding-input"].some(
                      (type) => field.fieldType === type,
                    )) ||
                  hasInvalidDefaultValue
                }
              >
                <Flex align="center" justify="space-between" mb="1">
                  <FormLabel htmlFor={field.name} fontSize="sm" mb="0">
                    {field.label}
                  </FormLabel>
                  {showMakeVariable && (
                    <MakeVariableButton
                      fieldLabel={field.label}
                      takenNames={allTakenVariableNames}
                      onCreate={(variable) => {
                        // Capture the current field value as the default
                        const currentValue = values[field.name]
                        setBoundFields((prev) => ({
                          ...prev,
                          [field.name]: {
                            $var: variable.name,
                            label: variable.label,
                            defaultValue:
                              currentValue ??
                              field.fieldProps?.defaultValue ??
                              "",
                            ...(variable.description && {
                              description: variable.description,
                            }),
                          },
                        }))
                        setBindingDirty(true)
                        // Touching the form value forces RHF to refresh its
                        // dependents (preview, isDirty subscribers).
                        setDirtyValue(field.name, values[field.name])
                      }}
                    />
                  )}
                </Flex>
                {boundVariable ? (
                  <Box
                    borderWidth="1px"
                    borderColor={
                      hasInvalidDefaultValue ? "red.300" : "purple.200"
                    }
                    bg={hasInvalidDefaultValue ? "red.50" : "purple.50"}
                    borderRadius="md"
                    p="3"
                    mb="2"
                  >
                    <BoundVariableChip
                      variable={boundVariable}
                      onRename={(updates) =>
                        handleVariableRename(field.name, updates)
                      }
                      onUnbind={() => handleVariableUnbind(field.name)}
                    />
                    <Box mt="3">
                      <FormLabel
                        htmlFor={`${field.name}-default`}
                        fontSize="sm"
                        mb="1"
                      >
                        Default value
                      </FormLabel>
                      <TransformationFieldRenderer
                        field={field}
                        value={boundVariable.defaultValue}
                        onChange={getOnChangeHandler(field.name)}
                        onBlur={NOOP}
                        errors={EMPTY_ERRORS}
                        disabled={false}
                        selectOptionsOverride={
                          field.name === "focusObject"
                            ? focusObjectOptions
                            : undefined
                        }
                        onTrigger={NOOP}
                        onPickImage={onPickImage}
                        nestedVariables={getNestedVariables(field.name)}
                      />
                      {hasInvalidDefaultValue && (
                        <FormErrorMessage fontSize="xs" mt="1">
                          Default value is required
                        </FormErrorMessage>
                      )}
                      {field.helpText && (
                        <FormHelperText fontSize="xs" color="gray.600" mt="1">
                          {field.helpText}
                        </FormHelperText>
                      )}
                      {field.examples && (
                        <FormHelperText fontSize="xs" color="gray.600">
                          <b>Example</b>: {field.examples[0]}
                        </FormHelperText>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Controller
                    name={field.name}
                    control={control}
                    render={({ field: controllerField }) => {
                      const nestedHandlers = getNestedVariableHandlers(
                        field.name,
                      )
                      return (
                        <TransformationFieldRenderer
                          field={field}
                          value={controllerField.value}
                          onChange={controllerField.onChange}
                          onBlur={controllerField.onBlur}
                          errors={errors}
                          disabled={
                            selectedTransformation.key ===
                              "resize_and_crop-resize_and_crop" &&
                            field.name === "aspectRatio" &&
                            !!values.width &&
                            !!values.height
                          }
                          selectOptionsOverride={
                            field.name === "focusObject"
                              ? focusObjectOptions
                              : undefined
                          }
                          onTrigger={() => trigger(field.name)}
                          onPickImage={onPickImage}
                          nestedVariables={getNestedVariables(field.name)}
                          onCreateNestedVariable={nestedHandlers.onCreate}
                          onUpdateNestedVariable={nestedHandlers.onUpdate}
                          onUnbindNestedVariable={nestedHandlers.onUnbind}
                          onChangeNestedVariableDefault={
                            nestedHandlers.onChange
                          }
                        />
                      )
                    }}
                  />
                )}
                <FormErrorMessage fontSize="sm">
                  {String(
                    errors[field.name as keyof typeof errors]?.message ?? "",
                  )}
                </FormErrorMessage>
                {field.helpText && (
                  <FormHelperText fontSize="sm">
                    {field.helpText}
                    {/* Additional help text for aspect ratio when both dimensions are set */}
                    {selectedTransformation.key ===
                      "resize_and_crop-resize_and_crop" &&
                      field.name === "aspectRatio" &&
                      values.width &&
                      values.height && (
                        <Text
                          as="span"
                          color="orange.500"
                          display="block"
                          mt={1}
                        >
                          Note: Aspect ratio is ignored when both width and
                          height are specified.
                        </Text>
                      )}
                  </FormHelperText>
                )}
                {field.examples && (
                  <FormHelperText fontSize="sm">
                    <b>Example{field.examples.length > 1 ? "s" : ""}</b>:{" "}
                    {field.examples.join(", ")}
                  </FormHelperText>
                )}
              </FormControl>
            )
          })}
      </SidebarBody>
      {selectedTransformation?.warning && (
        <Alert status="warning" fontSize="sm" px="8" py="2">
          <VStack alignItems="start" justifyContent="space-between">
            {selectedTransformation.warning.heading ? (
              <AlertTitle>{selectedTransformation.warning.heading}</AlertTitle>
            ) : null}
            {selectedTransformation.warning.message ? (
              <AlertDescription lineHeight="normal">
                {selectedTransformation.warning.message.replace(
                  "{imageList.length}",
                  String(imageList.length),
                )}
              </AlertDescription>
            ) : null}
          </VStack>
        </Alert>
      )}
      {errors[""] && (
        <Alert status="error" fontSize="sm" px="8" py="2">
          <VStack alignItems="start" justifyContent="space-between">
            <AlertTitle>Invalid transformation</AlertTitle>
            <AlertDescription lineHeight="normal">
              {errors[""]?.message}
            </AlertDescription>
          </VStack>
        </Alert>
      )}
      <SidebarFooter>
        <HStack spacing={2} w="full" justifyContent="space-between">
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              if (isDirty) {
                reset()
              } else {
                onClose()
              }
            }}
          >
            {isDirty ? "Discard changes" : "Close"}
          </Button>

          <ButtonGroup size="md" isAttached variant="solid" colorScheme="blue">
            <Button
              type="button"
              isDisabled={footerActions.primary.disabled}
              onClick={footerActions.primary.onClick}
            >
              {footerActions.primary.label}
            </Button>
            <Menu placement="top-end" closeOnSelect>
              <MenuButton
                as={Button}
                isDisabled={footerActions.menuTriggerDisabled}
                colorScheme="blue"
                borderLeft="1px"
                borderLeftColor="blue.300"
                px="2"
              >
                <Icon as={PiCaretDown} />
              </MenuButton>
              <MenuList minW="160px">
                {footerActions.menuItems.map((item) => (
                  <MenuItem
                    key={item.label}
                    isDisabled={item.disabled}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </ButtonGroup>
        </HStack>
      </SidebarFooter>
    </SidebarRoot>
  )
}
