-- ============================================
-- Fase 2a — Aditivo: estrategias → ciclos (sin DROP)
-- 100% aditivo. Seguro de ejecutar en cualquier momento.
-- Después de esto, los datos viven duplicados en estrategias.* y estrategia_ciclos.* hasta Fase 2b.
-- ============================================

BEGIN;

-- ============================================
-- PARTE A — Columnas faltantes en estrategia_ciclos
-- ============================================
ALTER TABLE public.estrategia_ciclos
  ADD COLUMN IF NOT EXISTS semana_actual integer NOT NULL DEFAULT 1;

ALTER TABLE public.estrategia_ciclos
  ADD COLUMN IF NOT EXISTS checkins_legacy jsonb;


-- ============================================
-- PARTE B — Poblar Ciclo 1 desde estrategias existentes
-- Idempotente Y sincronizadora: re-correr actualiza Ciclo 1 con los
-- valores actuales de estrategias (necesario para capturar cambios
-- hechos entre Fase 2a y Fase 4 desde el cliente viejo).
-- ============================================
INSERT INTO public.estrategia_ciclos (
  estrategia_id,
  user_id,
  hijo_id,
  numero_ciclo,
  fecha_inicio,
  fecha_cierre,
  duracion_semanas,
  plan,
  estado,
  usar_memoria_ia,
  semana_actual,
  checkins_legacy
)
SELECT
  e.id,
  e.user_id,
  e.hijo_id,
  1 AS numero_ciclo,
  COALESCE(e.fecha_inicio::date, CURRENT_DATE),
  CASE
    WHEN e.completado_at IS NOT NULL THEN e.completado_at::date
    WHEN e.abandonado_at IS NOT NULL THEN e.abandonado_at::date
    ELSE NULL
  END AS fecha_cierre,
  COALESCE(e.total_semanas, 4),
  CASE
    WHEN e.plan IS NOT NULL AND TRIM(e.plan) <> '' THEN e.plan::jsonb
    ELSE NULL
  END AS plan,
  CASE
    WHEN e.completado_at IS NOT NULL OR e.abandonado_at IS NOT NULL THEN 'cerrado'
    ELSE 'activo'
  END AS estado,
  true AS usar_memoria_ia,
  COALESCE(e.semana_actual, 1),
  CASE
    WHEN e.checkins IS NOT NULL AND e.checkins::text NOT IN ('{}', 'null') THEN e.checkins
    ELSE NULL
  END AS checkins_legacy
FROM public.estrategias e
ON CONFLICT (estrategia_id, numero_ciclo) DO UPDATE SET
  fecha_inicio = EXCLUDED.fecha_inicio,
  fecha_cierre = EXCLUDED.fecha_cierre,
  duracion_semanas = EXCLUDED.duracion_semanas,
  plan = EXCLUDED.plan,
  estado = EXCLUDED.estado,
  semana_actual = EXCLUDED.semana_actual,
  checkins_legacy = EXCLUDED.checkins_legacy,
  updated_at = now();


-- ============================================
-- PARTE C — Vincular episodios viejos al Ciclo 1
-- ============================================

-- C.1: episodios marcados como origen
UPDATE public.episodios ep
SET ciclo_id = c.id
FROM public.estrategias e
JOIN public.estrategia_ciclos c ON c.estrategia_id = e.id AND c.numero_ciclo = 1
WHERE e.episodio_origen_id = ep.id
  AND ep.ciclo_id IS NULL;

-- C.2: episodios listados como detonantes
UPDATE public.episodios ep
SET ciclo_id = c.id
FROM public.estrategias e
JOIN public.estrategia_ciclos c ON c.estrategia_id = e.id AND c.numero_ciclo = 1
WHERE ep.ciclo_id IS NULL
  AND ep.id = ANY(e.episodios_detonantes_ids);


COMMIT;
