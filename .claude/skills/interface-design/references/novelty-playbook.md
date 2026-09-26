# Novelty playbook — lo novedoso que sí sirve

Lo novedoso tiene una sola prueba: **¿sigue siendo bueno en el uso número 100?** Si solo encanta la
primera vez, es un truco. Cada propuesta novedosa debe reducir esfuerzo, aclarar algo o dar
confianza — idealmente las tres.

Contenido:
1. Cómo elegir el momento firma
2. Patrones nativos de IA
3. Patrones de interacción frescos
4. Detalles de oficio que elevan
5. Generadores de ideas
6. Lista negra

---

## 1. Cómo elegir el momento firma

Elige **1 o 2** por producto, no diez. El momento firma vive en la tarea #1 o en el momento de éxito
(Ley pico-final). Fórmula:

> **Momento firma = la acción más repetida × la forma más directa posible de hacerla × un detalle
> sensorial que confirma que salió bien.**

Ejemplo: en un CRM, mover un trato de etapa es la acción más repetida → arrastrar la tarjeta (directo) →
la columna destino "respira" y el total del pipeline se anima al nuevo valor (confirmación).

Declara el momento firma en la entrega con: qué es, qué esfuerzo ahorra, cómo se ve.

## 2. Patrones nativos de IA (integrada en el flujo, no pegada al lado)

| Patrón | Qué hace | Ahorro |
|---|---|---|
| **Ghost text** | Sugerencia gris en el campo; Tab acepta, sigue escribiendo para ignorar | Teclear |
| **Lenguaje natural → estructura** | "Junta con Ana el jueves a las 5" crea el evento con campos llenos y editables | Varios campos y decisiones |
| **Filtros en lenguaje natural** | Escribe la pregunta, se convierte en chips de filtro visibles y editables | Construir filtros |
| **Resumen en contexto** | Al abrir un registro largo, 3 líneas de "qué pasó y qué sigue" | Leer historial |
| **Siguiente acción sugerida** | Botón que propone el paso probable con los datos ya llenos | Decidir + capturar |
| **Captura desde lo que ya existe** | Arrastrar un PDF, foto de ticket o correo y extraer los datos | Capturar todo |
| **Relleno en lote** | Seleccionar filas → "Completar con IA" categoriza o enriquece | Trabajo repetitivo |
| **Explicar esto** | Hover/⌘K sobre un número o gráfico da el porqué en lenguaje humano | Interpretar |

Reglas: la IA propone, el usuario dispone (siempre editable antes de aplicar); muestra de dónde salió
la sugerencia cuando importa; el camino manual sigue existiendo; nunca bloquees esperando a la IA.

## 3. Patrones de interacción frescos

- **Paleta de comandos con acciones y objetos**: ⌘K busca pantallas, registros y acciones ("crear
  cotización para Grupo Norte") en un solo lugar.
- **Peek**: mantener presionado o hover prolongado abre un preview flotante sin navegar.
- **Spatial canvas**: para relaciones (mapas, flujos, organigramas), un lienzo con zoom semántico que
  muestra más detalle al acercarse.
- **Scrubbing numérico**: arrastrar horizontalmente sobre un número para ajustarlo (precios, cantidades).
- **Timeline scrubber**: deslizar sobre una línea de tiempo para ver el estado en cualquier fecha.
- **Estado vivo en la pestaña/ícono**: contador o estado en el favicon/título para no tener que volver.
- **Multiselección con lazo** en vistas de tarjetas o mapas.
- **Split & stack**: abrir varios registros como pestañas apiladas dentro de la app para comparar.
- **Undo con línea de tiempo**: historial de cambios navegable, cada punto restaurable.
- **Formularios conversacionales solo para móvil y flujos cortos**: una pregunta a la vez con respuesta
  rápida por chips, nunca para captura operativa.
- **Presencia en vivo**: avatares de quién ve/edita el mismo registro, cursores en colaboración.

## 4. Detalles de oficio que elevan (baratos y muy notorios)

- Números que se animan al cambiar (count-up de 250 ms, tabular-nums para que no bailen).
- Skeletons con la forma exacta del contenido real.
- Transiciones compartidas: la tarjeta se expande hasta convertirse en el detalle (view transitions API).
- Foco visible hermoso (anillo de 2 px con offset en color de acento), no el default del navegador.
- Toast apilable con progreso de auto-cierre y "Deshacer".
- Estados vacíos con ilustración mínima de línea y una acción clara.
- Atajos visibles como `<kbd>` en tooltips y menús: enseñan sin tutorial.
- Microcopy con personalidad en momentos de éxito, sobrio en errores.
- Selección de texto con color de marca (`::selection`).
- Cursor contextual (grab en arrastrables, copy al mantener Alt).

## 5. Generadores de ideas

Cuando la propuesta salga genérica, pasa la tarea #1 por estas preguntas:

- **Sustracción**: ¿qué pasa si quito esta pantalla por completo? ¿Dónde viviría su función?
- **Inversión**: en lugar de que el usuario busque, ¿qué pasa si el sistema le trae lo que necesita?
- **Analogía lejana**: ¿cómo lo resolvería un videojuego, una cabina de avión, una app de música?
- **Cero UI**: ¿se puede resolver con una notificación, un atajo o una automatización sin abrir la app?
- **Un solo gesto**: si solo pudiera hacer UNA acción física, ¿cuál sería?
- **10×**: si el usuario hiciera esto 10 veces más seguido, ¿qué rediseñaría?

## 6. Lista negra (parece novedoso, empeora el producto)

- Glassmorphism, neumorphism o gradientes como relleno sin función.
- Glows morados/neón genéricos de "IA".
- Scrolljacking y parallax en herramientas de trabajo.
- Chatbot como sustituto de una interfaz bien diseñada.
- Animaciones de entrada en cada elemento de cada pantalla.
- Iconos ambiguos sin texto para "verse limpio".
- Cursores personalizados que retrasan la precisión.
- Carruseles para contenido que el usuario necesita comparar.
- Onboarding de 6 pantallas antes de dejar usar el producto.
