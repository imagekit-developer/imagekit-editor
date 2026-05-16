import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { EDITOR_SESSION_STORAGE_KEY } from "../persistence/editorSessionStorage"
import { useEditorStore } from "../store"
import { useEditorSessionLocalStorage } from "./useEditorSessionLocalStorage"

function Harness(props: { paused: boolean }) {
  useEditorSessionLocalStorage(props.paused)
  return null
}

describe("useEditorSessionLocalStorage", () => {
  beforeEach(() => {
    useEditorStore.getState().destroy()
    vi.useFakeTimers()
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY)
  })

  it("does not write to localStorage while paused (including initial debounced write)", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")

    render(<Harness paused />)

    // Allow any pending timers to run; paused should prevent scheduling entirely.
    act(() => {
      vi.runAllTimers()
    })
    expect(setItemSpy).not.toHaveBeenCalled()

    // Even if committable state changes, persistence must remain paused.
    act(() => {
      useEditorStore.getState().bumpLocalChangeVersion()
      vi.runAllTimers()
    })
    expect(setItemSpy).not.toHaveBeenCalled()
  })

  it("resumes writing once unpaused (initial write + subsequent version bumps)", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    const { rerender } = render(<Harness paused />)

    act(() => {
      vi.runAllTimers()
    })
    expect(setItemSpy).not.toHaveBeenCalled()

    // Unpause: hook effect should set up subscription and schedule an initial write.
    rerender(<Harness paused={false} />)
    act(() => {
      vi.runAllTimers()
    })
    expect(setItemSpy).toHaveBeenCalled()

    const callsAfterInitial = setItemSpy.mock.calls.length
    act(() => {
      useEditorStore.getState().bumpLocalChangeVersion()
      vi.runAllTimers()
    })
    expect(setItemSpy.mock.calls.length).toBeGreaterThan(callsAfterInitial)
  })
})
