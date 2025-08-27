import { useEffect, useRef, useState } from "react"

export function useVisibility<T extends HTMLElement>(
  enabled: boolean,
  rootMargin = "300px",
  root?: Element | null,
) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(!enabled)
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    let cancelled = false
    const obs = new IntersectionObserver(
      (entries) => {
        if (cancelled) return
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true)
            obs.disconnect()
            break
          }
        }
      },
      { root: root ?? null, rootMargin },
    )
    obs.observe(el)

    // Fallback if already in view
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth || document.documentElement.clientWidth
    const vh = window.innerHeight || document.documentElement.clientHeight
    if (r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0) {
      setVisible(true)
    }

    return () => {
      cancelled = true
      obs.disconnect()
    }
  }, [enabled, rootMargin, root])
  return { ref, visible } as const
}
