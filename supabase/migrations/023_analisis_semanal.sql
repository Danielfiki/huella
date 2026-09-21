-- ══════════════════════════════════════════════════════════════
-- Migración 023 — el análisis semanal se guarda
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Estado: PENDIENTE de correr en producción.
--
-- Hasta hoy el análisis del Home vivía solo en memoria: se generaba al tocar
-- "Analizar patrones ahora" y se perdía al salir de la pantalla. Ahora se
-- genera solo, una vez por semana por hijo, y queda guardado. Sin guardarlo no
-- hay nada que la push del domingo pueda citar ni forma de medir si se abre.
--
-- Una fila por hijo y semana. `semana` es el LUNES de esa semana en hora de
-- Chile. El UNIQUE (hijo_id, semana) es el freno: si dos dispositivos de la
-- familia lo generan a la vez, el segundo insert falla y no queda duplicado.
--
-- Correr el deploy DESPUÉS de esta migración o antes da lo mismo: si la tabla
-- no existe, la app avisa en consola y sigue sin análisis. No rompe nada.
-- ══════════════════════════════════════════════════════════════


-- --------------------------------------------
-- BLOQUE 1 de 3 — Verificación previa (solo lectura)
-- Esperado: existe = false.
-- --------------------------------------------

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'analisis_semanal'
) AS existe;


-- --------------------------------------------
-- BLOQUE 2 de 3 — Migración
-- Esperado: "Success. No rows returned".
-- --------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.analisis_semanal (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  hijo_id     uuid NOT NULL REFERENCES public.hijos(id) ON DELETE CASCADE,
  semana      date NOT NULL,
  texto       text NOT NULL,
  marco       text,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT analisis_semanal_hijo_semana_key UNIQUE (hijo_id, semana)
);

-- El UNIQUE ya crea un índice que empieza por hijo_id: no hace falta otro.

-- RLS: la misma policy family_data que rasgos y patrones.
-- Lectura: cualquier miembro de la familia. Escritura: solo a nombre propio.
ALTER TABLE public.analisis_semanal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_data ON public.analisis_semanal;
CREATE POLICY family_data ON public.analisis_semanal
  FOR ALL
  USING      (user_id = ANY (public.get_family_user_ids(auth.uid())))
  WITH CHECK (auth.uid() = user_id);

-- GRANTS: a diferencia de las demás tablas, acá SÍ se escriben. Supabase le da
-- por defecto los 7 privilegios a anon y authenticated en toda tabla nueva de
-- `public` (ver la nota de la migración 012). Un análisis guardado no se edita
-- ni se borra desde la app, así que se deja solo leer y crear. Sin el REVOKE,
-- el GRANT de abajo no quitaría nada.
REVOKE ALL ON public.analisis_semanal FROM anon, authenticated;
GRANT SELECT, INSERT ON public.analisis_semanal TO authenticated;

COMMIT;


-- --------------------------------------------
-- BLOQUE 3 de 3 — Verificación posterior (solo lectura)
-- Esperado: columnas = 7, rls = true, policies = 1,
--           privilegios_authenticated = 'INSERT, SELECT', privilegios_anon = null.
-- --------------------------------------------

SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analisis_semanal')     AS columnas,
  (SELECT relrowsecurity FROM pg_class
    WHERE oid = 'public.analisis_semanal'::regclass)                        AS rls,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analisis_semanal')        AS policies,
  (SELECT string_agg(privilege_type, ', ' ORDER BY privilege_type)
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'analisis_semanal'
      AND grantee = 'authenticated')                                       AS privilegios_authenticated,
  (SELECT string_agg(privilege_type, ', ' ORDER BY privilege_type)
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'analisis_semanal'
      AND grantee = 'anon')                                                AS privilegios_anon;
