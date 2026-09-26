"use client"

import { useEffect, useRef } from "react"
import { isTyping } from "@/lib/interaction"

export type HotkeyHandler = (e: KeyboardEvent) => void | boolean

/**
 * Atajos globales. Claves: "n", "shift+x", "mod+k" (⌘ en Mac, Ctrl en el resto), "Delete", "?".
 * - Mientras el usuario escribe, solo corren los atajos con "mod+" (⌘K debe abrir desde cualquier campo).
 * - Si el handler devuelve false, el evento sigue su curso normal (no se hace preventDefault).
 * - `enabled: false` desactiva todo (por ejemplo, con un diálogo abierto).
 */
export function useHotkeys(map: Record<string, HotkeyHandler>, { enabled = true } = {}) {
  const ref = useRef(map)
  ref.current = map

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const combo = `${mod ? "mod+" : ""}${e.shiftKey && e.key.length > 1 ? "shift+" : ""}${key}`
      const handler = ref.current[combo] ?? (e.shiftKey && e.key.length === 1 ? ref.current[`shift+${key}`] : undefined)
      if (!handler) return
      if (!mod && (isTyping(e.target) || e.altKey)) return
      if (!mod && e.target instanceof HTMLElement && e.target.closest("[role=dialog],[role=menu]")) return
      if (handler(e) !== false) e.preventDefault()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [enabled])
}
