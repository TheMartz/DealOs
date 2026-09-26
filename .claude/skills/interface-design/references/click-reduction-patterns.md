# Catálogo de patrones para reducir esfuerzo

Organizado por la escalera del SKILL.md. Cada patrón indica **cuándo sí** y **cuándo no**: un patrón
aplicado fuera de contexto crea más fricción de la que quita.

Contenido:
1. Eliminar — el sistema ya sabe
2. Automatizar — que ocurra solo
3. Fusionar — dos pasos en uno
4. Acercar — la acción donde está la atención
5. Acelerar — el camino del experto
6. Hacer obvio — cuando el paso debe existir
7. Formularios: reglas rápidas
8. Recetas por tipo de pantalla

---

## 1. Eliminar — el sistema ya sabe

| Patrón | Qué hace | Cuándo sí | Cuándo no |
|---|---|---|---|
| **Defaults inteligentes** | Prellenar con la opción más probable (última usada, más común, deducida del contexto) | Casi siempre | Cuando el default equivocado causa daño silencioso (montos, destinatarios) |
| **Recordar la última elección** | Filtro, vista, orden, bodega, moneda persisten entre sesiones | Preferencias de trabajo | Decisiones que cambian cada vez |
| **Deducir del contexto** | Si crea desde la ficha del cliente, el cliente ya va lleno | Creación desde un objeto padre | — |
| **Detectar en lugar de preguntar** | País por teléfono, banco por CLABE, tipo de archivo por extensión, ciudad por CP | Datos derivables | Cuando la detección falla seguido: ofrece corregir en línea |
| **Eliminar el campo** | Preguntarse "¿qué pasa si no lo pedimos?" | Campos "por si acaso" | Datos legalmente obligatorios |
| **Pedir después** | Diferir lo no urgente al momento en que se necesita (perfil progresivo) | Onboarding, registro | Cuando después es más caro de obtener |
| **Login sin contraseña** | Magic link, passkey, SSO | Apps de uso no diario | Contextos sin acceso al correo |

## 2. Automatizar — que ocurra solo

| Patrón | Qué hace | Cuándo sí | Cuándo no |
|---|---|---|---|
| **Autosave** | Guarda al cambiar, muestra "Guardado hace 2 s" | Documentos, configuraciones, borradores | Transacciones que deben ser conscientes (publicar, enviar, pagar) |
| **Optimistic UI** | Refleja el cambio al instante, sincroniza en segundo plano, revierte con aviso si falla | Acciones con >95% de éxito | Pagos o acciones irreversibles |
| **Autocompletar predictivo** | Sugiere mientras escribe con historial o IA (ghost text, Tab para aceptar) | Campos de texto repetitivos | Datos sensibles o donde una sugerencia errónea se acepta sin leer |
| **Reglas y automatizaciones** | "Cuando X, haz Y" configurable | Tareas repetitivas del mismo usuario | Usuarios ocasionales (no las configuran) |
| **Sincronización automática** | Importar en vez de capturar (correo, calendario, banco, API) | Datos que ya existen en otro sistema | — |
| **Acciones sugeridas** | El sistema propone el siguiente paso probable ("¿Enviar recordatorio?") | Flujos con siguiente paso predecible | Cuando se equivoca seguido: pierde confianza rápido |

## 3. Fusionar — dos pasos en uno

| Patrón | Qué hace | Cuándo sí | Cuándo no |
|---|---|---|---|
| **Edición en línea** | Click en el valor → se vuelve editable → Enter guarda, Esc cancela | Tablas, fichas, títulos | Cambios con validación compleja o dependencias |
| **Crear y seguir** | "Guardar y crear otro", "Crear y asignar" | Captura en lote | — |
| **Pegar para crear** | Pegar una lista, URL, tabla de Excel o imagen crea los objetos | Importaciones, listas | — |
| **Arrastrar para asignar** | Arrastrar tarjeta a columna/persona/fecha = cambio de estado | Kanban, calendarios, asignación | Como única vía: siempre ofrece alternativa por teclado |
| **Wizard → una página** | Si son <10 campos, una sola vista con secciones | Formularios medianos | Flujos donde cada paso depende del anterior |
| **Búsqueda = navegación** | Un buscador que abre, crea y ejecuta ("Nuevo cliente Juan…") | Productos con >3 secciones | — |
| **Selección + acción inmediata** | Elegir opción ejecuta; sin botón "Aplicar" | Filtros, ordenar, cambiar vista | Cambios costosos de revertir |
| **Crear desde el vacío** | El estado vacío es el formulario (campo inline "Agregar tarea…") | Listas | — |

## 4. Acercar — la acción donde está la atención

