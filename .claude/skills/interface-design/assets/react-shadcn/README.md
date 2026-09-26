# Port de la plantilla a React + Tailwind v4 + shadcn/ui

Traducción de `prototype-template.html` a componentes de producción. Conserva **cada comportamiento que
reduce esfuerzo**: está verificado con el mismo `flow.json` contra ambas versiones (paridad: CI 11 = 11,
overhead 7 = 7) y con los casos que encontraron las personas simuladas.

## Qué incluye

```
src/
  components/quotes/
    quotes-page.tsx      Página completa: filtros, búsqueda, tabla editable, KPIs, barra masiva, atajos
    inline-edit.tsx      Celda editable: click → input, Enter/salir guarda, Esc cancela, Tab encadena
    status-menu.tsx      Menú de estado en la fila (DropdownMenu) + etiqueta con chevron
    command-palette.tsx  ⌘K con puntaje propio (Dialog + Command, shouldFilter={false})
    states.tsx           Vacío, error, sin resultados y skeleton con la forma de la fila
    kbd.tsx              Tecla visible, oculta en táctil
    config.ts            ENTITY, STATUSES y datos de ejemplo → reemplázalos por tu dominio
    index.ts
  hooks/
    use-hotkeys.ts       Atajos globales que respetan cuándo el usuario está escribiendo
    use-undoable.ts      Estado con deshacer + toast "Deshacer" (sonner, uno a la vez)
  lib/interaction.ts     parseAmount ("98 mil"), score (ranking ⌘K), norm, money, ago
  styles/tokens.css      Tema shadcn en OKLCH (claro/oscuro) + --success, --info y animaciones
```

## Instalación en un proyecto con shadcn/ui

```bash
npx shadcn@latest add button checkbox dialog dropdown-menu command table sonner
npm i lucide-react           # si aún no lo tienes
```

1. Copia `src/components/quotes`, `src/hooks` y `src/lib/interaction.ts` a tu proyecto (usa el alias `@/`).
2. Pega `styles/tokens.css` en tu `globals.css` (o solo `--success`, `--info`, `@theme inline` y los
   `@keyframes` si ya tienes tema propio).
3. Monta el toaster una vez en el layout. El `offset` evita que el aviso tape la barra de acciones masivas:
   ```tsx
   <Toaster position="bottom-right" offset={{ bottom: 88 }} />
   ```
4. Renderiza `<QuotesPage />` y cambia `config.ts` por tus entidades, estados y datos.
5. Conecta tu API con actualizaciones optimistas (ver `references/stack-translation.md`, sección 5).

Next.js App Router: los archivos interactivos ya traen `"use client"`.

## Verificar que no se perdió nada

```bash
# mismo flujo, dos implementaciones
node scripts/flow_meter.js run assets/flows/ejemplo-despues.json --out r-proto
node scripts/flow_meter.js run assets/flows/ejemplo-despues.json --url http://localhost:3000/cotizaciones --out r-app
node scripts/flow_meter.js compare r-proto/report.json r-app/report.json --parity
```

Para que el mismo flujo sirva en ambas, el port mantiene los ganchos del prototipo: `tbody#rows`,
`tr[data-id]`, `[data-action="status" | "duplicate" | "delete"]`, `[data-field]` y los mismos nombres
accesibles y placeholders.
