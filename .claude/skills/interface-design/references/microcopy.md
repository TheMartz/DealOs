# Microcopy: los textos de la interfaz son diseño

Un botón que dice "Aceptar" obliga a leer todo el diálogo para saber qué pasará: eso es una duda
(+3 CI). Un error que dice "Error 500" deja al usuario sin salida. Los textos correctos eliminan
dudas, pasos de soporte y errores repetidos, y cuestan cero clicks.

Contenido:
1. Principios
2. Fórmulas por tipo de texto
3. Evita → Usa
4. Voz de marca: tono sin perder claridad
5. Tú o usted
6. Reglas de forma
7. Internacionalización
8. Biblioteca, voz y linter

---

## 1. Principios

1. **Di el resultado, no el mecanismo.** "Enviar cotización a Grupo Norte", no "Procesar".
2. **La palabra del usuario, no la del sistema.** "Cliente", no "entidad"; "cotización", no "registro".
3. **Siempre una salida.** Todo error y todo vacío termina con qué hacer ahora.
4. **Específico gana a genérico.** "El teléfono debe tener 10 dígitos; escribiste 8" gana a "Teléfono
   inválido".
5. **No culpes.** El sistema no entendió; el usuario no "falló".
6. **Lo importante primero.** Las personas leen las primeras 2 o 3 palabras. Empieza por lo que cambia
   la decisión.
7. **El mismo nombre para lo mismo en todo el producto.** Si en un lado es "Eliminar" y en otro
   "Borrar", el usuario cree que son dos acciones distintas.

## 2. Fórmulas por tipo de texto

| Tipo | Fórmula | Ejemplo |
|---|---|---|
| **Botón** | Verbo + objeto (+ destino si hay ambigüedad), ≤ 3 palabras | "Guardar cambios", "Pagar $1,284", "Enviar a Ana" |
| **Error** | Qué pasó + por qué (si ayuda) + qué hacer | "No se guardó el cambio porque se perdió la conexión. Lo enviaremos al reconectar." |
| **Validación de campo** | Qué falta o qué se espera, con ejemplo | "Revisa el correo: le falta la @ (ej. ana@empresa.com)" |
| **Estado vacío** | Qué es + qué ganas + primer paso (botón) | "Todavía no hay cotizaciones · Aquí verás cada cotización y su estado · [Crear cotización]" |
| **Confirmación** (solo irreversibles) | Pregunta con la consecuencia concreta + botón con la acción exacta | "¿Eliminar Grupo Norte para siempre? Se borrarán 12 cotizaciones. [Eliminar para siempre] [Conservar]" |
| **Toast de éxito** | Qué quedó hecho (+ Deshacer si es reversible), ≤ 80 caracteres | "Se eliminó Renovación flotilla · Deshacer" |
| **Carga larga** | Qué se prepara + cuánto suele tardar | "Preparando tu reporte… suele tardar unos 20 segundos." |
| **Sin permiso** | Qué es + quién tiene acceso + cómo pedirlo | "Esta sección es para Finanzas. Pídele acceso a Laura Gómez." |
| **Tooltip de ícono** | Acción + atajo | "Duplicar (D)" |
| **Default explicado** | De dónde salió el valor | "Se llenó con el último cliente que usaste" |
| **Notificación** | Quién/qué + por qué importa ahora + acción | "Grupo Norte no ha respondido en 5 días. ¿Le escribes?" |

Reglas de las confirmaciones: el botón de confirmar repite el verbo ("Eliminar para siempre"), nunca
"Sí" o "Aceptar"; el de cancelar dice qué conserva ("Conservar", "Seguir editando"). Si la acción es
reversible, no confirmes: aplica y ofrece "Deshacer".

## 3. Evita → Usa

| Evita | Usa | Por qué |
|---|---|---|
| Aceptar / OK / Sí | Eliminar cotización / Guardar cambios | El botón dice el resultado |
| Enviar | Enviar cotización a Grupo Norte | Qué se envía y a quién |
| Continuar / Siguiente | Ir al pago / Revisar pedido | Qué viene después |
| ¿Está seguro? | ¿Eliminar Grupo Norte para siempre? | La consecuencia, no la duda |
| Error 500 / Ocurrió un error | No se guardó el cambio. Inténtalo de nuevo en un momento. | Humano y con salida |
| Campo requerido | Escribe el nombre del cliente | Qué falta exactamente |
| Formato inválido | El RFC tiene 12 o 13 caracteres (ej. ABC010203XYZ) | Cómo corregirlo |
| No hay datos | Todavía no hay cotizaciones · [Crear cotización] | Qué es y cómo empezar |
| Oops, algo salió mal 😅 | No pudimos cargar tus pedidos. Reintentar | Un error no es gracioso para quien lo sufre |
| Haga click aquí | Descarga la factura (PDF, 120 KB) | El enlace describe su destino |
| Registro guardado exitosamente | Guardado | Menos palabras, mismo significado |
| Su sesión ha expirado | Tu sesión terminó por seguridad. Vuelve a entrar; lo que escribiste sigue aquí. | Tranquiliza y da salida |
| Nueva Cotización (Title Case) | Nueva cotización | En español se usa mayúscula solo al inicio |
| ¡¡Éxito!! | Se envió la factura | La exclamación no informa |

