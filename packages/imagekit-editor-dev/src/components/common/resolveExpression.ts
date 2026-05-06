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

function precedence(op: Op) {
  // Match backend-style arithmetic precedence.
  // pow > mul/div/mod > add/sub
  if (op === "pow") return 3
  if (op === "mul" || op === "div" || op === "mod") return 2
  return 1
}

function isRightAssociative(op: Op) {
  // Exponentiation is typically right-associative.
  return op === "pow"
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
  const nums: number[] = []
  const ops: Op[] = []

  const pushOp = (op: Op) => {
    while (ops.length > 0) {
      const top = ops[ops.length - 1]!
      const pTop = precedence(top)
      const pOp = precedence(op)
      const shouldReduce =
        pTop > pOp || (pTop === pOp && !isRightAssociative(op))
      if (!shouldReduce) break

      ops.pop()
      const rhs = nums.pop()
      const lhs = nums.pop()
      if (lhs === undefined || rhs === undefined) return null
      const r = applyOp(lhs, top, rhs)
      if (r === null || !Number.isFinite(r)) return null
      nums.push(r)
    }
    ops.push(op)
    return true
  }

  for (const v of values) {
    if (typeof v === "string") {
      if (!pushOp(v)) return null
      continue
    }
    nums.push(v)
  }

  while (ops.length > 0) {
    const op = ops.pop()!
    const rhs = nums.pop()
    const lhs = nums.pop()
    if (lhs === undefined || rhs === undefined) return null
    const r = applyOp(lhs, op, rhs)
    if (r === null || !Number.isFinite(r)) return null
    nums.push(r)
  }

  if (nums.length !== 1) return null
  return nums[0] ?? null
}
