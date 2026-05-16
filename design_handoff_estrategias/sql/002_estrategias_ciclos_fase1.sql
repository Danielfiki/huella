-- ============================================
-- Fase 1 — DB aditiva: Estrategias con Ciclos
-- Ejecutado en producción: 14 mayo 2026
-- No destructivo. Crea 3 tablas + 1 columna en episodios.
-- ============================================

BEGIN;

-- ============================================
-- 1. TABLA: estrategia_ciclos
-- Cada ciclo de trabajo dentro de una estrategia (habilidad).
-- ============================================
CREATE TABLE IF NOT EXISTS public.estrategia_ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estrategia_id uuid NOT NULL REFERENCES public.estrategias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hijo_id uuid REFERENCES public.hijos(id) ON DELETE CASCADE,
  numero_ciclo integer NOT NULL,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_cierre date,
  duracion_semanas integer,
  plan jsonb,
  cierre_analisis jsonb,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  usar_memoria_ia boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estrategia_id, numero_ciclo)
);

CREATE INDEX IF NOT EXISTS idx_ciclos_estrategia ON public.estrategia_ciclos(estrategia_id);
CREATE INDEX IF NOT EXISTS idx_ciclos_user_hijo ON public.estrategia_ciclos(user_id, hijo_id);
CREATE INDEX IF NOT EXISTS idx_ciclos_estado ON public.estrategia_ciclos(estado);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ciclo_activo_por_estrategia
  ON public.estrategia_ciclos(estrategia_id)
  WHERE estado = 'activo';

ALTER TABLE public.estrategia_ciclos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_data ON public.estrategia_ciclos;
CREATE POLICY family_data ON public.estrategia_ciclos
  FOR ALL
  USING (user_id = ANY (get_family_user_ids(auth.uid())))
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 2. TABLA: estrategia_bitacora_notas
-- Notas libres del usuario en la bitácora de un ciclo.
-- ============================================
CREATE TABLE IF NOT EXISTS public.estrategia_bitacora_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL REFERENCES public.estrategia_ciclos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hijo_id uuid REFERENCES public.hijos(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_ciclo ON public.estrategia_bitacora_notas(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_user_hijo ON public.estrategia_bitacora_notas(user_id, hijo_id);

ALTER TABLE public.estrategia_bitacora_notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_data ON public.estrategia_bitacora_notas;
CREATE POLICY family_data ON public.estrategia_bitacora_notas
  FOR ALL
  USING (user_id = ANY (get_family_user_ids(auth.uid())))
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 3. TABLA: estrategias_panel_descartadas
-- Habilidades que el usuario ocultó del panel de descanso.
-- Persistencia cross-device para parejas.
-- ============================================
CREATE TABLE IF NOT EXISTS public.estrategias_panel_descartadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hijo_id uuid REFERENCES public.hijos(id) ON DELETE CASCADE,
  habilidad_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hijo_id, habilidad_id)
);

CREATE INDEX IF NOT EXISTS idx_panel_descartadas_user_hijo
  ON public.estrategias_panel_descartadas(user_id, hijo_id);

ALTER TABLE public.estrategias_panel_descartadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_data ON public.estrategias_panel_descartadas;
CREATE POLICY family_data ON public.estrategias_panel_descartadas
  FOR ALL
  USING (user_id = ANY (get_family_user_ids(auth.uid())))
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 4. COLUMNA: episodios.ciclo_id
-- Vincula cada episodio a un ciclo de estrategia (opcional).
-- ============================================
ALTER TABLE public.episodios
  ADD COLUMN IF NOT EXISTS ciclo_id uuid REFERENCES public.estrategia_ciclos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_episodios_ciclo ON public.episodios(ciclo_id);


COMMIT;
