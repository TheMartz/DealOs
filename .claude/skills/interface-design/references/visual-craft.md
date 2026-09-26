# Oficio visual — que se vea excelente

La belleza en software viene de **consistencia, ritmo y contención**, no de adornos. Un sistema de
tokens bien hecho hace que cualquier pantalla se vea profesional; improvisar valores hace que ninguna
lo parezca.

Contenido:
1. Dirección estética
2. Espaciado y layout
3. Tipografía
4. Color
5. Profundidad, bordes y radios
6. Movimiento
7. Densidad
8. Iconografía
9. Tokens base

---

## 1. Dirección estética

Antes de elegir colores, elige una **dirección** en una línea, coherente con el dominio y el usuario:

| Dirección | Se siente | Va bien con |
|---|---|---|
| **Precisión editorial** | Sobria, tipográfica, mucho aire, 1 acento | Finanzas, legal, B2B premium |
| **Herramienta densa** | Compacta, monoespaciada en datos, contraste alto | Operaciones, dev tools, trading, bodegas |
| **Cálida humana** | Radios amplios, tonos tierra, ilustración ligera | Salud, educación, RR. HH. |
| **Técnica luminosa** | Oscura, acentos saturados, datos protagonistas | Monitoreo, analítica, seguridad |
| **Suave táctil** | Superficies con profundidad sutil, microinteracciones ricas | Consumo, creatividad, productividad personal |

Escoge una y comprométete. Mezclar direcciones es lo que hace que una interfaz se vea "armada".

## 2. Espaciado y layout

- Escala de 4 px: 4, 8, 12, 16, 24, 32, 48, 64. Nada fuera de la escala.
- **Más espacio entre grupos que dentro de grupos** (proximidad): separa con espacio antes que con líneas.
- Ancho de lectura: 60-75 caracteres. Formularios: máximo ~560 px de ancho.
- Grid de 12 columnas en escritorio; márgenes laterales de 16 px en móvil.
- Alinea todo a pocos ejes verticales; los bordes izquierdos alineados dan orden inmediato.
- Layout bento/modular solo si cada bloque es independiente y tiene jerarquía propia.

## 3. Tipografía

- Una familia sans de calidad para UI (Inter, Geist, IBM Plex Sans, Manrope, Figtree) + opcional una
  display o serif para títulos si la dirección lo pide (Fraunces, Instrument Serif, Space Grotesk).
- Monoespaciada o `font-variant-numeric: tabular-nums` para números que se comparan en columnas.
- Escala modular (~1.2): 12, 14, 16, 20, 24, 32, 40. Base 14-16 px en apps, 16 px mínimo en móvil.
- Jerarquía con **peso y tamaño**, no con mayúsculas o colores. Máximo 3 pesos (400, 500/600, 700).
- Interlineado: 1.5 en párrafos, 1.2-1.3 en títulos, 1.4 en UI densa.
- Tracking ligeramente negativo (−0.01 a −0.02 em) en títulos grandes; positivo en etiquetas en mayúsculas.

## 4. Color

- Construye en **OKLCH**: luminosidad perceptualmente uniforme, escalas limpias y modo oscuro coherente.
- Paleta: 1 neutro con 10-12 pasos, 1 acento de marca, 4 semánticos (éxito, alerta, error, info).
- **Regla 60-30-10**: neutros dominan, superficies secundarias, acento solo en lo accionable o activo.
- El color semántico se reserva para significado; nunca decoración.
- Nunca comuniques solo con color: suma ícono, texto o forma.
- Modo oscuro no es invertir: fondo gris muy oscuro (no negro puro), texto ~90% luminosidad, reduce la
  saturación de acentos, eleva superficies con luminosidad (no con sombra).
- Contraste: texto ≥ 4.5:1, texto grande/íconos/bordes de input ≥ 3:1. Valídalo con
  `scripts/contrast_check.py`.

## 5. Profundidad, bordes y radios

- Elige **un** sistema de separación dominante: espacio, bordes sutiles, o elevación. No los tres.
- Sombras suaves y en capas (una corta + una difusa), con color del fondo, nunca negro puro al 50%.
- Radios consistentes y anidados: radio interno = radio externo − padding.
  Escala típica: 6 (inputs, chips), 10 (tarjetas), 16 (modales), 999 (pills).
- Bordes de 1 px con baja opacidad del color de texto (8-12%) se adaptan solos a claro/oscuro.

## 6. Movimiento

- El movimiento explica (de dónde viene, a dónde va, qué cambió), no decora.
- Duraciones: 100-150 ms microinteracciones (hover, press), 200-250 ms paneles y modales,
  300-400 ms transiciones de página. Nunca > 400 ms en algo frecuente.
- Curvas: `cubic-bezier(.2,.8,.2,1)` para entradas; salidas más rápidas que entradas.
- Respeta `prefers-reduced-motion`: reemplaza desplazamientos por fundidos o nada.
- Feedback táctil: botón que se hunde 1-2 px o escala 0.98 al presionar.

## 7. Densidad

Ofrece densidad ajustable en herramientas de uso diario (cómoda / compacta). Filas de tabla:
44-48 px cómoda, 32-36 px compacta. En móvil, targets de 44 px mínimo siempre.

## 8. Iconografía

- Un solo set (Lucide, Phosphor, Tabler, Heroicons), un solo grosor, tamaños 16/20/24.
- Icono + texto para acciones; icono solo únicamente en acciones universales (cerrar, buscar, más,
  editar) y siempre con tooltip y `aria-label`.

## 9. Tokens base (CSS)

```css
:root {
  --bg: oklch(98.5% 0.003 260);
  --surface: oklch(100% 0 0);
  --surface-2: oklch(96.5% 0.004 260);
  --text: oklch(22% 0.02 260);
  --text-2: oklch(45% 0.02 260);
  --border: oklch(22% 0.02 260 / 0.1);
  --accent: oklch(55% 0.2 265);
  --accent-contrast: oklch(99% 0 0);
  --success: oklch(58% 0.15 150);
  --warning: oklch(72% 0.16 75);
  --danger: oklch(56% 0.2 25);
  --radius-sm: 6px; --radius: 10px; --radius-lg: 16px;
  --shadow: 0 1px 2px oklch(20% 0.02 260 / .06), 0 8px 24px oklch(20% 0.02 260 / .08);
  --ease: cubic-bezier(.2,.8,.2,1);
  --font: "Inter", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: oklch(17% 0.01 260);
    --surface: oklch(21% 0.012 260);
    --surface-2: oklch(25% 0.014 260);
    --text: oklch(93% 0.01 260);
    --text-2: oklch(72% 0.015 260);
    --border: oklch(93% 0.01 260 / 0.1);
    --accent: oklch(70% 0.16 265);
    --accent-contrast: oklch(17% 0.01 260);
  }
}
```
