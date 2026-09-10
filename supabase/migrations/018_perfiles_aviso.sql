-- ============================================
-- Migration 018 -- perfiles.hora_aviso + perfiles.ultima_actividad
--
-- PARA QUE: la pieza 7, "recordar sin reclamar". El aviso diario deja de ser
-- uno solo para todos a las 9 y pasa a la hora que ELIGE cada cuidador.
--
--   hora_aviso        a que hora local quiere su aviso (0-23). Default 9,
--                     que es la hora con mas registros segun la medicion.
--   ultima_actividad  cuando abrio la app por ultima vez. Sirve para cambiar
--                     el CONTENIDO del aviso cuando lleva dias sin entrar
--                     (contenido de valor por etapa, en vez de pedirle que
--                     registre). NUNCA para bajar la frecuencia ni para
--                     decirle que no ha registrado: eso esta prohibido.
--
-- LA ZONA HORARIA NO SE GUARDA todavia. Los testers son todos de Chile y la
-- hora local se resuelve en la consulta con 'America/Santiago', que ademas
-- ajusta solo el horario de verano. Cuando haya usuarios fuera de Chile, esto
-- pide una columna `zona_horaria` y una migracion propia.
--
-- ORDEN: esta migracion va ANTES del deploy del codigo. Las dos columnas
-- nacen vacias (hora_aviso con su default) y nada las lee hasta que suba el
-- codigo, asi que correrla sola no cambia el comportamiento de la app.
--
-- Idempotente: se puede correr las veces que sea.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- ============================================

BEGIN;

-- ============================================
-- 1. Las dos columnas. ADD COLUMN IF NOT EXISTS no toca las filas que ya
--    existen mas alla de rellenar el default de hora_aviso.
-- ============================================
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS hora_aviso smallint NOT NULL DEFAULT 9;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS ultima_actividad timestamptz;

-- ============================================
-- 2. CHECK de rango para hora_aviso. Se borra y se repone con nombre
--    canonico para que la migracion sea idempotente de verdad: correrla dos
--    veces no falla por "constraint ya existe".
-- ============================================
ALTER TABLE public.perfiles
  DROP CONSTRAINT IF EXISTS perfiles_hora_aviso_check;

ALTER TABLE public.perfiles
  ADD CONSTRAINT perfiles_hora_aviso_check
  CHECK (hora_aviso >= 0 AND hora_aviso <= 23);

-- ============================================
-- 3. Documentacion en la propia base, para el que llegue despues.
-- ============================================
COMMENT ON COLUMN public.perfiles.hora_aviso IS
  'Hora local (0-23, America/Santiago) a la que el cuidador quiere su aviso diario. Default 9. La elige en Cuenta.';

COMMENT ON COLUMN public.perfiles.ultima_actividad IS
  'Ultima vez que el cuidador abrio la app. El cliente la escribe como maximo UNA vez al dia. Se usa para cambiar el CONTENIDO del aviso, nunca su frecuencia, y nunca para reclamarle que no ha registrado.';

-- ============================================
-- 4. Indice para el filtro del cron. El job corre cada hora y pregunta
--    "quienes tienen hora_aviso = <hora actual en Chile>", asi que este es
--    el unico filtro que se repite 24 veces al dia.
-- ============================================
CREATE INDEX IF NOT EXISTS idx_perfiles_hora_aviso
  ON public.perfiles(hora_aviso);

COMMIT;

-- ============================================
-- VERIFICACION (opcional, solo lectura). Debe devolver las dos columnas,
-- hora_aviso con default 9 y NOT NULL, ultima_actividad nullable:
--
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'perfiles'
--     AND column_name IN ('hora_aviso', 'ultima_actividad');
-- ============================================
