# Traducción del prototipo a tu stack

Un prototipo aprobado que pierde comportamientos al pasar a producción es un rediseño que no ocurrió.
La traducción no copia píxeles: preserva el **contrato de interacción** y lo comprueba con números.

Contenido:
1. Cuándo traducir
2. El contrato de interacción
3. Mapeo a React + Tailwind + shadcn/ui
4. Procedimiento
5. Datos reales: actualizaciones optimistas
6. Trampas conocidas
7. Otros stacks

---

## 1. Cuándo traducir

Cuando el prototipo pasó la medición (CI dentro del presupuesto o con la desviación justificada) y la
prueba con personas (ninguna persona se atoró). Traducir antes congela en código decisiones que
todavía cambian barato en HTML.

Si el proyecto del usuario ya tiene stack, **construye en su stack desde el principio** y usa este
documento como lista de verificación; el port de `assets/react-shadcn/` es la referencia.

## 2. El contrato de interacción

Esto es lo que no se negocia al traducir. Cada punto se puede verificar:

| Comportamiento | Por qué existe | Cómo se verifica |
|---|---|---|
| Edición en línea con Enter/salir = guardar, Esc = cancelar | Fusiona abrir + editar + guardar | Flujo medido: mismo CI |
| Un click sobre otra celda o acción mientras se edita funciona a la primera | Un novato lo encontró roto en el HTML | Persona novata o prueba de navegador |
| Deshacer en lugar de confirmar (toast con "Deshacer" + ⌘Z) | Cuesta solo cuando te equivocas | Flujo: 0 modales en borrar/cambiar estado |
| Un solo toast a la vez, sin tapar acciones | Se amontonaban y tapaban filas | Captura con selección activa |
| ⌘K con acciones, registros y "Crear “…”" | Vía rápida del experto y rescate del novato | Buscar "vacío" → primero la acción, no "renovación" |
| Atajos visibles donde se usan; ocultos en táctil y en menús abiertos con mouse | En móvil parecían contadores | Persona móvil |
| Defaults inteligentes y etiquetados ("· último usado") | Quita un campo sin sorprender | Persona novata |
| Entrada tolerante ("98 mil", "$98,000", "98k") | Ley de Postel | Prueba unitaria de `parseAmount` |
| Estados: vacío con acción, error que conserva datos, sin resultados, skeleton | 90% de la frustración real está ahí | Paleta → "Ver estado: …" |
| Feedback < 100 ms (optimista) | Doherty | Flujo medido: columna "Respuesta" |
| Densidades cómoda / compacta / táctil | Distintos contextos de uso | Captura por densidad |
| Móvil: la tabla pasa a tarjetas; acciones visibles sin hover | No hay hover ni espacio | `--viewport 390x844` |

## 3. Mapeo a React + Tailwind + shadcn/ui

| Plantilla HTML | shadcn/ui y React | Nota |
|---|---|---|
| Paleta `#palette-overlay` | `Dialog` + `Command` (cmdk) con `shouldFilter={false}` | `CommandDialog` no deja desactivar el filtro de cmdk, que no ordena por inicio de palabra |
| Toast con barra y "Deshacer" | `sonner` → `toast(msg, { id: "undo", action })` | El `id` fijo reemplaza el toast anterior (uno a la vez) |
| Menú de estado `.menu` | `DropdownMenu` controlado, `modal={false}` | Con `modal` activo, Radix bloquea los clicks fuera y rompe el flujo de edición → clic |
| Edición con `innerHTML` + input | `InlineEdit` con estado `editing` en el padre y keys estables | Las keys evitan el bug del click perdido; nunca uses el índice como key |
| Atajos en `keydown` global | `useHotkeys` | Ignora campos de texto salvo `mod+`; se desactiva con diálogos abiertos |
| `commit()` + `undoStack` | `useUndoable` | Mismo modelo: foto previa, aplicar, ofrecer revertir |
| Tokens `:root` OKLCH | Variables del tema shadcn (`--primary`, `--muted`…) + `--success`, `--info` | `tokens.css` ya está mapeado |
| `data-density` + `--row-h` | `data-density` + estilo `--row-h` en el contenedor | Las filas usan `h-[var(--row-h)]` |
| `<datalist>` de clientes | `datalist` (≤ 15 opciones) o `Popover` + `Command` (combobox) | Más de 15 opciones → combobox con búsqueda |
| Media query de tarjetas en móvil | Variantes `max-sm:` en fila y celdas | Mismas áreas: título/monto arriba, cliente/estado abajo |
| Medidor de interacción (HUD) | No se traduce | Es herramienta de diseño; en producción mide con `flow_meter.js` y analítica |

## 4. Procedimiento

