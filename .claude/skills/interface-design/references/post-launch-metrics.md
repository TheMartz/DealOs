# Métricas después de lanzar: el CI real contra el diseñado

El diseño se midió con `flow_meter.js` en la ruta óptima. En producción la gente toma otras rutas,
duda, abandona y usa dispositivos que no probaste. Esta guía cierra el ciclo: medir en campo con los
mismos pesos, comparar contra lo diseñado y convertir la diferencia en la siguiente decisión de
diseño.

Contenido:
1. Qué medir y por qué
2. Instrumentar con ux-tracker
3. Dónde marcar inicio, pasos y fin
4. Analizar: script y tablero
5. Cómo leer las diferencias
6. Consultas SQL para tu almacén de datos
7. Alertas y ritmo de revisión
8. Privacidad y límites

---

## 1. Qué medir y por qué

| Métrica | Definición | Pregunta que responde |
|---|---|---|
| **Éxito** | completadas ÷ iniciadas | ¿La gente logra la tarea? |
| **Tiempo p50 / p90** | duración de las completadas | ¿Cuánto le cuesta en tiempo? El p90 muestra a los que batallan |
| **CI real (mediana)** | clicks + teclas + 2·campos + 2·modales + 3·pantallas | ¿Cuánto esfuerzo mecánico cuesta de verdad? |
| **Brecha contra el diseño** | CI real ÷ CI diseñado − 1 | ¿La gente encuentra la ruta corta? |
| **Overhead real** | CI − 2·campos | ¿Se cumple el presupuesto por frecuencia de uso? |
| **Abandono por último paso** | `last_step` de las abandonadas | ¿Dónde se rinde la gente? |
| **Tasa de Deshacer** | completadas con al menos un Deshacer | ¿Hay defaults o etiquetas que llevan al error? |
| **Adopción de atajos** | completadas con al menos un atajo | ¿El camino experto se descubre? |
| **Táctil vs escritorio** | CI real por dispositivo | ¿La versión táctil está a la altura? |

El CI de campo **no incluye decisiones, scrolls de búsqueda ni dudas**: no se pueden observar sin
grabar pantallas. Por eso la comparación se hace contra el **CI comparable** del flujo (el mismo cálculo
sin esas partes), que `ux_metrics.py` y el tablero sacan solos del `report.json`.

## 2. Instrumentar con ux-tracker

`assets/metrics/ux-tracker.ts` no tiene dependencias y funciona con cualquier framework. Envía
**solo dos eventos** por tarea: `ux_task_completed` o `ux_task_abandoned`.

```ts
import { createUxTracker, beaconSender } from "@/lib/ux-tracker"

// PostHog / Segment / GA4 / tu endpoint: el tracker solo llama a send()
export const ux = createUxTracker({
  send: e => posthog.capture(e.event, e),          // o beaconSender("/api/ux-events")
  version: process.env.NEXT_PUBLIC_APP_VERSION,     // permite comparar antes/después de cada release
})
```

Con GA4 usa `gtag("event", e.event, e)`; con Segment, `analytics.track(e.event, e)`; con tu propio
backend, `beaconSender(url)` (sobrevive al cierre de la pestaña).

Qué cuenta solo: clicks (pointerdown), teclas que no son texto (Enter, Tab, atajos), campos de texto
distintos que se editaron, modales que aparecen (`dialog`, `role=dialog`, `aria-modal` y `confirm()`
nativo), cambios de pantalla (history, hash y navegación entre páginas del mismo sitio) y errores
visibles (`role=alert`, `aria-invalid`). La tarea se abandona sola tras 10 minutos sin actividad.

Verificado: en la plantilla de la skill, el mismo flujo da **CI 9 con ux-tracker y CI comparable 9
con flow_meter**, por mouse y por teclado.

## 3. Dónde marcar inicio, pasos y fin

- **`start(tarea)`** donde nace la intención: al abrir el formulario, al presionar "Nueva", al entrar a
  la pantalla de la tarea. No al cargar la app.
- **`step(nombre)`** en los hitos que te ayudarían a entender un abandono ("cliente", "monto",
  "estado"). Con 2 a 4 pasos basta.
- **`complete()`** cuando el resultado quedó hecho **en el servidor** (guardado confirmado), no al
  hacer click en guardar.
- **`abandon()`** si el usuario cancela explícitamente. Cerrar la pestaña o la inactividad ya se
  cuentan solas.
- **`ux.mark("undo")`** en tu Deshacer y **`ux.mark("error")`** en errores que no pasan por el DOM.

Usa los **mismos nombres de tarea** que los archivos de flujo (`ux/flows/registrar-cotizacion.json` →
`ux.start("registrar-cotizacion")`). Así el diseño y la realidad se conectan sin configuración.

## 4. Analizar: script y tablero

**Script** (terminal, CI, o para que Claude lo lea):
```bash
python scripts/ux_metrics.py export.jsonl --design ux/baseline/      # los report.json de flow_meter
python scripts/ux_metrics.py export.csv --design design.json --since 2026-08-01 --device touch
python scripts/ux_metrics.py --demo demo.jsonl --design-out design.json   # datos de ejemplo
```
Devuelve la tabla por tarea (estado actual), los hallazgos con su gravedad y la tendencia semanal.
Acepta JSONL, JSON o CSV, y exportaciones de PostHog o Segment con los campos dentro de `properties`.

