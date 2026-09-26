import { cn } from "@/lib/utils"

/**
 * Tecla visible. Los atajos se enseñan solos si aparecen en botones, tooltips y menús.
 * Se ocultan en dispositivos táctiles: ahí no hay teclado y se confunden con contadores.
 * (Si tu proyecto ya tiene el componente Kbd de shadcn, puedes usar ese.)
 */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-b-2 bg-background px-1 font-sans text-[11px] font-medium text-muted-foreground",
        "[@media(hover:none)_and_(pointer:coarse)]:hidden",
        className,
      )}
      {...props}
    />
  )
}
