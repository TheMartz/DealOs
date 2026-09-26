/**
 * ux-tracker — mide en producción el costo de interacción real de cada tarea.
 *
 * Mismos pesos que scripts/flow_meter.js (click 1 · tecla 1 · campo 2 · modal 2 · pantalla 3) para que
 * el CI real se compare directo contra el CI diseñado. En campo no se pueden observar decisiones,
 * scrolls de búsqueda ni dudas: por eso el tablero compara contra el "CI comparable" del flujo
 * (sin decisiones ni scrolls).
 *
 * Privacidad: no captura texto, valores de campos, selectores ni URLs completas. Solo conteos,
 * duración, tipo de dispositivo, tamaño de ventana, versión y el nombre del último paso que tú marques.
 *
 * Uso:
 *   const ux = createUxTracker({ send: e => posthog.capture(e.event, e), version: "2.4.0" })
 *   const t = ux.start("registrar-cotizacion")   // al abrir el punto de inicio de la tarea
 *   t.step("estado")                              // opcional: pasos para ubicar el abandono
 *   t.complete()                                  // cuando la tarea quedó hecha (guardado exitoso)
 *   ux.mark("undo")                               // cuando el usuario usa Deshacer
 * Sin framework ni dependencias. Funciona en SPA y en sitios de varias páginas (retoma la tarea
 * tras una navegación completa usando sessionStorage).
 */

export type UxEventName = "ux_task_completed" | "ux_task_abandoned"

export type UxEvent = {
  event: UxEventName
  task: string
  ts: string
  duration_ms: number
  clicks: number
  keys: number
  fields: number
  modals: number
  navigations: number
  errors: number
  undos: number
  shortcuts: number
  /** CI mecánico observado: clicks + teclas + 2·campos + 2·modales + 3·pantallas. */
  ci: number
  device: "touch" | "mouse"
  viewport: string
  version?: string
  last_step?: string | null
  reason?: "cancel" | "timeout" | "pagehide" | "replaced"
}

export type Weights = { click: number; key: number; field: number; modal: number; navigation: number }
export const DEFAULT_WEIGHTS: Weights = { click: 1, key: 1, field: 2, modal: 2, navigation: 3 }

export type TrackerOptions = {
  send: (event: UxEvent) => void
  version?: string
  /** Inactividad tras la cual la tarea cuenta como abandonada. Por defecto 10 minutos. */
  abandonAfterMs?: number
  weights?: Partial<Weights>
  /** Selector de zonas que no son producto (p. ej. herramientas internas). */
  ignore?: string
  /** Contar confirm()/alert()/prompt() nativos como modales (envuelve window.confirm). Por defecto true. */
  patchNativeDialogs?: boolean
}

type Counts = Omit<UxEvent, "event" | "task" | "ts" | "duration_ms" | "ci" | "device" | "viewport" | "version" | "last_step" | "reason">
type State = { task: string; t0: number; last: number; lastStep: string | null; counts: Counts }

export type UxTask = {
  readonly task: string
  step: (name: string) => void
  complete: () => void
  abandon: (reason?: UxEvent["reason"]) => void
}

const STORE_KEY = "ux-tracker:active"
const DIALOGS = "dialog[open],[role=dialog],[role=alertdialog],[aria-modal=true]"
const ALERTS = "[role=alert],[aria-invalid=true]"
const zero = (): Counts => ({ clicks: 0, keys: 0, fields: 0, modals: 0, navigations: 0, errors: 0, undos: 0, shortcuts: 0 })

const visible = (el: Element) => {
  const r = (el as HTMLElement).getBoundingClientRect?.()
  if (!r || r.width === 0 || r.height === 0) return false
  return typeof (el as HTMLElement).checkVisibility === "function" ? (el as HTMLElement).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true
}
const isTextField = (el: EventTarget | null): el is HTMLElement =>
  el instanceof HTMLElement &&
  (el.isContentEditable || el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(el.type)))

