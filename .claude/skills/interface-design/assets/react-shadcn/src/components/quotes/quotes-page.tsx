"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Copy, FileText, Flag, Keyboard, Layers, Plus, Rows3, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useHotkeys } from "@/hooks/use-hotkeys"
import { useUndoable } from "@/hooks/use-undoable"
import { MOD, ago, money, norm, parseAmount } from "@/lib/interaction"
import { cn } from "@/lib/utils"
import { CommandPalette, type PaletteAction } from "./command-palette"
import { ENTITY, SAMPLE_DATA, STATUSES, statusById, type Quote, type StatusId } from "./config"
import { InlineEdit } from "./inline-edit"
import { Kbd } from "./kbd"
import { EmptyState, ErrorState, NoResults, SkeletonRows } from "./states"
import { StatusMenu, StatusTrigger } from "./status-menu"

type Field = "title" | "client" | "amount"
type View = "data" | "empty" | "loading" | "error"
type Density = "comfortable" | "compact" | "touch"
type Menu = { id: number | "bulk"; viaKeyboard: boolean } | null

const FIELD_LABEL: Record<Field, string> = { title: "título", client: "cliente", amount: "monto" }
const SHORTCUTS: [string, string[]][] = [
  ["Paleta de comandos", [MOD, "K"]], ["Nueva", ["N"]], ["Buscar", ["/"]], ["Mover", ["J", "K"]],
  ["Editar título", ["E"]], ["Cambiar estado", ["S"]], ["Seleccionar", ["X"]], ["Rango", ["⇧", "click"]],
  ["Duplicar", ["D"]], ["Eliminar", ["Supr"]], ["Deshacer", [MOD, "Z"]], ["Filtrar por estado", ["1", "5"]],
]

/** Número que se anima al cambiar; tabular-nums evita que "baile". Respeta reduced-motion. */
function useCountUp(value: number, ms = 420) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); from.current = value; return }
    const start = performance.now(), a = from.current
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms), e = 1 - (1 - p) ** 3
      setShown(Math.round(a + (value - a) * e))
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = value }
  }, [value, ms])
  return shown
}

