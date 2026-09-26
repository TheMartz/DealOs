# Revisión de PRs: que ningún cambio agregue pasos sin que se note

Los flujos se degradan de a un click: un "¿Seguro?" por aquí, un campo obligatorio por allá, una
acción que se mudó a un menú "…". Ningún cambio parece grave y en seis meses la tarea #1 cuesta el
doble. Esta revisión lo hace visible en cada PR, con dos capas:

1. **Medición automática** (`flow_meter.js check` en CI): el número exacto, paso por paso.
2. **Revisión del diff** (humana o de Claude): detecta lo que los flujos no cubren.

Contenido:
1. Configurar la medición en CI
2. Leer el comentario del PR
3. Cuándo se acepta un aumento
4. Revisión del diff: señales de costo agregado
5. Formato del comentario de revisión
6. Integrarlo en la revisión de Claude (REVIEW.md)

---

## 1. Configurar la medición en CI

1. En el repo del usuario crea `ux/flows/` con un `flow.json` por tarea crítica (la tarea #1 de cada
   persona, 3 a 8 flujos; no todos los caminos). Usa URLs relativas (`"url": "/cotizaciones"`) y
   selectores estables: nombres accesibles (`role=button[name="Nueva"]`), `label=`, `placeholder=`,
   o atributos `data-action` / `data-testid`. Evita clases CSS, que cambian con cualquier rediseño.
2. Copia `scripts/flow_meter.js` al repo (por ejemplo, a `scripts/`).
3. Crea la línea base con la app corriendo en local:
   ```bash
   node scripts/flow_meter.js check ux/flows --baseline ux/baseline --base-url http://localhost:3000 --update-baseline
   ```
   Commitea `ux/baseline/`.
4. Copia `assets/ci/interaction-cost.yml` a `.github/workflows/` y ajusta las líneas `AJUSTA`
   (build, servidor, puerto, rutas). Usa datos de prueba (seed): los flujos crean registros.
5. Para sesiones iniciadas, agrega un paso de login en `setup` o usa `storageState` generado con
   `npx playwright codegen --save-storage=auth.json` (guárdalo como secret, no en el repo).

El workflow corre `check`, publica **un solo comentario** que se actualiza en cada push (marcador
`<!-- interaction-cost -->`), sube las capturas por paso como artifact y falla el job si algún
flujo empeoró o dejó de completarse.

## 2. Leer el comentario del PR

```
| Flujo                        | Base | Este cambio | Overhead / presupuesto | Resultado |
| Registrar cotización enviada |   11 |          13 | 9/5 ⚠️                 | ❌ sube 2 |

- Paso 7 (click Enviada): 3 → 5 (+1 modal)
  - ⚠️ Nuevo en el paso 7: Apareció un diálogo nativo (confirm/alert): prefiere deshacer.
```

- **❌ sube N**: el flujo cuesta más. El detalle dice en qué paso y por qué (modal, pantalla, campo,
  decisión, scroll). Casi siempre la solución está en el catálogo: deshacer en lugar de confirmar,
  default en lugar de campo, acción en contexto en lugar de pantalla nueva.
- **❌ ya no se completa**: el flujo no encontró un elemento. O se rompió la tarea (grave), o cambió un
  texto o rol a propósito (entonces actualiza el `flow.json` en el mismo PR).
- **🐢**: una respuesta pasó el umbral de 400 ms.
- **✅ baja N**: bien. Actualiza la línea base para que la mejora quede protegida.

## 3. Cuándo se acepta un aumento

Un aumento es aceptable solo si es **intencional y está explicado**: regulación (consentimiento,
datos fiscales), seguridad (confirmar una transferencia), o una decisión que debe ser consciente
(borrado masivo irreversible). En ese caso el PR:

1. Explica en la descripción qué aumentó y por qué no hay alternativa (¿se probó deshacer? ¿default?).
2. Actualiza la línea base con `--update-baseline` y commitea el cambio de `ux/baseline/`.

Así, cada aumento queda registrado en el historial con su razón.

## 4. Revisión del diff: señales de costo agregado

Cuando no hay flujo para la pantalla tocada, o para revisar antes de que corra CI, busca estas señales
en el diff. Cada una tiene la pregunta que debes hacer y la alternativa habitual.