| Patrón | Qué hace | Cuándo sí | Cuándo no |
|---|---|---|---|
| **Acciones al hover / swipe** | Botones de fila aparecen al pasar el mouse o deslizar | Listas con 2-4 acciones frecuentes | Si es la acción principal: debe estar siempre visible |
| **Menú contextual** | Click derecho / long press sobre el objeto | Herramientas de uso frecuente | Como único acceso (no es descubrible) |
| **Preview al hover / panel lateral** | Ver el detalle sin salir de la lista (peek) | Listas que se revisan una por una | — |
| **Toolbar flotante de selección** | Al seleccionar, aparece la barra de acciones masivas cerca | Tablas, textos | — |
| **Split view** | Lista + detalle en la misma pantalla | Escritorio, revisión secuencial | Pantallas <1024 px |
| **Acción primaria fija** | Botón principal sticky en móvil, zona del pulgar | Formularios largos en móvil | — |

## 5. Acelerar — el camino del experto

| Patrón | Qué hace | Cuándo sí | Cuándo no |
|---|---|---|---|
| **Paleta de comandos ⌘K** | Buscar y ejecutar cualquier acción por nombre | Productos con muchas acciones | Apps muy simples (sobra) |
| **Atajos de teclado** | j/k navegar, e editar, x seleccionar, / buscar, ? ver atajos | Uso diario | — Siempre muéstralos en tooltips y menús |
| **Acciones masivas** | Seleccionar varios (Shift+click rango) y operar | Operaciones en lote | — |
| **Lenguaje natural** | "Facturas vencidas de Monterrey de más de 50k" → filtro | Filtros complejos | Como único método: mantén filtros visibles |
| **Vistas guardadas** | Guardar combinación de filtros/columnas como vista | Consultas recurrentes | — |
| **Plantillas y duplicar** | Crear a partir de uno existente | Objetos parecidos entre sí | — |
| **Deep links** | Toda vista y filtro tiene URL compartible | Colaboración | — |
| **Recientes y favoritos** | Lo último usado a un click | Navegación entre muchos objetos | — |

## 6. Hacer obvio — cuando el paso debe existir

- **Etiqueta = resultado**: "Enviar cotización a Juan", no "Continuar".
- **Posición esperada** (Ley de Jakob): guardar abajo-derecha en diálogos, cerrar arriba-derecha,
  logo a home, búsqueda arriba.
- **Estado visible**: dónde estoy, qué seleccioné, qué está guardado, qué falta.
- **Validación en línea** al salir del campo, no al enviar.
- **Deshacer siempre** en lugar de confirmar (toast de 5-8 s con "Deshacer").
- **Confirmación solo** para lo irreversible y costoso, y escribiendo el nombre si es destructivo masivo.

## 7. Formularios: reglas rápidas

- Una columna. Etiquetas arriba del campo. Nunca placeholder como etiqueta.
- Campo del tipo correcto: `type="email"`, `inputmode="numeric"`, `autocomplete` en todo lo aplicable.
- 2 opciones → toggle o segmentado; 3-6 → radio/segmentado visible; 7-15 → select; >15 → combobox con búsqueda.
- Fechas: atajos ("Hoy", "Mañana", "Próximo lunes") + lenguaje natural + calendario como respaldo.
- Montos y teléfonos: formato automático mientras escribe; acepta pegado en cualquier formato.
- Opcional marcado como "(opcional)"; obligatorio es el default implícito.
- Enter envía en formularios cortos; foco inicial en el primer campo.
- Errores junto al campo, en lenguaje humano, con cómo corregirlo, sin borrar lo escrito.

## 8. Recetas por tipo de pantalla

**Lista/tabla operativa**: búsqueda arriba con foco por `/`, filtros como chips removibles, vistas
guardadas, acciones de fila al hover, selección con x/Shift+click, barra flotante de acción masiva,
edición en línea, preview en panel lateral, densidad ajustable.

**Crear un registro**: abrir en panel lateral o modal ligero sin perder la lista, defaults del contexto,
campos mínimos + "Más detalles" colapsado, "Crear y otro", autosave de borrador.

**Detalle/ficha**: resumen arriba con lo que responde "¿cómo va esto?", acciones primarias arriba-derecha,
todo editable en línea, actividad/historial abajo, siguiente acción sugerida.

**Checkout/pago**: una página, invitado por defecto, autocompletado de dirección, wallets (Apple/Google Pay)
arriba, resumen siempre visible, sin cupón prominente (distrae).

**Onboarding**: llegar al momento de valor antes de pedir datos; datos de ejemplo precargados; checklist
de 3-5 pasos que se completa haciendo, no leyendo.

**Configuración**: búsqueda dentro de ajustes, autosave por campo, agrupar por tarea del usuario (no por
arquitectura técnica), defaults buenos para que casi nadie tenga que entrar.
