import type { ExpressionToken } from "./expressionTokens"

export type ImageVarNumericMap = Partial<
  Record<
    "iw" | "ih" | "iar" | "cw" | "ch" | "car" | "bw" | "bh" | "bar",
    number
  >
>

type Op = "mul" | "div" | "add" | "sub" | "mod" | "pow"

const toNumber = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function applyOp(lhs: number, op: Op, rhs: number) {
  if (op === "add") return lhs + rhs
  if (op === "sub") return lhs - rhs
  if (op === "mul") return lhs * rhs
  if (op === "div") return rhs === 0 ? null : lhs / rhs
  if (op === "mod") return rhs === 0 ? null : lhs % rhs
  if (op === "pow") return lhs ** rhs
  return null
}

/**
 * Best-effort resolver for the "Resolves to" strip.
 * Supports left-to-right evaluation of chains like:
 *   iw_mul_0.5_add_10
 *
 * Returns null when:
 * - any user variable is present
 * - required image var values are missing
 * - literals are not numeric
 */
export function resolveExpressionTokensToNumber(
  tokens: ExpressionToken[],
  img: ImageVarNumericMap,
): number | null {
  if (tokens.length === 0) return null

  const values: Array<number | Op> = []

  for (const t of tokens) {
    if (t.kind === "userVar") return null
    if (t.kind === "op") {
      values.push(t.op as Op)
      continue
    }
    if (t.kind === "imgVar") {
      const v = img[t.code]
      if (typeof v !== "number" || !Number.isFinite(v)) return null
      values.push(v)
      continue
    }
    // literal
    const n = toNumber(t.value)
    if (n === null) return null
    values.push(n)
  }

  // Expect alternating number/op/number/op/number...
  let acc: number | null = null
  let pendingOp: Op | null = null

  for (const v of values) {
    if (typeof v === "string") {
      pendingOp = v
      continue
    }
    if (acc === null) {
      acc = v
      continue
    }
    if (!pendingOp) return null
    const next = applyOp(acc, pendingOp, v)
    if (next === null || !Number.isFinite(next)) return null
    acc = next
    pendingOp = null
  }

  if (pendingOp) return null
  return acc
}
