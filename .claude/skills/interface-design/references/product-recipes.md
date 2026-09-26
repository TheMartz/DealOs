# Recetas por tipo de producto

Cada tipo de producto cambia qué es "esfuerzo". En un CRM el enemigo es la captura, en un punto de
venta los segundos frente al cliente, en una bodega los guantes y la señal. Lee la receta que aplique
**antes** del paso 3 del proceso (eliminar antes de diseñar), y úsala junto con el catálogo de patrones.

Contenido:
1. CRM y ventas
2. Punto de venta (POS)
3. Bodega, planta y campo
4. Panel de administración y back office
5. App móvil de un solo gesto
6. Productos híbridos

Cada receta tiene: contexto real · tarea #1 y presupuesto · pantalla que gana · patrones clave ·
momento firma · estados especiales · antipatrones · métrica que manda · cómo probarlo.

---

## 1. CRM y ventas

**Contexto real.** Vendedores que odian capturar: el CRM compite contra WhatsApp, el Excel propio y la
memoria. Si registrar cuesta más que no registrar, no registran y el CRM muere con datos viejos.
Uso diario, entre llamadas, mitad escritorio y mitad celular.

**Tarea #1 y presupuesto.** "Registrar lo que pasó con un cliente y qué sigue" (llamada, visita,
cotización). Overhead ≤ 3 en escritorio y ≤ 4 en móvil. La segunda tarea es "¿qué atiendo hoy?", y
debe responderse sin un solo click: es la pantalla de entrada.

**Pantalla que gana.**
- Inicio = **Hoy**: seguimientos vencidos, tratos sin movimiento en N días y citas del día, cada uno con
  su acción al lado (llamar, WhatsApp, reagendar), no un tablero de KPIs.
- Pipeline en kanban por etapa con total por columna. Mover de etapa = arrastrar, con alternativa de
  teclado y menú.
- Ficha del cliente: resumen de 3 líneas arriba (qué pasó y qué sigue), actividad en línea de tiempo
  abajo, todo editable en línea.

