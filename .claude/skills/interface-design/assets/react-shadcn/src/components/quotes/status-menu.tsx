"use client"

import { Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { STATUSES, statusById, type StatusId, type Tone } from "./config"

export const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  danger: "bg-destructive/12 text-destructive",
}

export function StatusPill({ status, className }: { status: StatusId; className?: string }) {
  const s = statusById[status]
  return (
    <span data-tone={s.tone} className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium", toneClass[s.tone], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

type Props = {
  /** Estado actual (una fila) o null (selección múltiple). */
  current: StatusId | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Los números de atajo solo se muestran si se abrió con teclado: con mouse o en táctil se leen como conteos. */
  viaKeyboard: boolean
  onSelect: (status: StatusId) => void
  children: React.ReactNode
}

/** Menú de estado en la misma fila: cambiar estado = 2 clicks sin salir de la lista. */
export function StatusMenu({ current, open, onOpenChange, viaKeyboard, onSelect, children }: Props) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-44"
        onKeyDown={e => {
          const n = Number(e.key)
          if (n >= 1 && n <= STATUSES.length) { e.preventDefault(); onSelect(STATUSES[n - 1].id); onOpenChange(false) }
        }}
      >
        {STATUSES.map((s, i) => (
          <DropdownMenuItem key={s.id} onSelect={() => onSelect(s.id)}>
            <StatusPill status={s.id} />
            {s.id === current ? <Check className="ml-auto size-4 text-primary" /> : viaKeyboard && <DropdownMenuShortcut>{i + 1}</DropdownMenuShortcut>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** El disparador visible en la fila: la etiqueta con un chevron, para que se lea como menú. */
export function StatusTrigger({ status, ...props }: { status: StatusId } & React.ComponentProps<"button">) {
  const s = statusById[status]
  return (
    <button
      type="button"
      data-action="status"
      aria-haspopup="menu"
      title="Cambiar estado (S)"
      {...props}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition active:scale-[.97]",
        "hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ring",
        toneClass[s.tone],
        props.className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
      <ChevronDown className="size-3 opacity-60" />
    </button>
  )
}
