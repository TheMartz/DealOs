// Utilidades de interacción compartidas por los componentes. Sin dependencias.

/** Minúsculas y sin acentos, para buscar "renovacion" y encontrar "Renovación". */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Ley de Postel: acepta "98000", "$98,000", "98 mil", "98k", "1.2 millones", "1.5m". */
export function parseAmount(raw: string): number {
  const t = norm(raw).replace(/\s+/g, " ").trim()
  const mult = /(millon|millones|\bm\b|mm)/.test(t) ? 1e6 : /(mil|\bk\b|k$)/.test(t) ? 1e3 : 1
  const num = parseFloat(t.replace(/,/g, "").replace(/[^\d.]/g, "")) || 0
  return Math.round(num * mult)
}

/**
 * Puntaje de coincidencia para la paleta de comandos: inicio de texto 3, inicio de palabra 2,
 * dentro de palabra 1. Todas las palabras deben aparecer; 0 = no coincide.
 */
export function score(text: string, query: string): number {
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return 1
  const t = norm(text)
  let total = 0
  for (const w of words) {
    const i = t.indexOf(w)
    if (i < 0) return 0
    total += i === 0 ? 3 : /[\s·:(\-“]/.test(t[i - 1]) ? 2 : 1
  }
  return total
}

export const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" })
export function ago(ts: number): string {
  const m = (Date.now() - ts) / 60000
  if (m < 1) return "ahora"
  if (m < 60) return rtf.format(-Math.round(m), "minute")
  if (m < 1440) return rtf.format(-Math.round(m / 60), "hour")
  return rtf.format(-Math.round(m / 1440), "day")
}

/** true si el evento viene de un lugar donde el usuario está escribiendo. */
export const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || (el.matches("input, textarea, select") && !el.matches("[type=checkbox],[type=radio]")))

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = isMac ? "⌘" : "Ctrl"