export function createUxTracker(opts: TrackerOptions) {
  const W = { ...DEFAULT_WEIGHTS, ...opts.weights }
  const abandonAfter = opts.abandonAfterMs ?? 10 * 60_000
  let active: State | null = null
  let touchedFields = new WeakSet<Element>()
  let openDialogs = new Set<Element>()
  let shownAlerts = new Set<Element>()
  let idleTimer = 0

  const now = () => Date.now()
  const ignored = (t: EventTarget | null) => !!(opts.ignore && t instanceof Element && t.closest(opts.ignore))
  const device = (): UxEvent["device"] => (matchMedia("(pointer: coarse)").matches ? "touch" : "mouse")

  function emit(event: UxEventName, s: State, reason?: UxEvent["reason"]) {
    const c = s.counts
    const ci = c.clicks * W.click + c.keys * W.key + c.fields * W.field + c.modals * W.modal + c.navigations * W.navigation
    try {
      opts.send({
        event, task: s.task, ts: new Date(s.t0).toISOString(), duration_ms: Math.max(0, s.last - s.t0), ...c, ci,
        device: device(), viewport: `${innerWidth}x${innerHeight}`, version: opts.version, last_step: s.lastStep,
        ...(reason ? { reason } : {}),
      })
    } catch { /* la medición nunca debe romper el producto */ }
  }
  function end(event: UxEventName, reason?: UxEvent["reason"]) {
    if (!active) return
    if (event === "ux_task_completed") active.last = now()
    emit(event, active, reason)
    active = null
    clearTimeout(idleTimer)
    try { sessionStorage.removeItem(STORE_KEY) } catch {}
  }
  function touch() {
    if (!active) return
    active.last = now()
    clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => end("ux_task_abandoned", "timeout"), abandonAfter)
  }
  const bump = (k: keyof Counts, n = 1) => { if (active) { active.counts[k] += n; touch() } }

  /* ---------- Señales ---------- */
  const onPointer = (e: PointerEvent) => { if (!ignored(e.target)) bump("clicks") }
  const onKey = (e: KeyboardEvent) => {
    if (!active || e.repeat || ignored(e.target) || ["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) return
    const mod = e.metaKey || e.ctrlKey
    if (isTextField(e.target) && !mod && e.key.length === 1) return touch() // escribir texto = parte del campo, no suma CI
    bump("keys")
    if (mod || (e.key.length === 1 && !isTextField(e.target))) bump("shortcuts")
  }
  const onField = (e: Event) => {
    const t = e.target
    if (!active || ignored(t)) return
    if (t instanceof HTMLSelectElement) return bump("clicks") // elegir la opción; abrir el select ya contó como click
    if (isTextField(t) && !touchedFields.has(t)) { touchedFields.add(t); bump("fields") }
  }
  const onNav = () => bump("navigations")

  let raf = 0
  const scan = () => {
    raf = 0
    if (!active) return
    const dialogs = new Set([...document.querySelectorAll(DIALOGS)].filter(visible))
    dialogs.forEach(d => { if (!openDialogs.has(d)) bump("modals") })
    openDialogs = dialogs
    const alerts = new Set([...document.querySelectorAll(ALERTS)].filter(visible))
    alerts.forEach(a => { if (!shownAlerts.has(a)) bump("errors") })
    shownAlerts = alerts
  }
  const observer = new MutationObserver(() => { if (active && !raf) raf = requestAnimationFrame(scan) })

  const onHide = () => {
    if (!active) return
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...active, hiddenAt: now() })) } catch { end("ux_task_abandoned", "pagehide") }
  }

  /* ---------- Instalación ---------- */
  addEventListener("pointerdown", onPointer, true)
  addEventListener("keydown", onKey, true)
  addEventListener("input", onField, true)
  addEventListener("change", onField, true)
  addEventListener("popstate", onNav)
  addEventListener("hashchange", onNav)
  addEventListener("pagehide", onHide)
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["open", "role", "aria-modal", "aria-invalid", "class", "style", "hidden"] })

  const origPush = history.pushState
  history.pushState = function (...args) { onNav(); return origPush.apply(this, args as Parameters<typeof origPush>) }
  const natives: [keyof Window, unknown][] = []
  if (opts.patchNativeDialogs !== false) {
    for (const name of ["confirm", "alert", "prompt"] as const) {
      const orig = window[name]
      natives.push([name, orig])
      ;(window as any)[name] = (...a: unknown[]) => { bump("modals"); return (orig as (...x: unknown[]) => unknown).apply(window, a) }
    }
  }

  // Retomar una tarea que siguió en otra página del mismo sitio.
  try {
    const saved = sessionStorage.getItem(STORE_KEY)
    if (saved) {
      const s = JSON.parse(saved) as State & { hiddenAt: number }
      sessionStorage.removeItem(STORE_KEY)
      if (now() - s.hiddenAt < abandonAfter) { active = { task: s.task, t0: s.t0, last: now(), lastStep: s.lastStep, counts: s.counts }; bump("navigations") }
      else emit("ux_task_abandoned", s, "pagehide")
    }
  } catch {}

  function start(task: string): UxTask {
    if (active) end("ux_task_abandoned", "replaced")
    touchedFields = new WeakSet()
    openDialogs = new Set([...document.querySelectorAll(DIALOGS)].filter(visible))
    shownAlerts = new Set([...document.querySelectorAll(ALERTS)].filter(visible))
    const s: State = { task, t0: now(), last: now(), lastStep: null, counts: zero() }
    active = s
    touch()
    const mine = () => active === s
    return {
      task,
      step: name => { if (mine()) { s.lastStep = name; touch() } },
      complete: () => { if (mine()) end("ux_task_completed") },
      abandon: (reason = "cancel") => { if (mine()) end("ux_task_abandoned", reason) },
    }
  }

  return {
    start,
    /** Señales que el producto conoce mejor que el DOM. */
    mark(kind: "undo" | "shortcut" | "error") {
      bump(kind === "undo" ? "undos" : kind === "shortcut" ? "shortcuts" : "errors")
    },
    get current() { return active?.task ?? null },
    destroy() {
      end("ux_task_abandoned", "cancel")
      removeEventListener("pointerdown", onPointer, true)
      removeEventListener("keydown", onKey, true)
      removeEventListener("input", onField, true)
      removeEventListener("change", onField, true)
      removeEventListener("popstate", onNav)
      removeEventListener("hashchange", onNav)
      removeEventListener("pagehide", onHide)
      observer.disconnect()
      history.pushState = origPush
      for (const [name, fn] of natives) (window as any)[name] = fn
    },
  }
}

/** Envío confiable incluso al cerrar la pestaña. */
export function beaconSender(url: string) {
  return (e: UxEvent) => {
    const body = JSON.stringify(e)
    if (!navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" })))
      fetch(url, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {})
  }
}
