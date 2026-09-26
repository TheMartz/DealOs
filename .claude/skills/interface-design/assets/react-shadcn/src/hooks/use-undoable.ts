"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

type Entry<T> = { label: string; snapshot: T }

/**
 * Estado con deshacer: cada `commit` guarda una foto previa. Es la pieza que permite
 * "deshacer en lugar de confirmar": las acciones se aplican al instante y el toast ofrece revertir.
 */
export function useUndoable<T>(initial: T) {
  const [state, setState] = useState(initial)
  const stack = useRef<Entry<T>[]>([])
  const stateRef = useRef(state)
  stateRef.current = state

  const commit = useCallback((label: string, next: (prev: T) => T, opts: { toast?: string } = {}) => {
    const entry = { label, snapshot: stateRef.current }
    stack.current.push(entry)
    setState(prev => next(prev))
    if (opts.toast) {
      // Un toast a la vez (id fijo): no se apilan ni tapan la interfaz; el último es el relevante.
      toast(opts.toast, {
        id: "undo",
        duration: 6000,
        action: {
          label: "Deshacer",
          onClick: () => {
            stack.current = stack.current.filter(e => e !== entry)
            setState(entry.snapshot)
          },
        },
      })
    }
  }, [])

  const undo = useCallback(() => {
    const entry = stack.current.pop()
    if (!entry) return toast("Nada que deshacer", { id: "undo" })
    setState(entry.snapshot)
    toast(`Deshecho: ${entry.label}`, { id: "undo" })
  }, [])

  /** Cambios que no deben entrar al historial (p. ej. descartar una fila nueva vacía). */
  const replace = useCallback((next: (prev: T) => T) => setState(prev => next(prev)), [])

  return { state, commit, undo, replace }
}
