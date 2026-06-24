-- ============================================
-- Migration 006 -- Tabla rasgos (retrato del nino)
-- Persiste los rasgos detectados por el "motor de rasgos" a partir de los
-- momentos del nino. La IA propone (estado 'candidato'); el papa confirma o
-- descarta. La evidencia son los episodios que respaldan el rasgo.
--
-- Sigue EXACTAMENTE el patron de estrategia_ciclos / hitos:
--   PK uuid, user_id + hijo_id con ON DELETE CASCADE, RLS family_data
--   reutilizando public.get_family_user_ids (no se redefine).
--
-- No destructivo (CREATE TABLE IF NOT EXISTS). Idempotente.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- Estado: APLICADO en produccion (corrido a mano en el SQL Editor por Daniel).
-- ============================================

BEGIN;

-- ============================================
-- 1. TABLA: rasgos
-- familia: una de las 4 familias del retrato.
-- titulo:  el rasgo en una frase corta (ej. "Busca consolar a otros").
-- evidencia: jsonb con lista de { episodio_id, fecha } que respaldan el rasgo.
-- evidencia_count: cuantos momentos lo respaldan (para el "notado N veces").
-- estado:  ciclo de vida del rasgo (propuesto -> confirmado/descartado).
-- confianza: score 0..1 que devuelve la IA.
-- ============================================
CREATE TABLE IF NOT EXISTS public.rasgos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hijo_id         uuid NOT NULL REFERENCES public.hijos(id) ON DELETE CASCADE,
  familia         text NOT NULL CHECK (familia IN ('mueve', 'fortalezas', 'cuesta', 'calma')),
  titulo          text NOT NULL,
  evidencia       jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidencia_count int NOT NULL DEFAULT 0,
  estado          text NOT NULL DEFAULT 'candidato' CHECK (estado IN ('candidato', 'confirmado', 'descartado')),
  confianza       numeric CHECK (confianza IS NULL OR (confianza >= 0 AND confianza <= 1)),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. INDICE por hijo_id (patron idx_<tabla>_hijo_id de la migracion 001)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rasgos_hijo_id ON public.rasgos(hijo_id);

-- ============================================
-- 3. RLS: misma policy family_data que las demas tablas de datos.
-- Lectura (USING): cualquier miembro de la familia via get_family_user_ids.
-- Escritura (WITH CHECK): solo a nombre propio (auth.uid() = user_id).
-- get_family_user_ids YA existe (schema.sql); aqui NO se redefine.
-- ============================================
ALTER TABLE public.rasgos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_data ON public.rasgos;
CREATE POLICY family_data ON public.rasgos
  FOR ALL
  USING (user_id = ANY (public.get_family_user_ids(auth.uid())))
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- ============================================
-- NOTA updated_at: el repo NO usa triggers de updated_at. En estrategia_ciclos
-- la columna existe con DEFAULT now() y se actualiza A MANO desde el front en
-- cada UPDATE (updated_at = now()). Esta tabla sigue el mismo patron: la app
-- debe setear updated_at en cada UPDATE. No hay trigger.
-- ============================================
