import { ChakraProvider } from "@chakra-ui/react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { TemplateVariable } from "../../storage/types"
import { VariableAwareInput } from "./VariableAwareInput"

// Mock the complex token UI so tests can deterministically open the popover.
vi.mock("./TokenizedExpressionInput", () => {
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  const TokenizedExpressionInput = (props: any) => {
    const userVarTokens = (props.tokens ?? []).filter(
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      (t: any) => t?.kind === "userVar",
    )
    return (
      <div>
        <input aria-label="token-input" ref={props.inputRef} />
        {userVarTokens.map(
          // biome-ignore lint/suspicious/noExplicitAny: test mock
          (t: any) => (
            <button
              key={t.variableId}
              type="button"
              data-testid={`chip-${t.variableId}`}
              onMouseEnter={() =>
                props.onUserVarChipMouseEnter?.({ variableId: t.variableId })
              }
              onMouseLeave={() => props.onUserVarChipMouseLeave?.()}
            >
              chip:{t.variableId}
            </button>
          ),
        )}
      </div>
    )
  }
  return { TokenizedExpressionInput }
})

function renderInput(opts: {
  value: string
  userVariables: Array<{ id: string; name: string; resolvedValue?: string }>
  templateVariables?: TemplateVariable[]
  // biome-ignore lint/suspicious/noExplicitAny: test wants exact spy type
  onUserVariableSave: any
  onChange?: (next: string) => void
}) {
  const onChange = opts.onChange ?? vi.fn()
  render(
    <ChakraProvider>
      <VariableAwareInput
        value={opts.value}
        onChange={onChange}
        userVariables={opts.userVariables}
        templateVariables={opts.templateVariables ?? []}
        onUserVariableSave={opts.onUserVariableSave}
        showResolveStrip={false}
      />
    </ChakraProvider>,
  )
  return { onChange }
}

describe("VariableAwareInput canonicalizes {{name}} -> {{uuid}} on save", () => {
  it("rewrites name-based tokens to uuid tokens after successful save", async () => {
    const uuid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    const onUserVariableSave = vi.fn(async () => ({
      ok: true as const,
      variable: {
        id: uuid,
        name: "testing",
        defaultValue: "123",
      },
    }))
    const onChange = vi.fn()

    renderInput({
      value: "ih_div_{{testing}}",
      userVariables: [{ id: "testing", name: "testing", resolvedValue: "" }],
      onUserVariableSave,
      onChange,
    })

    act(() => {
      fireEvent.mouseEnter(screen.getByTestId("chip-testing"))
    })

    // Popover input is a Chakra Input -> renders an <input> with placeholder.
    const popoverInput = await screen.findByPlaceholderText(
      "Enter a default value and press enter to save",
    )
    act(() => {
      fireEvent.change(popoverInput, { target: { value: "123" } })
    })

    await act(async () => {
      fireEvent.keyDown(popoverInput, { key: "Enter" })
      await Promise.resolve()
    })

    expect(onUserVariableSave).toHaveBeenCalledTimes(1)
    // The important bit: the expression is rewritten to uuid form.
    expect(onChange).toHaveBeenCalledWith(`ih_div_{{${uuid}}}`)
  })

  it("does not rewrite when token is already uuid-based", async () => {
    const uuid = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    const onUserVariableSave = vi.fn(async () => ({
      ok: true as const,
      variable: {
        id: uuid,
        name: "testing",
        defaultValue: "123",
      },
    }))
    const onChange = vi.fn()

    renderInput({
      value: `ih_div_{{${uuid}}}`,
      userVariables: [{ id: uuid, name: "testing", resolvedValue: "1" }],
      onUserVariableSave,
      onChange,
    })

    act(() => {
      fireEvent.mouseEnter(screen.getByTestId(`chip-${uuid}`))
    })

    const popoverInput = await screen.findByPlaceholderText(
      "Enter a default value and press enter to save",
    )

    await act(async () => {
      fireEvent.keyDown(popoverInput, { key: "Enter" })
      await Promise.resolve()
    })

    expect(onUserVariableSave).toHaveBeenCalledTimes(1)
    // No canonicalization call should happen since it's already uuid.
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining("}}}}"))
    expect(onChange).not.toHaveBeenCalledWith(`ih_div_{{testing}}`)
  })
})