**Patrones clave.** Captura rápida desde cualquier lugar (⌘K → "Llamada con Ana: pide descuento,
seguimiento el jueves" → se crea la actividad y la tarea con fecha); sincronización de correo y
calendario en lugar de captura; detección de duplicados al escribir el nombre; "guardar y crear
seguimiento" como un solo paso; defaults del contexto (desde la ficha, el cliente ya va lleno).

**Momento firma.** Al cerrar una llamada en el celular, una notificación "¿Cómo te fue con Grupo
Norte?" con 3 respuestas rápidas y nota por voz, transcrita y resumida. Cero pantallas.

**Estados especiales.** Trato sin actividad (se enfría con color y antigüedad visible), cliente
duplicado probable, cuota del mes (progreso con meta), vacío del primer día con datos de ejemplo.

**Antipatrones.** Formularios de 20 campos para crear un prospecto; etapas que obligan a llenar
campos para avanzar (el vendedor pone basura); dashboards para el director en la home del vendedor;
reportes en lugar de listas accionables.

**Métrica que manda.** % de actividades registradas el mismo día y antigüedad promedio del último
movimiento por trato. Si bajan, el CRM está costando demasiado.

**Cómo probarlo.** Persona "vendedor con prisa" en móvil (390×844), tarea: "registra que Ana pidió
10% de descuento y que la llamas el jueves". Flujo medido de la captura rápida con `frequency: diaria`.

---

## 2. Punto de venta (POS)

**Contexto real.** Cajero con fila enfrente, cliente mirando, ruido, a veces pantalla táctil y a veces
teclado con escáner. Cada segundo se multiplica por miles de tickets. El cajero rota: el sistema debe
enseñarse solo en un turno.

**Tarea #1 y presupuesto.** "Cobrar un ticket": escanear o buscar productos, cobrar y entregar.
Overhead ≤ 2 por producto y ≤ 3 para cobrar en efectivo exacto o con tarjeta. Respuesta de cada
escaneo < 100 ms: aquí el umbral Doherty es 4 veces más estricto.

**Pantalla que gana.**
- Una sola pantalla: el campo de escaneo/búsqueda **siempre con foco**, el ticket siempre visible a la
  derecha con total grande, y una cuadrícula de favoritos táctiles (productos sin código: pan, frutas,
  cortes a granel).
- Cobrar = un botón enorme con el total ("Cobrar $1,284"), que abre los métodos de pago como botones
  grandes, con el efectivo exacto y los billetes más probables precalculados ("$1,300", "$1,500").

**Patrones clave.** Multiplicador antes de escanear (`3 *` y escaneo = 3 piezas); peso desde la
báscula sin teclear; búsqueda por código, nombre o PLU en el mismo campo; teclas de función para
métodos de pago; pago dividido; ticket en espera para atender a otro cliente; modo offline con cola.

**Fricción intencional.** Cancelar una línea o todo el ticket, devoluciones y descuentos manuales
piden PIN de supervisor. Aquí la fricción protege dinero; se justifica y se nota.

**Momento firma.** El cambio a entregar aparece gigante con la combinación sugerida de billetes y
monedas ("1 billete de $200 + 1 moneda de $10"). Elimina el cálculo mental y los errores de caja.

**Estados especiales.** Sin conexión (vende y sincroniza después, con indicador discreto), producto
no encontrado (crear rápido o buscar por nombre sin perder el ticket), báscula desconectada,
impresora sin papel, corte de caja.

**Antipatrones.** Modales de confirmación por cada producto; foco que se pierde tras un aviso (el
siguiente escaneo cae en la nada); animaciones en el ticket; buscar clientes antes de poder vender.

**Métrica que manda.** Segundos por ticket y errores de caja por turno.

**Cómo probarlo.** Flujo medido de un ticket de 5 productos (escaneo simulado = `type` del código + Enter
en el campo con foco). Persona "cajero de reemplazo en su primer turno" para descubribilidad.

---

## 3. Bodega, planta y campo

**Contexto real.** Operadores con guantes, en cámaras de frío con condensación, bajo sol directo o en
naves ruidosas; tabletas montadas en montacargas, terminales con escáner integrado, celulares
compartidos entre turnos; señal intermitente. No pueden leer párrafos ni apuntar con precisión.

**Tarea #1 y presupuesto.** "Registrar un movimiento" (recibir, surtir, mover, contar, inspeccionar).
Overhead ≤ 3 por movimiento, y **cero campos de texto libre** en el camino normal: todo se escanea, se
elige de pocas opciones o se ajusta con botones.

**Pantalla que gana.**
- **Una tarea por pantalla**, con la instrucción en grande ("Escanea la tarima"), el dato clave en
  64-96 px y un solo botón primario a todo lo ancho en la zona inferior.
- Targets ≥ 56 px (≥ 64 px con guantes gruesos) y separación ≥ 12 px en **todo** control tocable,
  incluidos contadores del encabezado, Deshacer, Cancelar y volver. Texto base ≥ 18 px.
- Contraste alto (≥ 7:1 para lo esencial) y modo "exterior" de fondo claro con texto negro; el modo
  oscuro se lee mal bajo el sol.

**Patrones clave.**
- **Escáner primero**: los lectores actúan como teclado. Mantén un campo de captura siempre activo e
  identifica ráfagas de teclas que terminan en Enter como lectura, con cualquier pantalla abierta.
- Cantidades con botones grandes (−/+ y atajos de 1, 5, 10, caja completa) o teclado numérico propio
  en pantalla, nunca el teclado del sistema.
- **Offline primero**: cada acción se guarda local y entra a una cola visible ("3 pendientes de
  sincronizar"), con reintento automático. El operador nunca espera a la red.
- Confirmación multisensorial: destello de color en toda la pantalla, sonido distinto para éxito y
  error, y vibración. En el ruido, el color es lo que se ve; el sonido, lo que se oye al no mirar.
- Estado que sobrevive interrupciones: si suena el radio y se bloquea la pantalla, al volver sigue en
  el mismo paso con lo ya escaneado.
- Inicio de sesión por gafete o PIN corto; cambio de operador en 1 paso.

**Momento firma.** "Surtido guiado": la pantalla muestra solo la siguiente ubicación en letras
enormes, el producto con foto y la cantidad; al escanear la ubicación correcta todo destella verde y
avanza solo. Al escanear la equivocada, rojo, un sonido grave y qué ubicación era la correcta.

**Estados especiales.** Sin señal (normal, no error), escaneo inválido (dice por qué: "Esta tarima ya
se recibió a las 10:42"), batería baja, lote vencido o bloqueado por calidad, discrepancia de conteo
(pide recontar antes de ajustar).

**Antipatrones.** Menús de hamburguesa; tablas de 10 columnas; gestos finos (pinch, swipe corto);
hover; textos grises claros; pedir confirmar cada escaneo; bloquear la pantalla mientras sincroniza;
formularios pensados para escritorio encogidos a móvil.

**Métrica que manda.** Movimientos por hora por operador y tasa de errores (escaneos equivocados,
ajustes de inventario).

**Cómo probarlo.** `flow_meter.js explore` con `--viewport 800x1280` (tableta) o `390x844`; persona
"operador con guantes en cámara de frío, lo interrumpen a mitad de tarea", instruida para usar solo
toques y no escribir texto libre. En la plantilla, activa la densidad táctil (`data-density="touch"`)
para probar targets grandes.

---

## 4. Panel de administración y back office

**Contexto real.** Personal interno (soporte, operaciones, finanzas) que resuelve casos todo el día.
Tolera densidad, necesita potencia, y comete errores caros si la interfaz confunde entidades o
permisos. Escritorio, pantallas grandes, mucho teclado.

**Tarea #1 y presupuesto.** "Encontrar un registro y resolver algo sobre él" (buscar un pedido,
corregir un dato, reembolsar, reasignar). Overhead ≤ 5, casi todo en búsqueda y acción en contexto.

**Pantalla que gana.**
- Búsqueda global ⌘K que acepta ID, correo, teléfono o nombre y abre el registro directo.
- Tabla densa con filtros como chips, vistas guardadas por equipo, columnas configurables y panel
  lateral de detalle (split view) para revisar una fila tras otra sin perder la lista.
- Detalle con el estado arriba, acciones frecuentes visibles, historial y auditoría abajo.

**Patrones clave.** Acciones masivas con barra flotante; edición en línea; pegar una lista de IDs
para filtrar; exportar lo que se ve; deep links para compartir un caso; "ver como este usuario" para
soporte; plantillas de respuesta; atajos j/k/x/e visibles en tooltips.

**Fricción intencional.** Zona de peligro separada visualmente; acciones destructivas masivas piden
escribir el número de registros o el nombre; reembolsos por encima de un monto piden segunda
aprobación. Todo queda en la auditoría.

**Momento firma.** Un panel de contexto que al abrir un caso reúne lo que soporte busca en 5
pestañas: resumen del cliente, últimos pedidos, tickets previos y alertas ("3 reembolsos este mes").

**Estados especiales.** Sin permiso (dice qué rol lo tiene y a quién pedirlo), registro bloqueado por
otro usuario (presencia en vivo), exceso de resultados (pide filtrar antes de renderizar 10 mil filas),
cambio pendiente de aprobación.

**Antipatrones.** Un menú lateral de 40 opciones; formularios de edición en modal que pierden la
lista; IDs internos sin forma de copiar; confirmaciones idénticas para lo trivial y lo destructivo.

**Métrica que manda.** Tiempo de resolución por caso y errores operativos (cambios revertidos).

**Cómo probarlo.** Flujo medido con `frequency: diaria` para "encontrar el pedido 48213 y
reembolsarlo"; persona "agente de soporte con 12 casos en cola" enfocada en velocidad.

---

## 5. App móvil de un solo gesto

**Contexto real.** Uso de segundos, con una mano, caminando o en transporte, con atención
fragmentada. La app compite con notificaciones de otras 50. Si la acción principal no cabe en un
gesto, se abandona.

**Tarea #1 y presupuesto.** La acción que justifica la app (registrar un gasto, marcar asistencia,
aprobar una solicitud, pedir lo de siempre). Overhead ≤ 2 desde que abre la app, y ≤ 1 desde una
notificación o widget.

**Pantalla que gana.**
- La acción principal ocupa la zona del pulgar (tercio inferior), grande, sin menús previos.
- Lo demás en una barra inferior de máximo 4-5 destinos.
- Formularios reemplazados por defaults y chips: "Comida · $150 · Tarjeta" prellenados según hora,
  ubicación e historial, editables con un toque.

**Patrones clave.** Cero UI (acciones desde la notificación, widget, atajo del sistema o
reconocimiento de voz); gesto principal con alternativa visible (swipe para aprobar + botón
"Aprobar"); vibración al confirmar; deshacer en toast; offline con cola; aprendizaje de defaults.

**Momento firma.** Mantener presionado el botón principal para registrar por voz ("150 de comida con
tarjeta"), soltar para guardar. Un gesto, cero pantallas.

**Estados especiales.** Sin conexión, permiso denegado (cámara, ubicación) con alternativa manual,
primera vez (la acción funciona con datos de ejemplo antes de pedir registro).

**Antipatrones.** Onboarding de 5 pantallas antes de la primera acción; registro obligatorio antes
de probar; hamburguesas; acciones clave arriba a la izquierda (fuera del pulgar); gestos sin pista
visual.

**Métrica que manda.** Tiempo desde abrir la app (o la notificación) hasta completar la acción, y
retención a 7 días.

**Cómo probarlo.** `explore` con `--viewport 390x844` (activa `hasTouch`); persona "caminando con
el café en la otra mano". El flujo medido debe arrancar desde la pantalla en que abre la app.

---

## 6. Productos híbridos

Muchos productos combinan tipos. Diseña cada superficie con su receta y comparte datos, no pantallas:

- **CRM + campo**: la ficha de escritorio es densa; la del vendedor en ruta es de un gesto (captura
  rápida y check-in de visita).
- **Back office + bodega**: la supervisora trabaja en tabla densa; el operador, una tarea por pantalla
  con escáner. Son dos interfaces para el mismo inventario.
- **POS + administración**: el cajero no debe ver nunca la complejidad de precios y promociones; el
  gerente la configura en el back office.

La prueba de que dividiste bien: cada persona corre su tarea #1 dentro de su presupuesto, en su
dispositivo y con sus condiciones reales.
