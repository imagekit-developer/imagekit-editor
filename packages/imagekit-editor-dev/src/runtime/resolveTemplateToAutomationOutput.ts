import {
  buildSrc,
  buildTransformationString,
  type Transformation as IKTransformation,
} from "@imagekit/javascript"
import type { TemplateRecord } from "../storage/types"
import {
  type ResolveTemplateForRenderResult,
  resolveTemplateForRender,
  type TemplateRenderError,
} from "../templateRuntime/resolveTemplateForRender"
import { extractImagePath } from "../utils"
import { buildIkTransformations } from "./buildIkTransformations"
import { replaceImagePathPlaceholders } from "./replaceImagePathPlaceholders"

export type ResolveTemplateToAutomationOutputArgs = {
  assetUrl: string
  template: TemplateRecord
  /**
   * If omitted/null, no preset overrides are applied (defaults-only behavior).
   * If set, it must exist in template.presets to take effect.
   */
  activePresetId?: string | null
}

export type ResolveTemplateToAutomationOutputOk = {
  ok: true
  finalUrl: string
  transformationString: string
  ikTransformations: IKTransformation[]
}

export type ResolveTemplateToAutomationOutputResult =
  | ResolveTemplateToAutomationOutputOk
  | { ok: false; error: TemplateRenderError }

/**
 * Headless, deterministic resolver for Dashboard automations:
 * TemplateRecord + asset URL (+ optional preset) -> final URL + transformation string.
 */
export function resolveTemplateToAutomationOutput(
  args: ResolveTemplateToAutomationOutputArgs,
): ResolveTemplateToAutomationOutputResult {
  const { assetUrl, template, activePresetId } = args

  const resolved: ResolveTemplateForRenderResult = resolveTemplateForRender({
    transformations: template.transformations ?? [],
    variables: template.variables ?? [],
    presets: template.presets ?? [],
    activePresetId: activePresetId ?? null,
  })

  if (!resolved.ok) {
    return resolved
  }

  const ik = buildIkTransformations(resolved.transformations)
  const imagePath = extractImagePath(assetUrl)
  const ikForImage = replaceImagePathPlaceholders(ik, imagePath)

  const finalUrl = buildSrc({
    src: assetUrl,
    // buildSrc requires urlEndpoint but we supply absolute src URLs
    urlEndpoint: "does-not-matter",
    transformation: ikForImage,
  })

  return {
    ok: true,
    finalUrl,
    transformationString: buildTransformationString(ikForImage),
    ikTransformations: ikForImage,
  }
}