export function QuotesPage({ initialData = SAMPLE_DATA }: { initialData?: Quote[] }) {
  const { state: data, commit, undo, replace } = useUndoable(initialData)
  const [filter, setFilter] = useState<"all" | StatusId>("all")
  const [query, setQuery] = useState("")
  const [view, setView] = useState<View>("data")
  const [density, setDensity] = useState<Density>("comfortable")
  const [focusId, setFocusId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [anchor, setAnchor] = useState<number | null>(null)
  const [editing, setEditing] = useState<{ id: number; field: Field } | null>(null)
  const [menu, setMenu] = useState<Menu>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle")
  const [flash, setFlash] = useState<{ key: string; t: number } | null>(null)
  const nextId = useRef(1000)
  const lastClient = useRef(initialData[0]?.client ?? "")
  const searchRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>())

  const rows = useMemo(() => {
    const q = norm(query.trim())
    return data.filter(r => (filter === "all" || r.status === filter) && (!q || norm(`${r.title} ${r.client}`).includes(q)))
  }, [data, filter, query])
  const clients = useMemo(() => [...new Set(data.map(r => r.client))].sort(), [data])
  const counts = useMemo(() => Object.fromEntries(STATUSES.map(s => [s.id, data.filter(r => r.status === s.id).length])), [data])
  const openTotal = useCountUp(data.filter(r => r.status === "draft" || r.status === "sent").reduce((a, r) => a + r.amount, 0))
  const wonTotal = useCountUp(data.filter(r => r.status === "won").reduce((a, r) => a + r.amount, 0))

  /* ---------- Guardado y feedback ---------- */
  const markSaved = useCallback(() => {
    setSaving("saving")
    window.setTimeout(() => setSaving("saved"), 450)
  }, [])
  const save = useCallback((label: string, next: (d: Quote[]) => Quote[], toastMsg?: string) => {
    commit(label, next, { toast: toastMsg })
    markSaved()
  }, [commit, markSaved])
  const flashCell = (key: string) => setFlash({ key, t: Date.now() })

  /* ---------- Foco y selección ---------- */
  const focusRow = useCallback((id: number | null) => {
    setFocusId(id)
    if (id == null) return
    requestAnimationFrame(() => {
      const tr = rowRefs.current.get(id)
      if (tr && !tr.contains(document.activeElement)) tr.focus({ preventScroll: true })
      tr?.scrollIntoView({ block: "nearest" })
    })
  }, [])
  const moveFocus = (d: number) => {
    if (!rows.length) return
    const i = rows.findIndex(r => r.id === focusId)
    focusRow(rows[i === -1 ? 0 : Math.max(0, Math.min(rows.length - 1, i + d))].id)
  }
  const toggleSelect = (id: number, range = false) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (range && anchor != null) {
        const ids = rows.map(r => r.id)
        const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y)
        ids.slice(a, b + 1).forEach(x => next.add(x))
      } else {
        next.has(id) ? next.delete(id) : next.add(id)
        setAnchor(id)
      }
      return next
    })
    setFocusId(id)
  }
  const targets = () => (selected.size ? [...selected] : focusId != null ? [focusId] : [])

  /* ---------- Acciones ---------- */
  const setStatus = (ids: number[], status: StatusId) => {
    const label = statusById[status].label
    save(`estado ${label}`, d => d.map(r => (ids.includes(r.id) ? { ...r, status, updated: Date.now() } : r)),
      ids.length > 1 ? `${ids.length} ${ENTITY.plural} → ${label}` : `Estado: ${label}`)
    if (status === "won") ids.forEach(id => flashCell(`row:${id}`))
    setMenu(null)
  }
  const removeRows = (ids: number[]) => {
    if (!ids.length) return
    const visible = rows.map(r => r.id)
    const i = visible.indexOf(focusId ?? ids[0])
    save(`eliminar ${ids.length}`, d => d.filter(r => !ids.includes(r.id)),
      ids.length > 1 ? `${ids.length} ${ENTITY.plural} eliminadas` : `${ENTITY.singular[0].toUpperCase()}${ENTITY.singular.slice(1)} eliminada`)
    setSelected(prev => new Set([...prev].filter(x => !ids.includes(x))))
    const rest = visible.filter(x => !ids.includes(x))
    focusRow(rest.length ? rest[Math.min(Math.max(i, 0), rest.length - 1)] : null)
  }
  const duplicate = (id: number) => {
    const src = data.find(r => r.id === id)
    if (!src) return
    const copy: Quote = { ...src, id: nextId.current++, title: `${src.title} (copia)`, status: "draft", updated: Date.now() }
    save("duplicar", d => { const i = d.findIndex(r => r.id === id); return [...d.slice(0, i + 1), copy, ...d.slice(i + 1)] }, "Duplicada como borrador")
    focusRow(copy.id)
  }
  const newRow = (title = "") => {
    setView("data"); setFilter("all"); setQuery("")
    const r: Quote = { id: nextId.current++, title, client: lastClient.current, clientDefault: true, amount: 0, status: "draft", updated: Date.now(), isNew: !title }
    save("crear", d => [r, ...d], title ? `Creada: ${title}` : undefined)
    setFocusId(r.id)
    setEditing({ id: r.id, field: title ? "amount" : "title" })
  }
  const finishEdit = (r: Quote, field: Field, raw: string, ok: boolean) => {
    setEditing(cur => (cur?.id === r.id && cur.field === field ? null : cur))
    const text = raw.trim()
    if (field === "title" && r.isNew && !text) { replace(d => d.filter(x => x.id !== r.id)); return }
    const val = field === "amount" ? parseAmount(raw) : text
    if (ok && val !== r[field] && (field === "amount" || text)) {
      // Edición = feedback local (la celda destella) + "Guardado"; ⌘Z deshace. El toast queda para acciones de más consecuencia.
      save(`editar ${FIELD_LABEL[field]}`, d => d.map(x => (x.id === r.id
        ? { ...x, [field]: val, updated: Date.now(), isNew: false, clientDefault: field === "client" ? false : x.clientDefault }
        : x)))
      if (field === "client") lastClient.current = String(val)
      flashCell(`${r.id}:${field}`)
    } else if (r.isNew) {
      replace(d => d.map(x => (x.id === r.id ? { ...x, isNew: false } : x)))
    }
  }

  /* ---------- Atajos ---------- */
  const overlayOpen = paletteOpen || helpOpen || menu != null
  const focused = focusId != null && data.some(r => r.id === focusId) ? focusId : null
  useHotkeys({
    "mod+k": () => setPaletteOpen(o => !o),
    "mod+z": e => { if (e.target instanceof HTMLInputElement) return false; undo() },
    "/": () => searchRef.current?.focus(),
    n: () => newRow(),
    j: () => moveFocus(1), ArrowDown: () => moveFocus(1),
    k: () => moveFocus(-1), ArrowUp: () => moveFocus(-1),
    x: () => (focused != null ? toggleSelect(focused) : false),
    "shift+x": () => (focused != null ? toggleSelect(focused, true) : false),
    e: () => (focused != null ? setEditing({ id: focused, field: "title" }) : false),
    Enter: e => (focused != null && !(e.target instanceof HTMLButtonElement) ? setEditing({ id: focused, field: "title" }) : false),
    s: () => { const ids = targets(); if (!ids.length) return false; setMenu({ id: selected.size ? "bulk" : ids[0], viaKeyboard: true }) },
    d: () => (focused != null ? duplicate(focused) : false),
    Delete: () => { const ids = targets(); if (!ids.length) return false; removeRows(ids) },
    Backspace: () => { const ids = targets(); if (!ids.length) return false; removeRows(ids) },
    "?": () => setHelpOpen(true),
    Escape: () => (selected.size ? setSelected(new Set()) : false),
    ...Object.fromEntries(["all", ...STATUSES.map(s => s.id)].map((f, i) => [String(i + 1), () => setFilter(f as "all" | StatusId)])),
  }, { enabled: !overlayOpen })
  useHotkeys({ "mod+k": () => setPaletteOpen(o => !o) }, { enabled: overlayOpen })

  useEffect(() => {
    if (view !== "loading") return
    const t = window.setTimeout(() => setView("data"), 1600)
    return () => window.clearTimeout(t)
  }, [view])

  /* ---------- Paleta ---------- */
  const actions: PaletteAction[] = [
    { id: "new", label: `Nueva ${ENTITY.singular}`, icon: Plus, shortcut: "N", run: () => newRow() },
    { id: "all", label: "Ver todas", icon: FileText, shortcut: "1", run: () => setFilter("all") },
    ...STATUSES.map((s, i) => ({ id: `f-${s.id}`, label: `Filtrar: ${s.label}`, icon: Flag, shortcut: String(i + 2), run: () => setFilter(s.id) })),
    { id: "d-comfortable", label: "Densidad cómoda", icon: Rows3, run: () => setDensity("comfortable") },
    { id: "d-compact", label: "Densidad compacta", icon: Rows3, run: () => setDensity("compact") },
    { id: "d-touch", label: "Densidad táctil (guantes, tableta)", icon: Rows3, run: () => setDensity("touch") },
    ...(["empty", "loading", "error", "data"] as View[]).map(v => ({ id: `v-${v}`, label: `Ver estado: ${{ empty: "vacío", loading: "cargando", error: "error", data: "con datos" }[v]}`, icon: Layers, run: () => setView(v) })),
    { id: "help", label: "Atajos de teclado", icon: Keyboard, shortcut: "?", run: () => setHelpOpen(true) },
  ]
  const records = data.map(r => ({
    id: String(r.id), label: r.title || "Sin título", sub: r.client, meta: money.format(r.amount),
    searchText: `${r.title} ${r.client} ${statusById[r.status].label}`,
    run: () => { setFilter("all"); setQuery(""); setView("data"); focusRow(r.id) },
  }))

  /* ---------- Render ---------- */
  const allIds = rows.map(r => r.id)
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someChecked = !allChecked && allIds.some(id => selected.has(id))
  const showTable = view === "loading" || (view === "data" && data.length > 0 && rows.length > 0)
  const rowH = { comfortable: "48px", compact: "36px", touch: "64px" }[density]

  return (
    <div data-density={density} style={{ "--row-h": rowH } as React.CSSProperties} className={cn("mx-auto w-full max-w-6xl px-4 pb-32 pt-7 sm:px-7", density === "touch" && "text-base")}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{ENTITY.title}</h1>
            <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-1.5 rounded-full bg-success", saving === "saving" && "animate-pulse bg-primary")} />
              {saving === "saving" ? "Guardando…" : saving === "saved" ? "Guardado" : "Todo guardado"}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Edita cualquier valor con un click. Cambia el estado desde la etiqueta.{" "}
            <span className="[@media(hover:none)_and_(pointer:coarse)]:hidden"><Kbd>?</Kbd> para ver atajos.</span>
          </p>
        </div>
        <div className="flex gap-2.5">
          <Kpi label="Pipeline abierto" value={openTotal} />
          <Kpi label="Ganado" value={wonTotal} className="text-success" />
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Filtrar por estado" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border bg-muted p-[3px]">
          {[{ id: "all" as const, label: "Todas", n: data.length }, ...STATUSES.map(s => ({ id: s.id, label: s.label, n: counts[s.id] }))].map((f, i) => (
            <button
              key={f.id}
              aria-pressed={filter === f.id}
              title={`Atajo: ${i + 1}`}
              onClick={() => { setFilter(f.id); setView("data") }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                density === "touch" ? "h-11 px-4" : "h-7",
                filter === f.id && "bg-background text-foreground shadow-sm ring-1 ring-border",
              )}
            >
              {f.label}<span className="text-xs text-muted-foreground tabular-nums">{f.n}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <span className="sr-only">Buscar {ENTITY.plural}</span>
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Filtrar lista"
            onChange={e => { setQuery(e.target.value); setView("data") }}
            onKeyDown={e => {
              if (e.key === "Escape") { setQuery(""); e.currentTarget.blur() }
              if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); e.currentTarget.blur(); moveFocus(0) }
            }}
            className={cn("peer w-full rounded-lg border bg-background pl-8 pr-8 text-sm outline-none transition focus:border-ring focus:ring-[3px] focus:ring-ring/20", density === "touch" ? "h-12" : "h-9")}
          />
          <Kbd className="absolute right-2 top-1/2 -translate-y-1/2 peer-focus:opacity-0 peer-[:not(:placeholder-shown)]:opacity-0">/</Kbd>
        </label>
        <Button onClick={() => newRow()} className={density === "touch" ? "h-12" : undefined}>
          <Plus />Nueva<Kbd className="border-primary-foreground/25 bg-primary-foreground/15 text-inherit">N</Kbd>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {showTable && (
          <Table aria-label={ENTITY.title} className="max-sm:block">
            <TableHeader className="max-sm:hidden">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-11">
                  <Checkbox aria-label="Seleccionar todas" checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={() => setSelected(prev => { const n = new Set(prev); allIds.forEach(id => (allChecked ? n.delete(id) : n.add(id))); return n })} />
                </TableHead>
                <TableHead>Cotización</TableHead>
                <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                <TableHead className="w-36 text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className={cn("hidden", density !== "touch" && "lg:table-cell")}>Actualizada</TableHead>
                <TableHead className="w-24"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            {/* En móvil cada fila pasa a tarjeta: título y monto arriba, cliente y estado abajo, acciones a la derecha. */}
            <TableBody id="rows" className="max-sm:block">
              {view === "loading" ? <SkeletonRows /> : rows.map(r => (
                <TableRow
                  key={r.id}
                  data-id={r.id}
                  tabIndex={-1}
                  aria-selected={selected.has(r.id)}
                  ref={el => { if (el) rowRefs.current.set(r.id, el); else rowRefs.current.delete(r.id) }}
                  onClick={e => {
                    if ((e.target as HTMLElement).closest("button,input,[role=checkbox]")) return
                    if (e.shiftKey || e.metaKey || e.ctrlKey) toggleSelect(r.id, e.shiftKey); else focusRow(r.id)
                  }}
                  className={cn(
                    "group h-[var(--row-h)] outline-none",
                    "max-sm:grid max-sm:h-auto max-sm:grid-cols-[minmax(0,1fr)_auto_auto] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1 max-sm:py-3 max-sm:pl-3.5 max-sm:pr-2 max-sm:[&>td]:block max-sm:[&>td]:p-0",
                    focused === r.id && "bg-muted/60 shadow-[inset_2px_0_0_var(--color-primary)]",
                    selected.has(r.id) && "bg-primary/8",
                    flash?.key === `row:${r.id}` && "animate-[flash_1s_ease-out]",
                  )}
                  onAnimationEnd={() => setFlash(null)}
                >
                  <TableCell className="max-sm:!hidden">
                    <Checkbox aria-label={`Seleccionar ${r.title}`} checked={selected.has(r.id)} onClick={e => { e.preventDefault(); toggleSelect(r.id, e.shiftKey) }}
                      className={density === "touch" ? "size-6" : undefined} />
                  </TableCell>
                  <TableCell className="max-w-0 w-[38%] truncate font-medium max-sm:col-start-1 max-sm:row-start-1 max-sm:w-auto max-sm:max-w-none">
                    <InlineEdit field="title" label="Título" value={r.title} display={r.title || <span className="text-muted-foreground">Sin título</span>}
                      editing={editing?.id === r.id && editing.field === "title"} onStart={() => setEditing({ id: r.id, field: "title" })}
                      onFinish={(raw, ok) => finishEdit(r, "title", raw, ok)} onTab={() => setEditing({ id: r.id, field: "amount" })}
                      placeholder={`Nombre de la ${ENTITY.singular} · Enter guarda`} />
                  </TableCell>
                  <TableCell className={cn("truncate text-muted-foreground max-sm:col-start-1 max-sm:row-start-2 max-sm:text-[13px] sm:table-cell", flash?.key === `${r.id}:client` && "animate-[saved_1.1s_ease-out]")}>
                    <InlineEdit field="client" label="Cliente" value={r.client} display={r.client} list="quote-clients"
                      editing={editing?.id === r.id && editing.field === "client"} onStart={() => setEditing({ id: r.id, field: "client" })}
                      onFinish={(raw, ok) => finishEdit(r, "client", raw, ok)} placeholder="Cliente" />
                    {r.clientDefault && editing?.field !== "client" && (
                      <span className="ml-1.5 text-xs text-muted-foreground/80" title="Se llenó con el último cliente que usaste">· último usado</span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums max-sm:col-start-2 max-sm:row-start-1", flash?.key === `${r.id}:amount` && "animate-[saved_1.1s_ease-out]")}>
                    <InlineEdit field="amount" label="Monto" align="right" value={r.amount} display={money.format(r.amount)}
                      editing={editing?.id === r.id && editing.field === "amount"} onStart={() => setEditing({ id: r.id, field: "amount" })}
                      onFinish={(raw, ok) => finishEdit(r, "amount", raw, ok)} placeholder="Ej. 98000 o 98 mil" />
                  </TableCell>
                  <TableCell className="max-sm:col-start-2 max-sm:row-start-2 max-sm:justify-self-end">
                    <StatusMenu current={r.status} open={menu?.id === r.id} viaKeyboard={!!menu?.viaKeyboard}
                      onOpenChange={o => setMenu(o ? { id: r.id, viaKeyboard: false } : null)} onSelect={s => setStatus([r.id], s)}>
                      <StatusTrigger status={r.status} className={density === "touch" ? "h-10 px-3.5 text-sm" : undefined} />
                    </StatusMenu>
                  </TableCell>
                  <TableCell className={cn("text-sm text-muted-foreground max-sm:!hidden", density === "touch" ? "!hidden" : "hidden lg:table-cell")}>{ago(r.updated)}</TableCell>
                  <TableCell className="text-right max-sm:col-start-3 max-sm:row-span-2 max-sm:row-start-1">
                    <span className={cn("inline-flex gap-0.5 opacity-0 max-sm:flex-col transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100",
                      (focused === r.id || density === "touch") && "opacity-100")}>
                      <RowAction label="Duplicar (D)" action="duplicate" onClick={() => duplicate(r.id)} big={density === "touch"}><Copy /></RowAction>
                      <RowAction label="Eliminar (Supr)" action="delete" danger onClick={() => removeRows([r.id])} big={density === "touch"}><Trash2 /></RowAction>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {view === "error" && <ErrorState plural={ENTITY.plural} onRetry={() => setView("loading")} />}
        {(view === "empty" || (view === "data" && data.length === 0)) && <EmptyState plural={ENTITY.plural} singular={ENTITY.singular} onCreate={() => newRow()} />}
        {view === "data" && data.length > 0 && rows.length === 0 && <NoResults query={query} onClear={() => { setQuery(""); setFilter("all") }} />}
      </div>
      <datalist id="quote-clients">{clients.map(c => <option key={c} value={c} />)}</datalist>

      {/* Barra de acciones masivas: aparece junto a la selección, desaparece con Esc. */}
      <div role="toolbar" aria-label="Acciones sobre la selección"
        className={cn("fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl bg-foreground py-1.5 pl-4 pr-1.5 text-background shadow-2xl transition duration-200",
          selected.size ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0")}>
        <span className="mr-2 text-sm font-semibold tabular-nums">{selected.size} seleccionada{selected.size === 1 ? "" : "s"}</span>
        <BulkButton onClick={() => setStatus([...selected], "won")}><Check />Marcar ganadas</BulkButton>
        <StatusMenu current={null} open={menu?.id === "bulk"} viaKeyboard={!!menu?.viaKeyboard}
          onOpenChange={o => setMenu(o ? { id: "bulk", viaKeyboard: false } : null)} onSelect={s => setStatus([...selected], s)}>
          <BulkButton><Flag />Estado<Kbd className="bg-transparent text-inherit opacity-70">S</Kbd></BulkButton>
        </StatusMenu>
        <BulkButton onClick={() => removeRows([...selected])}><Trash2 />Eliminar<Kbd className="bg-transparent text-inherit opacity-70">⌫</Kbd></BulkButton>
        <BulkButton aria-label="Limpiar selección" onClick={() => setSelected(new Set())}><X /><Kbd className="bg-transparent text-inherit opacity-70">Esc</Kbd></BulkButton>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} actions={actions} records={records}
        recordsLabel={ENTITY.title} onCreate={t => newRow(t)} createLabel={t => `Crear ${ENTITY.singular} “${t}”`} />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {SHORTCUTS.map(([l, ks]) => (
              <div key={l} className="flex items-center justify-between border-b border-dashed py-1.5 text-sm">
                <dt className="text-muted-foreground">{l}</dt>
                <dd className="flex gap-1">{ks.map(k => <Kbd key={k}>{k}</Kbd>)}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="min-w-36 rounded-xl border bg-card px-3.5 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-semibold tracking-tight tabular-nums", className)}>{money.format(value)}</div>
    </div>
  )
}

function RowAction({ label, action, danger, big, ...props }: { label: string; action: string; danger?: boolean; big?: boolean } & React.ComponentProps<"button">) {
  return (
    <button type="button" data-action={action} aria-label={label.replace(/ \(.+\)$/, "")} title={label} {...props}
      className={cn("grid place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground [&_svg]:size-4",
        big ? "size-12" : "size-8", danger && "hover:bg-destructive/10 hover:text-destructive")} />
  )
}

function BulkButton(props: React.ComponentProps<"button">) {
  return <button type="button" {...props} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium hover:bg-background/15 [&_svg]:size-4" />
}
