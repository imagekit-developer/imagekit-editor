import { act, render, screen } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useVisibility } from "./useVisibility"

afterEach(() => {
  vi.restoreAllMocks()
})

function VisibilityHarness(props: {
  enabled: boolean
  rootMargin?: string
  root?: Element | null
  onVisible?: (v: boolean) => void
}) {
  const { ref, visible } = useVisibility<HTMLDivElement>(
    props.enabled,
    props.rootMargin ?? "300px",
    props.root,
  )
  useEffect(() => {
    props.onVisible?.(visible)
  }, [props, visible])
  return (
    <div>
      <div data-testid="target" ref={ref} />
      <span data-testid="vis">{String(visible)}</span>
    </div>
  )
}

describe("useVisibility", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        readonly root: Element | null = null
        readonly rootMargin = ""
        readonly thresholds: readonly number[] = []
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
        takeRecords = () => []
        constructor(
          public cb: IntersectionObserverCallback,
          _init?: IntersectionObserverInit,
        ) {}
      },
    )
  })

  it("when disabled, visible is true and observer is not used", () => {
    const ctorSpy = vi.spyOn(globalThis, "IntersectionObserver")

    render(<VisibilityHarness enabled={false} />)
    expect(screen.getByTestId("vis").textContent).toBe("true")
    expect(ctorSpy).not.toHaveBeenCalled()
  })

  it("when IntersectionObserver is missing, sets visible true", () => {
    const Original = globalThis.IntersectionObserver
    // @ts-expect-error test env without IO
    delete globalThis.IntersectionObserver
    try {
      render(<VisibilityHarness enabled />)
      expect(screen.getByTestId("vis").textContent).toBe("true")
    } finally {
      globalThis.IntersectionObserver = Original
    }
  })

  it("sets visible when intersection entry is intersecting", () => {
    let callback: IntersectionObserverCallback | null = null
    class IO {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(cb: IntersectionObserverCallback) {
        callback = cb
      }
    }
    vi.stubGlobal("IntersectionObserver", IO)

    render(<VisibilityHarness enabled />)
    act(() => {
      callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(screen.getByTestId("vis").textContent).toBe("true")
  })

  it("getBoundingClientRect fallback marks visible when element is in viewport", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 10,
      bottom: 100,
      left: 10,
      right: 100,
      width: 90,
      height: 90,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    })
    render(<VisibilityHarness enabled />)
    expect(screen.getByTestId("vis").textContent).toBe("true")
  })

  it("passes root and rootMargin to IntersectionObserver", () => {
    const calls: unknown[][] = []
    class IO {
      constructor(_cb: unknown, init?: IntersectionObserverInit) {
        calls.push([init?.root, init?.rootMargin])
      }
      observe = vi.fn()
      disconnect = vi.fn()
    }
    vi.stubGlobal("IntersectionObserver", IO)

    const root = document.createElement("div")
    render(<VisibilityHarness enabled root={root} rootMargin="10px" />)
    expect(calls[0]).toEqual([root, "10px"])
  })

  it("ignores observer callback after unmount", () => {
    let callback: IntersectionObserverCallback | null = null
    class IO {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(cb: IntersectionObserverCallback) {
        callback = cb
      }
    }
    vi.stubGlobal("IntersectionObserver", IO)

    const { unmount } = render(<VisibilityHarness enabled />)
    unmount()
    act(() => {
      callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
  })
})
