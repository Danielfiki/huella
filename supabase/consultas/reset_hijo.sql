-- =============================================================================
-- reset_hijo.sql — vaciar todos los datos de UN hijo, conservando el hijo
-- =============================================================================
--
-- QUE HACE
--   Borra todo lo registrado de un hijo (momentos, avances, check-ins,
--   estrategias y sus ciclos, sugerencias descartadas, rutinas, patrones y
--   rasgos) y deja la fila de `hijos` intacta: mismo id, nombre, edad y foto.
--   La app queda como recien creado ese hijo. NO toca `hijos` ni `perfiles`.
--
-- POR QUE EXISTE
--   El reset de Pascual se hizo con SQL improvisado, borrando el hijo, y dejo
--   11 momentos huerfanos con hijo_id null. Este archivo es el reset oficial:
--   borra de nieto a hijo, dentro de una transaccion (o se borra todo o no se
--   borra nada) y sin borrar la fila del hijo, asi no queda nada colgando.
--
-- LO QUE NO BORRA
--   Las fotos del bucket `momentos` en Storage. Los archivos quedan ahi sin
--   nadie que los apunte. Si hace falta limpiarlos, es un paso aparte.
--
-- COMO SE USA
--   El hijo se elige por nombre en los TRES pasos: ilike '%brava%'.
--   Para otro hijo, cambiar '%brava%' en los tres lugares.
--   Correr los pasos de a uno, en orden, en el SQL Editor de Supabase.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PASO 1 — Conteo ANTES. Solo lectura.
-- Resultado esperado: 10 filas. La fila `hijos` tiene que decir 1.
-- Si dice 0 o mas de 1, NO correr el paso 2: el filtro por nombre no es unico.
-- -----------------------------------------------------------------------------
WITH objetivo AS (
  SELECT id FROM public.hijos WHERE nombre ILIKE '%brava%'
)
SELECT 'hijos' AS tabla, count(*) AS filas
  FROM public.hijos WHERE id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'checkins_episodio', count(*)
  FROM public.checkins_episodio
 WHERE episodio_id IN (SELECT id FROM public.episodios WHERE hijo_id IN (SELECT id FROM objetivo))
UNION ALL SELECT 'estrategia_ciclos', count(*)
  FROM public.estrategia_ciclos
 WHERE hijo_id IN (SELECT id FROM objetivo)
    OR estrategia_id IN (SELECT id FROM public.estrategias WHERE hijo_id IN (SELECT id FROM objetivo))
UNION ALL SELECT 'estrategia_sugerencias_descartadas', count(*)
  FROM public.estrategia_sugerencias_descartadas WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'estrategias', count(*)
  FROM public.estrategias WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'rutinas', count(*)
  FROM public.rutinas WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'patrones', count(*)
  FROM public.patrones WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'rasgos', count(*)
  FROM public.rasgos WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'hitos', count(*)
  FROM public.hitos WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'episodios', count(*)
  FROM public.episodios WHERE hijo_id IN (SELECT id FROM objetivo);


-- -----------------------------------------------------------------------------
-- PASO 2 — Borrado. Todo dentro de una transaccion.
-- Si el nombre no calza con exactamente 1 hijo, se aborta antes de borrar
-- y no se toca nada. Orden: nieto -> hijo.
-- Resultado esperado: "Success. No rows returned".
-- -----------------------------------------------------------------------------
BEGIN;

CREATE TEMP TABLE objetivo ON COMMIT DROP AS
  SELECT id FROM public.hijos WHERE nombre ILIKE '%brava%';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM objetivo;
  IF n <> 1 THEN
    RAISE EXCEPTION 'El filtro por nombre calza con % hijos, tiene que ser 1. No se borro nada.', n;
  END IF;
END $$;

DELETE FROM public.checkins_episodio
 WHERE episodio_id IN (SELECT id FROM public.episodios WHERE hijo_id IN (SELECT id FROM objetivo));

DELETE FROM public.estrategia_ciclos
 WHERE hijo_id IN (SELECT id FROM objetivo)
    OR estrategia_id IN (SELECT id FROM public.estrategias WHERE hijo_id IN (SELECT id FROM objetivo));

DELETE FROM public.estrategia_sugerencias_descartadas WHERE hijo_id IN (SELECT id FROM objetivo);
DELETE FROM public.estrategias WHERE hijo_id IN (SELECT id FROM objetivo);
DELETE FROM public.rutinas     WHERE hijo_id IN (SELECT id FROM objetivo);
DELETE FROM public.patrones    WHERE hijo_id IN (SELECT id FROM objetivo);
DELETE FROM public.rasgos      WHERE hijo_id IN (SELECT id FROM objetivo);
DELETE FROM public.hitos       WHERE hijo_id IN (SELECT id FROM objetivo);
DELETE FROM public.episodios   WHERE hijo_id IN (SELECT id FROM objetivo);

COMMIT;


-- -----------------------------------------------------------------------------
-- PASO 3 — Conteo DESPUES. Es el mismo SELECT del paso 1.
-- Resultado esperado: hijos = 1 y las otras 9 filas en 0.
-- -----------------------------------------------------------------------------
WITH objetivo AS (
  SELECT id FROM public.hijos WHERE nombre ILIKE '%brava%'
)
SELECT 'hijos' AS tabla, count(*) AS filas
  FROM public.hijos WHERE id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'checkins_episodio', count(*)
  FROM public.checkins_episodio
 WHERE episodio_id IN (SELECT id FROM public.episodios WHERE hijo_id IN (SELECT id FROM objetivo))
UNION ALL SELECT 'estrategia_ciclos', count(*)
  FROM public.estrategia_ciclos
 WHERE hijo_id IN (SELECT id FROM objetivo)
    OR estrategia_id IN (SELECT id FROM public.estrategias WHERE hijo_id IN (SELECT id FROM objetivo))
UNION ALL SELECT 'estrategia_sugerencias_descartadas', count(*)
  FROM public.estrategia_sugerencias_descartadas WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'estrategias', count(*)
  FROM public.estrategias WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'rutinas', count(*)
  FROM public.rutinas WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'patrones', count(*)
  FROM public.patrones WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'rasgos', count(*)
  FROM public.rasgos WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'hitos', count(*)
  FROM public.hitos WHERE hijo_id IN (SELECT id FROM objetivo)
UNION ALL SELECT 'episodios', count(*)
  FROM public.episodios WHERE hijo_id IN (SELECT id FROM objetivo);