**Tablero** (`assets/metrics/dashboard.html`): ábrelo en el navegador y arrastra el export y los
`report.json` (o un `design.json`). Nada sale del navegador. Filtros de periodo, dispositivo y versión;
tabla de tareas con estado; indicadores; hallazgos; CI, éxito y tiempo por semana con la marca de
cada release; abandono por paso; distribución del CI con el valor diseñado. Cada gráfica tiene su
tabla equivalente y funciona con teclado. Trae datos de ejemplo para explorar antes de conectar los
tuyos.

El script y el tablero usan las mismas definiciones y dan los mismos números (verificado sobre los
mismos datos).

**Estado actual**: tabla, indicadores y hallazgos usan la versión más reciente cuando tiene al menos
30 tareas. Mezclar versiones esconde el efecto de un release.

## 5. Cómo leer las diferencias

| Señal | Qué suele significar | Siguiente paso |
|---|---|---|
| CI real > diseñado +25% | La gente no encuentra la ruta corta (no ve el atajo, la acción está escondida, el default no aplica) | Corre la persona novata en esa tarea; revisa descubribilidad de la acción clave |
| CI real ≈ diseñado pero éxito < 90% | La ruta se encuentra pero algo bloquea al final (validación, error, permiso) | Mira el paso de abandono y los errores visibles |
| Overhead > presupuesto | El diseño mismo es caro para su frecuencia | Vuelve a la escalera eliminar → automatizar → fusionar |
| Abandono concentrado en un paso | Ese paso tiene la duda más cara | Microcopy del paso, defaults, validación en línea |
| Deshacer > 10% | La gente actúa y se arrepiente: etiqueta ambigua o default equivocado | Revisa textos y defaults de esa acción |
| Atajos < 5% en tarea diaria | El camino experto no se descubre | Atajos visibles en botones, tooltips y menús |
| Táctil +30% | Acciones que dependen de hover, targets pequeños | Receta de móvil/bodega; densidad táctil |
| Mejora tras un release | El cambio funcionó | Actualiza la línea base de `check` para protegerla |
| Empeora tras un release | Regresión que CI no vio (ruta distinta a la del flujo) | Agrega esa ruta como flujo en `ux/flows/` |

La regla de oro: **una diferencia es una pregunta, no una conclusión.** Confírmala con la persona
simulada, con 5 usuarios reales o con una sesión grabada antes de rediseñar.

Espera al menos 30 tareas por segmento antes de juzgar; el tablero y el script lo advierten.

## 6. Consultas SQL para tu almacén de datos

Para una tabla `events(event, task, ts, duration_ms, ci, fields, device, version, last_step, undos, shortcuts)`
(sintaxis PostgreSQL; en BigQuery usa `APPROX_QUANTILES(x, 100)[OFFSET(50)]` y `COUNTIF`, y en PostHog/BigQuery los campos viven en `properties`):

```sql
-- Éxito, tiempo y CI por tarea (últimos 30 días)
select task,
       count(*)                                                        as iniciadas,
       avg(case when event = 'ux_task_completed' then 1 else 0 end)    as exito,
       percentile_cont(0.5) within group (order by duration_ms / 1000.0)
         filter (where event = 'ux_task_completed')                    as tiempo_p50_s,
       percentile_cont(0.5) within group (order by ci)
         filter (where event = 'ux_task_completed')                    as ci_p50,
       percentile_cont(0.5) within group (order by ci - 2 * fields)
         filter (where event = 'ux_task_completed')                    as overhead_p50
from events
where ts >= current_date - interval '30 days'
group by task
order by iniciadas desc;

-- Dónde abandonan
select task, coalesce(last_step, 'sin paso marcado') as paso, count(*) as abandonos
from events
where event = 'ux_task_abandoned' and ts >= current_date - interval '30 days'
group by 1, 2
order by task, abandonos desc;

-- Antes / después por versión
select task, version,
       count(*) as n,
       percentile_cont(0.5) within group (order by ci) filter (where event = 'ux_task_completed') as ci_p50,
       avg(case when event = 'ux_task_completed' then 1 else 0 end) as exito
from events
group by task, version
order by task, min(ts);
```

En PostHog puedes usar estas mismas consultas en HogQL (`properties.ci`, `properties.task`…) o
exportar a CSV y pasarlo por `ux_metrics.py`.

## 7. Alertas y ritmo de revisión

- **Semanal**: corre `ux_metrics.py` sobre la última semana y revisa los hallazgos 🔴 y 🟡.
- **Tras cada release**: compara por versión (tablero, filtro Versión) a los 3-5 días.
- **Alertas sugeridas**: éxito < 85% en una tarea diaria; CI real > diseñado +40%; abandono de un
  paso > 50% de los abandonos. Configúralas en tu herramienta de analítica sobre las consultas de arriba.
- **Cierra el ciclo**: cada hallazgo confirmado se convierte en un cambio de diseño, un flujo nuevo en
  `ux/flows/` (para que `check` lo proteja) y, tras el release, en una línea base nueva.

## 8. Privacidad y límites

- ux-tracker **no captura** texto, valores de campos, selectores, URLs completas ni identificadores
  del usuario. Si tu herramienta agrega un ID de persona, aplica la política de privacidad de tu
  producto y considera muestrear (`send` puede descartar un porcentaje de eventos).
- Las métricas dicen **qué** y **dónde**, no **por qué**. El porqué sale de las pruebas con personas y
  de hablar con usuarios.
- Tareas con pocos datos, cambios de temporada o de mezcla de usuarios pueden mover las medianas sin
  que el diseño cambie. Compara segmentos equivalentes (mismo dispositivo, mismo periodo del mes).
