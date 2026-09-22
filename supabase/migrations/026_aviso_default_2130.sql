-- ============================================
-- Migration 026 -- default del aviso diario a las 21:30
--
-- Estado: APLICADO en produccion el 22 sep 2026 por Daniel, en el SQL Editor.
-- Este archivo lo documenta; no hace falta volver a correrlo.
--
-- POR QUE: la medicion de hora de registro (supabase/consultas/retencion.sql,
-- bloque A) dio 9 momentos de testers en 6 dias, 5 de ellos entre las 21:00 y
-- la 01:00. El aviso a las 9:00 llegaba cuando nadie registra.
--
-- Que hace:
--   1. Los perfiles nuevos nacen con el aviso a las 21:30.
--   2. Los perfiles que seguian en 9:00, el default viejo, pasan a 21:30.
--      Quien eligio otra hora (14:00 o 21:30) no se toca.
--
-- Sin GRANT nuevo: hora_aviso y minuto_aviso ya tienen su grant por columna
-- desde el fix del 11 sep 2026.
-- ============================================

ALTER TABLE public.perfiles ALTER COLUMN hora_aviso SET DEFAULT 21, ALTER COLUMN minuto_aviso SET DEFAULT 30;
UPDATE public.perfiles SET hora_aviso = 21, minuto_aviso = 30 WHERE hora_aviso = 9 AND minuto_aviso = 0;
