# Heurísticas, leyes y rúbrica de auditoría

Úsalo para auditar interfaces existentes (capturas, código, URLs) y para justificar decisiones con
algo más que gusto.

---

## Leyes que más deciden

| Ley | Qué dice | Cómo se aplica |
|---|---|---|
| **Hick** | Más opciones = más tiempo para decidir | Agrupa, prioriza, oculta lo raro, recomienda una opción |
| **Fitts** | Objetivos grandes y cercanos se alcanzan más rápido | Acción frecuente = grande y cerca; destructiva = pequeña y lejos; targets ≥ 44 px |
| **Jakob** | La gente espera que tu app funcione como las que ya usa | Innova en el problema, no en convenciones (scroll, cerrar, buscar) |
| **Miller** | La memoria de trabajo es limitada (~4-7 elementos) | Agrupa en bloques; no pidas recordar entre pantallas |
| **Doherty** | Respuesta < 400 ms mantiene el flujo | Optimistic UI, skeletons, precarga |
| **Tesler** | La complejidad no desaparece: alguien la absorbe | Que la absorba el sistema, no el usuario |
| **Postel** | Sé liberal en lo que aceptas | Acepta fechas, teléfonos, montos en cualquier formato |
| **Pico-final** | Se recuerda el mejor momento y el final | Cuida el momento de éxito: feedback claro y satisfactorio |
| **Von Restorff** | Lo distinto se recuerda | Solo un elemento destaca: la acción primaria |
| **Gradiente de meta** | Se acelera cerca de la meta | Muestra progreso en flujos de varios pasos |
| **Proximidad (Gestalt)** | Lo cercano se percibe relacionado | Agrupa con espacio antes que con bordes |

## Las 10 heurísticas de Nielsen, en clave de esfuerzo

1. **Estado visible** — ¿el usuario sabe qué está pasando sin preguntar?
2. **Lenguaje del usuario** — ¿palabras de su dominio, no del backend?
3. **Control y libertad** — ¿deshacer, cancelar, salir sin perder nada?
4. **Consistencia** — ¿lo mismo se ve y se comporta igual en todo el producto?
5. **Prevención de errores** — ¿el diseño hace imposible el error común?
6. **Reconocer antes que recordar** — ¿las opciones están a la vista?
7. **Flexibilidad y eficiencia** — ¿hay atajos para el experto?
8. **Estética y minimalismo** — ¿cada elemento se gana su lugar?
9. **Recuperación de errores** — ¿el error dice qué pasó y cómo arreglarlo?
10. **Ayuda** — ¿la ayuda está en contexto, no en un manual?

## Rúbrica de auditoría (0-4 por dimensión)

| Dimensión | 0 | 2 | 4 |
|---|---|---|---|
| **Claridad** | No se entiende qué hacer | Se entiende con esfuerzo | Obvio en 5 s |
| **Economía de interacción** | CI > 2× presupuesto | Dentro de 1.5× | Dentro del presupuesto |
| **Jerarquía visual** | Todo pesa igual | Hay jerarquía pero compite | Un foco claro por pantalla |
| **Feedback y estados** | Solo el estado feliz | Algunos estados | Vacío, carga, error, éxito, permisos |
| **Eficiencia experta** | Sin atajos | Algunos atajos | ⌘K, atajos, masivos, vistas guardadas |
| **Accesibilidad** | Falla contraste/teclado | Parcial | WCAG AA, teclado completo, foco visible |
| **Estética y criterio** | Genérico o descuidado | Correcto pero intercambiable | Con identidad propia coherente al dominio |

Entrega la puntuación como tabla + los **5 problemas más caros** ordenados por (esfuerzo que causan ×
frecuencia × usuarios afectados), cada uno con: qué pasa, por qué cuesta, y la corrección concreta con el
patrón del catálogo que la resuelve.

## Cómo auditar una captura

1. Identifica la tarea #1 probable de esa pantalla y declárala.
2. Recorre la tarea con la vista: ¿dónde va el ojo primero? ¿es ahí donde debería?
3. Cuenta el CI de la tarea #1 tal como está.
4. Busca: acciones escondidas, opciones que compiten, texto técnico, estados ausentes, targets pequeños,
   contraste bajo, elementos que no se ganan su lugar.
5. Propón el rediseño con CI después y un boceto/prototipo, no solo la lista.
