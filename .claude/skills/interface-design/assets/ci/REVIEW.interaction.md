## Costo de interacción (interfaz)

En todo PR que toque componentes, páginas, formularios o estilos de la interfaz:

1. Si existe el comentario `<!-- interaction-cost -->` del workflow, léelo primero. Un flujo con
   "❌ sube" o "❌ ya no se completa" es un hallazgo bloqueante salvo que la descripción del PR
   explique por qué el aumento es intencional y el PR actualice `ux/baseline/`.
2. Revisa el diff buscando cambios que agregan esfuerzo al usuario y márcalos con su costo estimado
   (click 1 · campo 2 · decisión 2 · modal 2 · pantalla 3 · duda 3):
   - `confirm()` o diálogos de confirmación sobre acciones reversibles → proponer deshacer.
   - Campos nuevos obligatorios o defaults eliminados → ¿el sistema ya lo sabe?
   - Pasos o rutas nuevas dentro de un flujo existente → ¿cabe en la pantalla actual?
   - Acciones frecuentes movidas a menús "…" → dejarlas visibles.
   - Autosave reemplazado por guardado manual, atajos eliminados, deshacer eliminado.
   - Botones con texto genérico ("Aceptar", "Enviar", "Continuar") → verbo + objeto.
   - Spinners que bloquean la pantalla donde cabe una actualización optimista.
   - Acciones solo visibles con hover (inalcanzables en táctil).
   - Listas re-renderizadas completas al guardar (keys por índice, innerHTML).
3. Formato: `[+N CI · frecuencia] qué pasa → por qué cuesta → alternativa concreta → excepción válida`.
4. No comentes estilo visual ni preferencias sin impacto en esfuerzo, claridad o accesibilidad.
