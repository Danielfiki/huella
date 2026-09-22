-- ══════════════════════════════════════════════════════════════
-- Migración 025 — el aviso del domingo se puede medir
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migraciones 023 y 024 ya corridas.
-- Correr ANTES del deploy del código.
--
-- Dos columnas en analisis_semanal, sin tabla nueva:
--   push_enviado_at  la escribe api/push-remind.js (service role) cuando el
--                    aviso del domingo salió. Es el denominador.
--   push_abierto_at  la escribe la app cuando el papá entra al Home desde ese
--                    aviso (/panel?desde=domingo). Es el numerador.
--
-- Solo push_abierto_at se puede actualizar desde el cliente. push_enviado_at
-- queda sin grant: la escribe el servidor, que no pasa por los grants.
-- ══════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.analisis_semanal
  ADD COLUMN IF NOT EXISTS push_enviado_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_abierto_at timestamptz;

GRANT UPDATE (push_abierto_at) ON public.analisis_semanal TO authenticated;

COMMIT;

-- Verificación. Esperado: columnas_nuevas = 2,
-- update_por_columna = 'marco, push_abierto_at, texto_completo'.
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analisis_semanal'
      AND column_name IN ('push_enviado_at', 'push_abierto_at'))            AS columnas_nuevas,
  (SELECT string_agg(column_name, ', ' ORDER BY column_name)
     FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'analisis_semanal'
      AND grantee = 'authenticated' AND privilege_type = 'UPDATE')          AS update_por_columna;