## 4. Voz de marca: tono sin perder claridad

La **voz** es constante (quién es la marca); el **tono** cambia según el momento del usuario. La
claridad no se negocia en ningún tono.

| Momento del usuario | Tono | Ejemplo cercano | Ejemplo formal |
|---|---|---|---|
| Éxito, logro | Cálido, breve | "¡Listo! La cotización ya está con Grupo Norte." | "La cotización se envió a Grupo Norte." |
| Error, bloqueo | Sereno, sin humor, con salida | "No se guardó. Revisa tu conexión; lo que escribiste sigue aquí." | "No se guardó el cambio. Verifique su conexión; su información se conserva." |
| Riesgo, irreversible | Directo y concreto | "Esto borra 12 cotizaciones y no se puede deshacer." | "Se eliminarán 12 cotizaciones de forma permanente." |
| Espera | Honesto con el tiempo | "Casi listo, suele tardar 20 segundos." | "El proceso tarda aproximadamente 20 segundos." |
| Primera vez | Acogedor, al grano | "Empecemos por tu primera cotización." | "Para comenzar, registre su primera cotización." |

Define la voz de la marca en `assets/microcopy/voice.template.json` (tratamiento, personalidad,
palabras prohibidas, glosario, política de exclamaciones y emojis, límites de longitud). La biblioteca
y el linter la usan.

## 5. Tú o usted

Elige uno para todo el producto y no los mezcles: la mezcla se nota más que cualquiera de los dos.

- **Tú**: productos de uso diario, equipos internos, consumo, audiencias jóvenes, la mayoría del
  software de trabajo en México hoy.
- **Usted**: banca, gobierno, salud, seguros, audiencias mayores o relaciones muy formales.

La biblioteca trae ambas variantes de cada texto. Atención a los verbos en imperativo: tú → "revisa,
escribe, elige, intenta"; usted → "revise, escriba, elija, intente". El linter detecta la mezcla.

## 6. Reglas de forma

- **Mayúscula solo al inicio** (sentence case) en títulos, botones y menús.
- **Botones ≤ 3 palabras** y ≤ 24 caracteres; toasts ≤ 80; títulos ≤ 60.
- **Números**: `$1,284.50`, `98 mil`, `1.2 millones` en texto; `tabular-nums` en tablas. Fechas
  relativas cerca ("hace 5 min", "ayer") y absolutas cuando importan ("vence el 12 de marzo").
- **Sin punto final** en botones, títulos, etiquetas y toasts de una frase; con punto en párrafos.
- **Sin exclamaciones en errores**; en éxitos, según la voz de la marca.
- **Sin emojis en errores ni en acciones destructivas.**
- **Accesibilidad**: enlaces que describen su destino (nunca "aquí"), `aria-label` en íconos sin texto
  con el mismo verbo del tooltip, mensajes de error asociados al campo (`aria-describedby`).

## 7. Internacionalización

- **Nunca concatenes frases**: `"Se eliminaron " + n + " cotizaciones"` no se puede traducir ni
  pluralizar. Usa mensajes completos con variables (ICU MessageFormat):
  `{count, plural, one {Se eliminó # cotización} other {Se eliminaron # cotizaciones}}`.
- Deja espacio: el texto en otros idiomas crece hasta 30-40%.
- Evita el género cuando puedas ("Se creó Grupo Norte" en lugar de "Creado/Creada"); si no, usa
  `select` de ICU con el género de la entidad.
- La biblioteca usa formato ICU y funciona con `next-intl`, `react-intl`, `i18next` (con plugin ICU) o
  `FormatJS`.

## 8. Biblioteca, voz y linter

- `assets/microcopy/library.es.json`: más de 60 textos listos por categoría (acciones, toasts, errores,
  validación, vacíos, confirmaciones, carga, sincronización, onboarding, notificaciones, ayuda), cada
  uno con variante `tu` y `usted`, variables ICU y dónde se usa. Copia las claves que necesites a los
  archivos de traducción del proyecto y reemplaza `{entidad}` por el nombre real.
- `assets/microcopy/voice.template.json`: copia al repo como `voice.json` y llénalo con la marca.
- `scripts/copy_lint.py`: revisa textos contra estas reglas y la voz:
  ```bash
  python scripts/copy_lint.py src/ --voice voice.json          # .tsx .jsx .vue .html .svelte
  python scripts/copy_lint.py messages/es.json --voice voice.json
  python scripts/copy_lint.py assets/microcopy/library.es.json --variant usted
  ```
  Reporta botones genéricos, confirmaciones vagas, errores sin salida, códigos técnicos, culpa al
  usuario, mezcla de tú y usted, mayúsculas de título, exclamaciones en errores, longitud excesiva y
  palabras prohibidas o fuera del glosario. Sale con 1 si hay errores (con `--strict`, también con
  advertencias), así que sirve en CI junto a `flow_meter.js check`.

Al entregar un diseño, **incluye siempre el microcopy real** de botones, vacíos, errores y
confirmaciones, pasado por el linter. Si la marca no tiene voz definida, propón una en `voice.json`
con 3 rasgos y el tratamiento, y dilo como supuesto.