1. **Congela el contrato**: copia la tabla de la sección 2 a la entrega con los puntos que aplican.
2. **Mapea componentes** a lo que ya existe en el design system del usuario antes de crear nuevos.
3. **Construye** partiendo de `assets/react-shadcn/` (o del equivalente en su stack). Conserva los
   ganchos de prueba (`data-action`, `data-field`, `tbody#rows`, nombres accesibles y placeholders) para
   que el mismo `flow.json` sirva en ambas versiones.
4. **Verifica la paridad**:
   ```bash
   node scripts/flow_meter.js run flow.json --out r-proto
   node scripts/flow_meter.js run flow.json --url http://localhost:3000/ruta --out r-app
   node scripts/flow_meter.js compare r-proto/report.json r-app/report.json --parity
   ```
   `--parity` falla (código de salida 3) si la implementación cuesta más que el prototipo y lista los
   pasos que cambiaron. Úsalo en CI para que ninguna versión futura agregue pasos sin que se note.
5. **Repite la persona novata** contra staging (`explore --url https://staging…`). Los bugs de
   interacción real aparecen aquí, no en la medición.
6. **Revisa los estados** de la sección 2 en claro, oscuro, móvil y táctil.

## 5. Datos reales: actualizaciones optimistas

El prototipo guarda en memoria. En producción, la regla es la misma: la interfaz cambia **antes** de que
responda el servidor, y si falla se revierte con un aviso que dice qué pasó. Con TanStack Query:

```tsx
const qc = useQueryClient()
const updateQuote = useMutation({
  mutationFn: (patch: Partial<Quote> & { id: number }) => api.patch(`/quotes/${patch.id}`, patch),
  onMutate: async patch => {
    await qc.cancelQueries({ queryKey: ["quotes"] })
    const prev = qc.getQueryData<Quote[]>(["quotes"])
    qc.setQueryData<Quote[]>(["quotes"], d => d?.map(q => (q.id === patch.id ? { ...q, ...patch } : q)))
    return { prev }
  },
  onError: (_err, _patch, ctx) => {
    qc.setQueryData(["quotes"], ctx?.prev)
    toast.error("No se guardó el cambio. Revisa tu conexión e inténtalo de nuevo.", { id: "undo" })
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
})
```

Para deshacer contra el servidor, "Deshacer" envía la operación inversa (restaurar el valor previo o
revertir el borrado). En borrados, conviene un borrado diferido: marca como eliminado y confirma en el
servidor al cerrar el toast; así "Deshacer" no necesita recrear el registro.

## 6. Trampas conocidas

- **Re-render que destruye el elemento clicado**: si guardar al perder foco vuelve a dibujar la lista
  (innerHTML, keys por índice, listas virtualizadas que remontan), el click que causó el blur se pierde.
  Keys estables en React; en HTML puro, recuerda el objetivo en `pointerdown` y repítelo tras guardar.
- **Menús y diálogos modales** que ponen `pointer-events: none` en el body: el siguiente click del
  usuario "no hace nada". Usa menús no modales para acciones en fila.
- **Filtro interno de cmdk**: ordena distinto que el puntaje por inicio de palabra; desactívalo.
- **Atajos que se disparan escribiendo**: todo atajo de una tecla debe ignorar inputs, textareas,
  contenteditable y diálogos abiertos.
- **Foco perdido tras cerrar un menú o diálogo**: Radix devuelve el foco al disparador; si el
  disparador ya no existe (fila borrada), mueve el foco a la fila vecina.
- **StrictMode** ejecuta efectos dos veces en desarrollo: el foco automático al editar debe ser
  idempotente (`focus()` + `select()`, sin toggles).
- **SSR**: `navigator` y `matchMedia` solo en el cliente (`"use client"` y comprobaciones de `typeof`).
- **Toasts que tapan acciones fijas**: dale `offset` al toaster o reserva otra esquina.
- **Diálogos sin título**: Radix exige `DialogTitle` (puede ser `sr-only`) para lectores de pantalla.

## 7. Otros stacks

El contrato de la sección 2 es el mismo en cualquier stack; cambian los componentes:

| Stack | Equivalentes |
|---|---|
| Vue 3 | shadcn-vue (mismos nombres: `Command`, `DropdownMenu`, `Dialog`), `vue-sonner`, composables para `useHotkeys` / `useUndoable` |
| Svelte 5 | shadcn-svelte (bits-ui), `svelte-sonner`, stores/runes para deshacer |
| Angular | Angular CDK (overlay, a11y, listbox) o spartan/ui; toasts con `ngx-sonner` |
| Tailwind sin librería | La plantilla HTML ya es JS puro: extrae tokens a `@theme` y conserva la lógica |
| Blazor / Razor | Componentes propios o MudBlazor; el patrón de `pointerdown` pendiente aplica igual si se re-renderiza la tabla |

En todos: conserva los ganchos de prueba y corre `compare --parity` antes de publicar.
