# Lote de mockups — Estrategias con Ciclos

Mockups React autocontenidos (datos mock inline) del rediseño "Estrategias con Ciclos". Sirven como referencia visual y de comportamiento antes de construir el bundle de implementación final.

Cada mockup es renderizable de forma independiente. Importa tokens de `src/index.css` (CSS variables existentes — sin tokens nuevos).

## Pantallas del lote

| # | Pantalla | Approach | Archivo |
|---|----------|----------|---------|
| 1 | Lista de estrategias (carriles + timeline) | 1A | `Pantalla1_Lista.jsx` |
| 2 | Detalle del ciclo con bitácora | 2C | `Pantalla2_Detalle.jsx` |
| 3 | Cierre del ciclo (3 secciones IA + 2 CTAs) | 3A | `Pantalla3_Cierre.jsx` |
| 4 | Modal Ciclo 2 (bottom sheet con preview) | 4B | `Pantalla4_ModalCiclo2.jsx` |
| 5 | PDF — tabla maestra + dossier por ciclo | 5B | `Pantalla5_PDF.jsx` |
| 6 | Card Panel "en descanso" | 6A | `Pantalla6_PanelDescanso.jsx` |

## Correcciones aplicadas (aprobadas 2026-05-13)

### CORRECCIÓN 1 — Pantalla 4
"Ciclo independiente" crea un Ciclo N+1 **dentro de la misma estrategia contenedor**, no una estrategia paralela. Preserva la invariante "una habilidad = una estrategia". La diferencia con "Continuar" es que el prompt a la IA no recibe el historial de ciclos anteriores (parte fresca, sin memoria), pero el ciclo sigue perteneciendo a la misma estrategia.

### CORRECCIÓN 2 — Pantalla 6
Icono cambiado de `Moon` (lucide-react) a emoji 🌿 directo en JSX. Coherencia con el resto de la app.

### CORRECCIÓN 3 — Pantalla 6
Persistencia de "Ocultar de aquí" pasa de `sessionStorage` a `localStorage`. Clave: `huella_descanso_ocultado_{estrategiaId}`. En implementación final migrará a DB (`estrategias_panel_descartadas`) para sincronización cross-device de la pareja.

## Tokens visuales usados

Solo tokens existentes en `src/index.css`:
- `--color-mocha`, `--color-tangerine`, `--color-cream`, `--color-ink`, `--color-muted`
- `--color-surface`, `--color-surface-alt`, `--color-border`
- `--color-amber-bg`, `--color-amber-dark`
- `--color-primary`, `--color-primary-bg`, `--color-primary-border`
- `--color-strawberry`, `--color-accent-green`
- `--shadow-soft`, `--shadow-card-soft`, `--shadow-card-medium`
- `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- `--font-family`, `--font-heading`

## Dependencias

- React 18+
- `lucide-react` para iconos (excepto Pantalla 6, donde se reemplazó `Moon` por 🌿)

## Notas

Los mockups usan datos hardcoded para visualización. Los handlers (`onAbrir`, `onAvanzar`, `onCerrarPlan`, etc.) son `console.log` para inspección. La conexión a Supabase/IA se hace en el bundle de implementación final, no aquí.
