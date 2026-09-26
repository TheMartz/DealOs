import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { api } from "@/lib/api"

const REGIMENES = ["601 General de Ley Personas Morales", "603 Personas Morales con Fines no Lucrativos", "605 Sueldos y Salarios", "606 Arrendamiento", "607 Enajenación o Adquisición de Bienes", "608 Demás ingresos", "610 Residentes en el Extranjero", "611 Ingresos por Dividendos", "612 Personas Físicas con Actividades Empresariales", "614 Ingresos por intereses", "615 Obtención de premios", "616 Sin obligaciones fiscales", "620 Sociedades Cooperativas", "621 Incorporación Fiscal", "622 Actividades Agrícolas", "623 Opcional para Grupos de Sociedades", "624 Coordinados", "625 Plataformas Tecnológicas", "626 Régimen Simplificado de Confianza"]
const USOS_CFDI = ["G01 Adquisición de mercancías", "G03 Gastos en general", "I01 Construcciones", "I04 Equipo de cómputo", "P01 Por definir", "S01 Sin efectos fiscales", "CP01 Pagos"]

export function ModalAltaCliente({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState({ nombre: "", rfc: "", regimen: "", usoCfdi: "", cp: "", pais: "", email: "", telefono: "", contacto: "", notas: "" })
  const [error, setError] = useState("")
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const completo = Object.entries(form).every(([k, v]) => k === "notas" || v.trim() !== "")

  const guardar = async () => {
    if (!confirm("¿Está seguro?")) return
    try {
      const res = await api.post("/clientes", form)
      alert("Registro guardado exitosamente!")
      onCreated(res.id)
      setForm({ nombre: "", rfc: "", regimen: "", usoCfdi: "", cp: "", pais: "", email: "", telefono: "", contacto: "", notas: "" })
      setPaso(1)
      onClose()
    } catch (e) {
      setError("Error 500: no se pudo procesar la solicitud")
      setForm({ nombre: "", rfc: "", regimen: "", usoCfdi: "", cp: "", pais: "", email: "", telefono: "", contacto: "", notas: "" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Alta De Nuevo Cliente (Paso {paso} De 3)</DialogTitle></DialogHeader>
        {paso === 1 && (
          <div className="grid gap-3">
            <Input placeholder="Razón social" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
            <Input placeholder="RFC" value={form.rfc} onChange={e => set("rfc", e.target.value)} />
            <select value={form.regimen} onChange={e => set("regimen", e.target.value)}>
              <option value="">Seleccione régimen</option>
              {REGIMENES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        )}
        {paso === 2 && (
          <div className="grid gap-3">
            <select value={form.usoCfdi} onChange={e => set("usoCfdi", e.target.value)}>
              <option value="">Seleccione uso de CFDI</option>
              {USOS_CFDI.map(u => <option key={u}>{u}</option>)}
            </select>
            <Input placeholder="Código postal" value={form.cp} onChange={e => set("cp", e.target.value)} />
            <select value={form.pais} onChange={e => set("pais", e.target.value)}>
              <option value="">Seleccione país</option><option>México</option><option>Estados Unidos</option><option>Canadá</option>
            </select>
          </div>
        )}
        {paso === 3 && (
          <div className="grid gap-3">
            <Input placeholder="Correo" value={form.email} onChange={e => set("email", e.target.value)} />
            <Input placeholder="Teléfono" value={form.telefono} onChange={e => set("telefono", e.target.value)} />
            <Input placeholder="Nombre de contacto" value={form.contacto} onChange={e => set("contacto", e.target.value)} />
            <Input placeholder="Notas" value={form.notas} onChange={e => set("notas", e.target.value)} />
          </div>
        )}
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-between">
          {paso > 1 && <Button variant="outline" onClick={() => setPaso(p => p - 1)}>Atrás</Button>}
          {paso < 3 ? <Button onClick={() => setPaso(p => p + 1)}>Siguiente</Button> : <Button disabled={!completo} onClick={guardar}>Aceptar</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
