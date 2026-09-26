"use client"

import { useMemo, useState } from "react"
import { FileText, Sparkles, type LucideIcon } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { score } from "@/lib/interaction"

export type PaletteAction = { id: string; label: string; icon: LucideIcon; shortcut?: string; run: () => void }
export type PaletteRecord = { id: string; label: string; sub?: string; meta?: string; searchText: string; run: () => void }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: PaletteAction[]
  records: PaletteRecord[]
  recordsLabel: string
  /** "Búsqueda = acción": si nada coincide bien, ofrecer crear con el texto escrito. */
  onCreate?: (text: string) => void
  createLabel?: (text: string) => string
}

type Item = { key: string; group: string; label: string; sub?: string; meta?: string; icon: LucideIcon; shortcut?: string; s: number; run: () => void }

/**
 * Paleta ⌘K. Usa Dialog + Command en lugar de CommandDialog para desactivar el filtro de cmdk
 * (shouldFilter={false}) y ordenar con nuestro puntaje: inicio de palabra gana a coincidencia interna
 * ("vacío" no debe encontrar primero "reno-vació-n").
 */
export function CommandPalette({ open, onOpenChange, actions, records, recordsLabel, onCreate, createLabel }: Props) {
  const [q, setQ] = useState("")
  const [value, setValue] = useState("")

  const groups = useMemo(() => {
    const acts: Item[] = actions
      .map(a => ({ key: `a:${a.id}`, group: "Acciones", label: a.label, icon: a.icon, shortcut: a.shortcut, s: score(a.label, q), run: a.run }))
      .filter(i => i.s > 0).sort((a, b) => b.s - a.s)
    const recs: Item[] = records
      .map(r => ({ key: `r:${r.id}`, group: recordsLabel, label: r.label, sub: r.sub, meta: r.meta, icon: FileText, s: score(r.searchText, q), run: r.run }))
      .filter(i => i.s > 0).sort((a, b) => b.s - a.s).slice(0, 6)
    const create: Item[] = q.trim() && onCreate && !acts.some(a => a.s >= 2)
      ? [{ key: "c:new", group: "Crear", label: createLabel?.(q.trim()) ?? `Crear “${q.trim()}”`, icon: Sparkles, shortcut: "↵", s: 0, run: () => onCreate(q.trim()) }]
      : []
    const top = (l: Item[]) => l[0]?.s ?? -1
    const ordered = [acts, recs].sort((a, b) => top(b) - top(a))
    return recs.length ? [...ordered, create] : [create, ...ordered]
  }, [q, actions, records, recordsLabel, onCreate, createLabel])

  const first = groups.flat()[0]?.key ?? ""
  const run = (item: Item) => { onOpenChange(false); setQ(""); item.run() }

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setQ("") }}>
      <DialogContent className="top-[12vh] translate-y-0 overflow-hidden p-0 sm:max-w-xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <Command shouldFilter={false} value={value || first} onValueChange={setValue} loop>
          <CommandInput
            value={q}
            onValueChange={v => { setQ(v); setValue("") }}
            placeholder="Busca un registro o escribe una acción…"
          />
          <CommandList className="max-h-[min(420px,55vh)]">
            <CommandEmpty>Sin resultados para “{q}”</CommandEmpty>
            {groups.map(list => list.length > 0 && (
              <CommandGroup key={list[0].group} heading={list[0].group}>
                {list.map(item => (
                  <CommandItem key={item.key} value={item.key} onSelect={() => run(item)}>
                    <item.icon />
                    <span className="truncate">
                      {item.label}
                      {item.sub && <span className="text-muted-foreground"> · {item.sub}</span>}
                    </span>
                    {item.meta && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{item.meta}</span>}
                    {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
