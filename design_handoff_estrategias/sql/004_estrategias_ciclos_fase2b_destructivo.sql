-- ============================================
-- Fase 2b — Destructivo: DROP columnas legacy en estrategias
-- ⚠️ REQUIERE BACKUP PREVIO + VENTANA DE MANTENIMIENTO.
-- Solo ejecutar cuando Fase 4 y Fase 5 estén desplegadas y verificadas en producción.
-- Antes de ejecutar, considerar re-correr 003 (parte B) para capturar estrategias creadas después de la primera población.
-- ============================================

BEGIN;

ALTER TABLE public.estrategias DROP COLUMN IF EXISTS plan;
ALTER TABLE public.estrategias DROP COLUMN IF EXISTS tareas;
ALTER TABLE public.estrategias DROP COLUMN IF EXISTS semana_actual;
ALTER TABLE public.estrategias DROP COLUMN IF EXISTS checkins;
ALTER TABLE public.estrategias DROP COLUMN IF EXISTS total_semanas;
ALTER TABLE public.estrategias DROP COLUMN IF EXISTS fecha_inicio;
ALTER TABLE public.estrategias DROP COLUMN IF EXISTS completado_at;
ALTER TABLE public.estrategias DROP COLUMN IF EXISTS abandonado_at;

COMMIT;
