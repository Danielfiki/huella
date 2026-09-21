-- ══════════════════════════════════════════════════════════════
-- Migración 024 — el análisis completo se guarda aparte
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Requiere: migración 023 ya corrida.
--
-- El análisis semanal pasó a ser dos llamadas. La primera se genera sola al
-- abrir el Home y trae solo las tres líneas (Mejoró / Qué mirar / Un paso):
-- va en `texto`, como hasta ahora. La segunda se pide solo cuando un papá Pro
-- toca "Leer el análisis completo", y se guarda en la columna nueva
-- `texto_completo` para no volver a pedirla. El marco teórico sale de esa
-- segunda llamada y va a `marco`, que en la primera queda en null.
--
-- La app ahora ACTUALIZA la fila, así que hace falta UPDATE, pero solo sobre
-- esas dos columnas. Grant por columna: `texto`, `semana` y el resto siguen
-- sin poder tocarse desde el cliente. DELETE sigue sin grant.
-- ══════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.analisis_semanal
  ADD COLUMN IF NOT EXISTS texto_completo text;

GRANT UPDATE (texto_completo, marco) ON public.analisis_semanal TO authenticated;

COMMIT;

-- Verificación. Esperado: columna_nueva = 1,
-- update_por_columna = 'marco, texto_completo'.
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analisis_semanal'
      AND column_name = 'texto_completo')                                   AS columna_nueva,
  (SELECT string_agg(column_name, ', ' ORDER BY column_name)
     FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'analisis_semanal'
      AND grantee = 'authenticated' AND privilege_type = 'UPDATE')          AS update_por_columna;
