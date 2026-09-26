import { AlertCircle, Inbox, Plus, RotateCcw, Search, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { Kbd } from "./kbd"

function State({ icon: Icon, tone, title, text, children }: { icon: LucideIcon; tone?: "danger"; title: string; text: string; children: React.ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : undefined} className="grid place-items-center gap-1.5 px-6 py-16 text-center">
      <div className={tone === "danger" ? "grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive" : "grid size-16 place-items-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border"}>
        <Icon className="size-7" strokeWidth={1.5} />
      </div>
      <h2 className="mt-3 text-base font-semibold tracking-tight">{title}</h2>
      <p className="mb-3 max-w-sm text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  )
}

/** Vacío = onboarding gratis: qué es, qué gana, y el primer paso con un botón. */
export function EmptyState({ plural, singular, onCreate }: { plural: string; singular: string; onCreate: () => void }) {
  return (
    <State icon={Inbox} title={`Todavía no hay ${plural}`} text={`Aquí verás cada ${singular}, su estado y cuándo darle seguimiento. Crea la primera en segundos.`}>
      <Button onClick={onCreate}><Plus />Crear {singular}<Kbd className="bg-primary-foreground/15 text-inherit">N</Kbd></Button>
    </State>
  )
}

/** Error: qué pasó en lenguaje humano, qué hacer, y la tranquilidad de que no se perdió nada. */
export function ErrorState({ plural, onRetry }: { plural: string; onRetry: () => void }) {
  return (
    <State icon={AlertCircle} tone="danger" title={`No pudimos cargar las ${plural}`} text="Revisa tu conexión. Tus cambios no guardados siguen aquí y se enviarán al reconectar.">
      <Button variant="outline" onClick={onRetry}><RotateCcw />Reintentar</Button>
    </State>
  )
}

export function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <State icon={Search} title={query ? `Nada coincide con “${query}”` : "Nada coincide"} text="Prueba con otro término o quita el filtro de estado.">
      <Button variant="outline" onClick={onClear}><X />Limpiar filtros</Button>
    </State>
  )
}

/** Skeleton con la forma exacta de la fila real (no un spinner que bloquea). */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  const bar = "h-3 animate-pulse rounded-md bg-muted"
  return Array.from({ length: rows }, (_, i) => (
    <TableRow key={i} className="h-[var(--row-h)] hover:bg-transparent">
      <TableCell className="w-11"><div className={`${bar} w-4`} /></TableCell>
      <TableCell><div className={bar} style={{ width: `${60 + ((i * 17) % 30)}%` }} /></TableCell>
      <TableCell className="hidden sm:table-cell"><div className={`${bar} w-3/4`} /></TableCell>
      <TableCell><div className={`${bar} ml-auto w-16`} /></TableCell>
      <TableCell><div className="h-5 w-16 animate-pulse rounded-full bg-muted" /></TableCell>
      <TableCell className="hidden lg:table-cell"><div className={`${bar} w-1/2`} /></TableCell>
      <TableCell />
    </TableRow>
  ))
}