| Señal en el código | Qué suele significar | Pregunta | Alternativa |
|---|---|---|---|
| `confirm(`, `AlertDialog`, `useConfirm`, "¿Está seguro?" alrededor de una acción reversible | +2 por modal en cada uso | ¿Es irreversible y costosa? | Aplicar + toast con "Deshacer" |
| `required`, validaciones nuevas, campo nuevo en un formulario existente | +2 por campo | ¿El sistema lo sabe o lo puede deducir? ¿Se puede pedir después? | Default, detección, perfil progresivo |
| `router.push` / nueva ruta / paso nuevo en un wizard dentro del flujo | +3 por pantalla | ¿Cabe en la pantalla actual? | Panel lateral, sección colapsable, edición en línea |
| Acción movida a `DropdownMenu` / "…" / menú de overflow | +1 click y menor descubribilidad | ¿Es frecuente? | Dejarla visible; mover lo raro, no lo frecuente |
| `<select>` con lista larga sin búsqueda, o de 2 opciones | +2 decisión o +1 click innecesario | ¿Cuántas opciones reales? | Combobox con búsqueda; toggle o segmentado |
| Se eliminó un `defaultValue`, `autoFocus`, `autocomplete` o "recordar última elección" | +campo o +click en cada uso | ¿Por qué se quitó? | Restaurar o justificar |
| Se eliminó un atajo de teclado o un `onKeyDown` | El experto pierde velocidad | ¿Hay reemplazo? | Mantener o documentar |
| Botón primario pasa a `disabled` hasta completar algo | El usuario no sabe qué falta | ¿Se explica qué falta? | Habilitado + validación que dice qué corregir |
| Guardado explícito donde había autosave | +1 click por edición | ¿Qué riesgo justifica el cambio? | Autosave + indicador "Guardado" |
| Spinner de página completa / `await` antes de mostrar el cambio | Espera > 400 ms | ¿Se puede actualizar de forma optimista? | Optimistic UI + reintento |
| Toast de éxito que reemplaza a uno con "Deshacer" | Se perdió la red de seguridad | ¿Por qué se quitó el deshacer? | Mantener la acción |
| Paginación nueva en una lista que se revisa completa | +1 click por página + scroll | ¿Cuántos registros reales? | Scroll virtual, filtros, vistas guardadas |
| Texto de botón genérico ("Aceptar", "Enviar", "Continuar") | Duda antes de actuar (+3) | ¿Dice el resultado? | Verbo + objeto (ver `microcopy.md`) |
| `hover:` como única forma de ver una acción en móvil | Inalcanzable en táctil | ¿Hay alternativa táctil? | Visible en `(hover: none)` |
| Re-render de lista completa al guardar (innerHTML, key por índice) | Clicks perdidos durante la edición | ¿Las keys son estables? | Keys por id; repetir el objetivo del click |

**Al quitar una confirmación, di siempre qué la reemplaza.** Borrarla sin red de seguridad no es la
corrección completa: en una creación, toast "Cliente creado · Deshacer" (borra el recién creado); en una
edición, Deshacer que restaura el valor anterior; si es irreversible, confirmación con la consecuencia.

**Revisa también el dominio, no solo la UX.** Catálogos oficiales vigentes (p. ej. claves fiscales que
ya no existen), `<option>` sin `value` que mandan la etiqueta en vez de la clave, formatos (RFC, CURP,
fechas) y cualquier cambio en lo que el componente envía a la API. Si tu versión corregida cambia el
contrato con el backend, dilo explícitamente como hallazgo.

Estima el impacto con los pesos del CI (click 1 · campo 2 · decisión 2 · modal 2 · pantalla 3 ·
duda 3) y multiplícalo por la frecuencia: +2 en una tarea diaria de 40 usuarios son ~80 interacciones
extra por día.

## 5. Formato del comentario de revisión

Un comentario por hallazgo, en el archivo y línea exactos, con este orden:

```
[+2 CI · tarea diaria] Este confirm() agrega un modal cada vez que se cambia un estado, y el cambio
es reversible. Propuesta: aplicar al instante y mostrar toast "Estado: Ganada · Deshacer" (ya existe
useUndoable). Si el cambio dispara algo irreversible (factura, correo al cliente), entonces sí
confirmar, pero diciendo la consecuencia: "Se enviará la factura a Grupo Norte".
```

Es decir: impacto estimado, qué pasa, por qué cuesta, alternativa concreta y la excepción válida.
Si no hay hallazgos, no comentes: el silencio también es información.

## 6. Integrarlo en la revisión de Claude (REVIEW.md)

Si el repo usa revisión automática con Claude, pega el contenido de `assets/ci/REVIEW.interaction.md`
en su `REVIEW.md` (o `CLAUDE.md`). Hace que cada revisión busque las señales de la sección 4 y lea el
comentario de `interaction-cost` si existe.
