// CONFIG — reemplaza por el dominio real del usuario (mismo rol que el bloque CONFIG de la plantilla HTML).

export type StatusId = "draft" | "sent" | "won" | "lost"
export type Tone = "neutral" | "info" | "success" | "danger"

export type Quote = {
  id: number
  title: string
  client: string
  amount: number
  status: StatusId
  updated: number
  /** El cliente se prellenó con el último usado: se etiqueta para que no pase inadvertido. */
  clientDefault?: boolean
  /** Fila recién creada: si se cancela sin título, se descarta sin dejar rastro. */
  isNew?: boolean
}

export const ENTITY = { singular: "cotización", plural: "cotizaciones", title: "Cotizaciones" }

export const STATUSES: { id: StatusId; label: string; tone: Tone }[] = [
  { id: "draft", label: "Borrador", tone: "neutral" },
  { id: "sent", label: "Enviada", tone: "info" },
  { id: "won", label: "Ganada", tone: "success" },
  { id: "lost", label: "Perdida", tone: "danger" },
]
export const statusById = Object.fromEntries(STATUSES.map(s => [s.id, s])) as Record<StatusId, (typeof STATUSES)[number]>

const minsAgo = (m: number) => Date.now() - m * 60000
export const SAMPLE_DATA: Quote[] = [
  { id: 1, title: "Renovación flotilla 2027", client: "Grupo Norte", amount: 482000, status: "sent", updated: minsAgo(12) },
  { id: 2, title: "Licencias CRM · 45 usuarios", client: "Alimentos del Valle", amount: 128500, status: "draft", updated: minsAgo(45) },
  { id: 3, title: "Mantenimiento anual HVAC", client: "Hospital San Ángel", amount: 96400, status: "won", updated: minsAgo(180) },
  { id: 4, title: "Equipamiento sucursal Saltillo", client: "Ferretera Industrial", amount: 315000, status: "sent", updated: minsAgo(300) },
  { id: 5, title: "Implementación ERP fase 2", client: "Textiles Lagunera", amount: 740000, status: "draft", updated: minsAgo(1560) },
  { id: 6, title: "Uniformes temporada invierno", client: "Colegio Americano", amount: 58200, status: "lost", updated: minsAgo(2880) },
  { id: 7, title: "Cámaras de frío · 3 unidades", client: "Carnes Selectas", amount: 267900, status: "sent", updated: minsAgo(320) },
  { id: 8, title: "Consultoría logística Q1", client: "Transportes Bravo", amount: 150000, status: "won", updated: minsAgo(4320) },
  { id: 9, title: "Mobiliario oficinas corporativas", client: "Desarrollos Cumbre", amount: 412300, status: "draft", updated: minsAgo(20) },
  { id: 10, title: "Póliza soporte 24/7", client: "Clínica Médica Chihuahua", amount: 84000, status: "sent", updated: minsAgo(1800) },
  { id: 11, title: "Paneles solares nave 4", client: "Agroindustrias del Norte", amount: 1260000, status: "draft", updated: minsAgo(190) },
  { id: 12, title: "Capacitación ventas consultivas", client: "Seguros Horizonte", amount: 45600, status: "won", updated: minsAgo(5760) },
]
