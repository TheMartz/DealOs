"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type Props = {
  field: string
  /** Valor crudo que se pone en el input al editar. */
  value: string | number
  /** Cómo se ve sin editar (p. ej. el monto formateado). */
  display: React.ReactNode
  editing: boolean
  onStart: () => void
  /** save=false cuando el usuario presionó Esc. */
  onFinish: (raw: string, save: boolean) => void
  /** Tab: guarda y pasa al siguiente campo que decida el padre. */
  onTab?: () => void
  label: string
  placeholder?: string
  list?: string
  align?: "left" | "right"
  className?: string
}

/**
 * Edición en línea: click en el valor → input → Enter o salir del campo guarda, Esc cancela.
 * Por qué así: fusiona "abrir formulario + editar + guardar" en un solo gesto (catálogo, sección 3).
 * Con keys estables en las filas, React no destruye el elemento clicado al guardar, así que un click
 * sobre otra celda o sobre el estado mientras se edita funciona a la primera (el bug que encontraron
 * las personas simuladas en la versión HTML).
 */
export function InlineEdit({ field, value, display, editing, onStart, onFinish, onTab, label, placeholder, list, align = "left", className }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    if (!editing) return
    done.current = false
    ref.current?.focus()
    ref.current?.select()
  }, [editing])

  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    onFinish(ref.current?.value ?? "", save)
  }

  if (!editing) {
    return (
      <button
        type="button"
        tabIndex={-1}
        data-field={field}
        title="Click para editar"
        onClick={onStart}
        className={cn(
          "-mx-1.5 -my-1 max-w-full cursor-text truncate rounded-md px-1.5 py-1 text-inherit transition-colors",
          "hover:bg-accent hover:ring-1 hover:ring-border",
          align === "right" && "tabular-nums",
          className,
        )}
      >
        {display}
      </button>
    )
  }

  return (
    <input
      ref={ref}
      defaultValue={value === 0 ? "" : String(value)}
      aria-label={label}
      placeholder={placeholder}
      list={list}
      autoComplete="off"
      className={cn(
        "-mx-2 h-8 w-full rounded-md border border-ring bg-background px-1.5 text-inherit outline-none ring-[3px] ring-ring/20",
        align === "right" && "text-right tabular-nums",
      )}
      onBlur={() => finish(true)}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); finish(true) }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false) }
        else if (e.key === "Tab" && onTab) { e.preventDefault(); finish(true); onTab() }
      }}
    />
  )
}
