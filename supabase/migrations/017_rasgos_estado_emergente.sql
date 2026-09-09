-- ============================================
-- Migration 017 -- rasgos.estado admite 'emergente'
--
-- POR QUE EXISTE ESTE ARCHIVO: el cuarto estado 'emergente' se agrego a la
-- base VIVA a mano, desde el SQL Editor, durante la Capa 1 de la Fase 2 (ver
-- ESTADO.md, sesion de la Capa 1). Nunca quedo escrito como migracion, asi que
-- 006_rasgos.sql todavia declara el CHECK viejo de TRES estados:
--     estado IN ('candidato', 'confirmado', 'descartado')
-- Si alguna vez se reconstruye la base desde los archivos, todo rasgo
-- 'emergente' fallaria al insertar EN SILENCIO (guardarRasgosDetectados traga
-- el error con console.warn) y el motor dejaria de persistir los patrones de
-- 1-2 momentos, que hoy son la mayoria de la tabla.
--
-- ESTADO EN PRODUCCION: YA APLICADO. La base viva tiene filas con
-- estado = 'emergente', asi que el CHECK de 4 estados ya esta puesto.
-- Este archivo NO hay que correrlo para arreglar nada: solo alinea los
-- archivos con la base. Correrlo igual es seguro (reescribe el mismo CHECK).
--
-- Idempotente: se puede correr las veces que sea.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- ============================================

BEGIN;

-- ============================================
-- 1. Sacar el CHECK de `estado`, sea cual sea su nombre.
-- No se asume `rasgos_estado_check`: el que corrio a mano pudo quedar con
-- otro nombre. Se buscan los CHECK de public.rasgos cuya definicion menciona
-- la columna `estado` y se eliminan todos. No toca el CHECK de `confianza`
-- ni las FK, ni la PK, ni las policies.
-- ============================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class     cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'rasgos'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%estado%'
  LOOP
    EXECUTE format('ALTER TABLE public.rasgos DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- ============================================
-- 2. Reponer el CHECK con los CUATRO estados, con nombre canonico.
--
-- Ciclo de vida real del rasgo:
--   emergente  -> lo respaldan 1-2 momentos. El motor lo detecta y lo guarda,
--                 pero el papa todavia no lo ve.
--   candidato  -> junto 3 o mas momentos. Se le propone al papa.
--   confirmado -> el papa dijo que si. Cuenta para el retrato.
--   descartado -> el papa dijo que no. No vuelve a aparecer.
--
-- La graduacion es de UNA sola direccion y vive en el UPDATE de
-- guardarRasgosDetectados: solo emergente -> candidato, y solo cuando la
-- evidencia fusionada llega a 3. Confirmado y descartado nunca revierten.
-- ============================================
ALTER TABLE public.rasgos
  ADD CONSTRAINT rasgos_estado_check
  CHECK (estado IN ('emergente', 'candidato', 'confirmado', 'descartado'));

COMMIT;

-- ============================================
-- VERIFICACION (opcional, solo lectura). Debe devolver una fila con los
-- cuatro estados en la definicion:
--
--   SELECT con.conname, pg_get_constraintdef(con.oid) AS definicion
--   FROM pg_constraint con
--   JOIN pg_class     cls ON cls.oid = con.conrelid
--   JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
--   WHERE nsp.nspname = 'public'
--     AND cls.relname = 'rasgos'
--     AND con.contype = 'c'
--     AND pg_get_constraintdef(con.oid) ILIKE '%estado%';
-- ============================================
