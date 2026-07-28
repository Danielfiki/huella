-- ============================================
-- Migracion 008 -- Tabla tablero_beta (estado del tablero de la beta)
--
-- Contexto: la pagina /beta (src/pages/beta/BetaPage.jsx) guardaba todo su
-- estado en localStorage, es decir en un solo navegador. Daniel trabaja desde
-- el PC y desde el celular, asi que el tablero tiene que vivir en Supabase y
-- sincronizarse entre dispositivos. localStorage se mantiene, pero degradado
-- a cache local: pinta el tablero al instante mientras llega la nube.
--
-- Diseno:
--   * Una fila por usuario. user_id ES la llave primaria, asi la base misma
--     garantiza que no puedan existir dos filas para la misma persona.
--   * El estado completo va como jsonb, con la misma forma que ya tenia en
--     localStorage (historia, grupoCreado, lanz, fechaInicio, dias, cierre,
--     testers, iphone). No se transforma nada.
--   * Policy own_data (NO family_data): este tablero es privado de Daniel.
--     La pareja de la familia no debe verlo, a diferencia de episodios,
--     hitos o rasgos.
--
-- Regla de conflicto que implementa el front: al abrir la pagina gana lo que
-- esta en Supabase. La escritura es un upsert con debounce; nunca hay DELETE.
--
-- No destructivo (CREATE TABLE IF NOT EXISTS). Idempotente.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- Correr los 2 bloques de abajo UNO POR UNO.
-- ============================================


-- --------------------------------------------
-- BLOQUE 1 de 2 -- Tabla tablero_beta + RLS
-- --------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.tablero_beta (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  estado     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: solo el dueno de la fila la lee y la escribe. Mismo patron own_data
-- de episodios / hitos / estrategias en schema.sql.
ALTER TABLE public.tablero_beta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_data ON public.tablero_beta;
CREATE POLICY own_data ON public.tablero_beta
  FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- Exito esperado: "Success. No rows returned".


-- --------------------------------------------
-- BLOQUE 2 de 2 -- Verificacion (SELECT, no modifica nada)
-- Corre este cuando quieras confirmar que el tablero se esta guardando.
-- --------------------------------------------

SELECT
  user_id,
  updated_at,
  jsonb_array_length(estado->'testers') AS testers
FROM public.tablero_beta;

-- Exito esperado la primera vez: "Success. No rows" (todavia no se guarda
-- nada; la fila se crea sola al primer cambio en el tablero). Despues de
-- tocar algo en /beta: una fila con tu usuario.

-- --------------------------------------------
-- NOTA updated_at: el repo NO usa triggers de updated_at (ver nota al final
-- de 006_rasgos.sql). La columna existe con DEFAULT now() y la app la setea
-- a mano en cada upsert. No hay trigger.
-- --------------------------------------------
