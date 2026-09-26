# Prueba con usuarios simulados

El script mide lo mecánico (clicks, campos, pantallas). Lo más caro, la **duda**, solo aparece cuando
alguien que no conoce la interfaz intenta usarla. Este protocolo simula a esos usuarios con agentes que
ven únicamente lo que vería una persona: capturas y elementos visibles.

Contenido:
1. La regla que lo hace funcionar: prueba a ciegas
2. Personas
3. Tareas
4. Procedimiento
5. Prompt para cada persona
6. Síntesis y fusión con el reporte
7. Límites (dilo siempre)

---

## 1. Prueba a ciegas

Quien diseñó la interfaz no puede probarla: ya sabe dónde está todo, así que nunca duda. Por eso cada
persona:

- **No lee el código, el SKILL, el brief ni las decisiones de diseño.** Solo recibe su ficha de persona,
  la tarea en palabras de usuario y el comando `explore`.
- Decide cada paso **mirando la captura** (`vista-NN.png`) y la lista de elementos visibles, no
  adivinando selectores.
- Si la interfaz esconde algo (acciones que aparecen al pasar el mouse, atajos sin pista visible), la
  persona tampoco lo ve. Eso no es un fallo de la prueba: es el hallazgo.

Si hay subagentes disponibles, lanza **uno por persona, en paralelo**, cada uno con contexto limpio.
Si no los hay, hazlo tú mismo pero declara la limitación en la entrega ("prueba simulada por el mismo
diseñador: subestima las dudas") y sé deliberadamente literal: actúa solo sobre lo que ves en la
captura.

## 2. Personas

Usa 3 por defecto y ajústalas al dominio (nombre, rol y contexto reales del usuario del producto):

| Persona | Quién es | Qué detecta |
|---|---|---|
| **Novato** | Primera vez con el producto. Lee poco, escanea. No conoce atajos ni jerga. | Si se encuentra dónde empezar, si las etiquetas se entienden, cuál es la acción primaria |
| **Experto con prisa** | Lo usa 20+ veces al día. Quiere terminar ya, prueba atajos (⌘K, Enter, teclas), odia confirmar. | Pasos que sobran, falta de atajos, acciones masivas, defaults que no le sirven |
| **Interrumpido en móvil** | Pantalla de 390 px, una mano, lo interrumpen a la mitad (vuelve a empezar la vista). | Botones pequeños, estado que se pierde, contenido que no cabe, retomar la tarea |

Opcionales según el caso:

- **Precavido**: teme equivocarse. Detecta si hay deshacer, si los mensajes aclaran qué pasará, si
  hay confirmaciones confusas.
- **Solo teclado / lector de pantalla**: usa únicamente `press` (Tab, Enter, flechas, Esc). Detecta foco
  invisible, orden de tabulación y elementos sin nombre (`(sin nombre)` en la lista).

## 3. Tareas

Escribe 1 a 3 tareas **en palabras del usuario, nunca de la interfaz**:

- ✓ "Te acaban de pedir una cotización de un sistema de riego por 98 mil pesos para Grupo Norte.
  Regístrala y déjala como enviada."
- ✗ "Haz click en Nueva, llena el título y cambia el estado."

La segunda versión le dice a la persona dónde está todo y mata la prueba. Incluye un criterio de éxito
verificable ("la cotización aparece en la lista como Enviada") para saber si la persona terminó.

## 4. Procedimiento

1. **Ruta óptima**: define el flujo ideal en un `flow.json` y córrelo con
   `node scripts/flow_meter.js run flow.json`. Esto da el CI mecánico y la ruta de referencia.
2. **Oculta lo que no es producto**: el medidor de la plantilla se oculta con `--hide "#hud"`; oculta
   también paneles de depuración o banners de desarrollo.
3. **Lanza las personas** (una sesión de `explore` por persona, en carpetas separadas):
   ```bash
   node scripts/flow_meter.js explore pruebas/novato --url prototipo.html --hide "#hud"
   node scripts/flow_meter.js explore pruebas/movil  --url prototipo.html --hide "#hud" --viewport 390x844
   ```
   Cada llamada con `--do '{…}'` repite las acciones anteriores y ejecuta una nueva, así que la sesión
   sobrevive entre llamadas. `--reset` empieza de cero.
4. **Límite de intentos**: 15 acciones por tarea. Si la persona no termina, la tarea cuenta como fallida
   y el punto donde se atoró es el hallazgo principal.
5. **Recolecta** de cada persona: éxito sí/no, acciones reales vs. ruta óptima, la bitácora de
   pensamiento en voz alta y la lista de dudas.
6. **Sintetiza** (sección 6), corrige el diseño y **vuelve a correr** las mismas personas y tareas.

Aplica en apps reales solo en ambientes de prueba: `explore` repite acciones en cada llamada y en un
sistema con base de datos real puede crear registros duplicados.

## 5. Prompt para cada persona

Copia y completa. No agregues contexto del diseño.

```
Eres {PERSONA}: {descripción de la ficha, en segunda persona, con contexto del dominio}.
Nunca has visto esta aplicación. No abras ni leas archivos de código, HTML, CSS o documentación:
solo puedes mirar las capturas y la lista de elementos que te devuelve la herramienta.

Tu tarea: {TAREA en palabras de usuario}.
Sabrás que terminaste cuando: {CRITERIO DE ÉXITO}.

Herramienta (una acción por llamada):
  node {RUTA}/flow_meter.js explore {CARPETA} [--url {URL} la primera vez] [--viewport 390x844] --hide "#hud" [--do '<acción JSON>']
Acciones: {"action":"click","index":N} · {"action":"click","text":"texto visible"} · {"action":"click","x":X,"y":Y}
  {"action":"fill","index":N,"value":"…"} (o sin index si el campo ya tiene foco) · {"action":"press","key":"Enter"}
  {"action":"hover","index":N} · {"action":"scroll","dy":600}
Después de cada llamada, MIRA la captura (vista-NN.png) con tu herramienta de lectura de imágenes antes de decidir.

Antes de cada acción escribe en {CARPETA}/bitacora.md una línea:
  N. Veo: … | Espero que pase: … | Confianza 1-5 | ¿Dudé? sí/no y por qué
Máximo 15 acciones. Si te atoras, dilo y detente; atorarte es un resultado válido.

Al terminar responde SOLO con este JSON:
{ "persona": "{PERSONA}", "exito": true|false, "acciones": N,
  "dudas": [ { "paso": N, "nota": "qué no entendí o qué esperaba que pasara" } ],
  "momentos_buenos": ["…"], "donde_me_atore": "… o null" }
```

## 6. Síntesis y fusión con el reporte

Junta los JSON de las personas en una tabla de hallazgos ordenada por gravedad:

| Gravedad | Significa | Ejemplo |
|---|---|---|
| **Bloqueo** | La persona no pudo terminar | No encontró cómo cambiar el estado |
| **Duda** | Terminó, pero dudó o se equivocó y corrigió | "¿Enter guarda o agrega otra fila?" |
| **Fricción** | Terminó sin dudar, pero con pasos de más | Buscó con scroll lo que ⌘K daba directo |
| **Pulido** | Detalle menor | Tooltip sin atajo visible |

Para cada hallazgo: qué pasó (cita de la bitácora), qué personas lo sufrieron, por qué pasa (ley o
patrón) y la corrección concreta con el patrón del catálogo.

Métricas por persona: **éxito** (sí/no), **desvío** = acciones reales ÷ acciones de la ruta óptima
(1.0 es perfecto; > 1.5 indica que la ruta no es obvia), **dudas**.

Pasa las dudas al reporte del flujo para obtener el CI total:

```bash
# dudas.json: [{ "step": 3, "persona": "Novato", "note": "No sé si Enter guarda" }, …]
node scripts/flow_meter.js merge flow-report-x/report.json dudas.json
```

Cuenta una duda por paso distinto: si dos personas dudan en el mismo paso, es una duda con dos
testigos (anota ambas personas en la nota). Así el CI no se infla solo por correr más personas.

### Por qué no basta con el flujo guionado

`run` sigue la ruta que tú escribiste, con selectores que ya saben dónde está todo; por eso no
detecta los fallos que aparecen cuando alguien actúa como persona. Caso real al validar la plantilla
de esta skill: el flujo medido pasaba perfecto, pero la persona novata, al hacer click en el monto
mientras editaba el nombre, necesitó **dos clicks**. El primer click guardaba el nombre, se volvía a
dibujar la tabla y el elemento que había recibido el click desaparecía. En la misma ronda salieron:
etiquetas de estado que no parecían tocables, atajos de teclado que en móvil parecían contadores,
avisos amontonados que tapaban filas y un cliente llenado por default sin explicar de dónde venía.
Ninguno aparecía en la medición. Mide con `run` y valida con personas: son complementarios.

## 7. Límites (dilo siempre)

Los usuarios simulados encuentran problemas de **descubribilidad, claridad de etiquetas, jerarquía
visual, consistencia y pasos sobrantes**. No sustituyen a usuarios reales en motivación, hábitos
previos, conocimiento del dominio ni emociones. Recomienda cerrar con **5 usuarios reales**, que
detectan cerca del 85% de los problemas de usabilidad, con las mismas tareas y la misma medición.
