-- =============================================================================
-- retencion.sql — hora de registro y retencion por cohorte (solo lectura)
-- =============================================================================
--
-- QUE MIDE
--   A. A que hora registran los papas (franjas de 1 hora, hora de Chile).
--   B. Retencion D1 / D7 / D30 por cohorte semanal.
--   C. Cuantos usuarios distintos entran en la medicion hoy.
--
-- DE DONDE SALE
--   Momentos = episodios + hitos (avances). Se usa `created_at`, que es cuando
--   se REGISTRO el momento (migracion 020, 16 sep 2026). `fecha` NO sirve:
--   es cuando paso, y la declara el papa con los chips.
--   Filas con created_at null (anteriores al 16 sep) no entran.
--
-- QUE SE EXCLUYE
--   Los momentos de La brava (perfil de prueba), mismo filtro que
--   reset_hijo.sql: nombre ILIKE '%brava%'.
--   Los otros hijos de la cuenta de Daniel NO se excluyen: su user_id no esta
--   en ESTADO.md. Momentos sin hijo (hijo_id null) si se cuentan.
--
-- COMO SE USA
--   Cada bloque va en su propio "+ New query" del SQL Editor de Supabase.
--   Solo SELECT: no modifica nada.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BLOQUE A — Hora de registro.
-- Resultado esperado: 24 filas, una por franja (00:00-00:59 ... 23:00-23:59),
-- incluidas las que tienen 0.
--   momentos / pct             : total y % sobre todos los momentos
--   episodios / pct_episodios  : % sobre el total de episodios
--   avances / pct_avances      : % sobre el total de avances
-- -----------------------------------------------------------------------------
WITH excluidos AS (
  SELECT id FROM public.hijos WHERE nombre ILIKE '%brava%'
),
momentos AS (
  SELECT 'episodio' AS tipo, created_at, hijo_id
    FROM public.episodios WHERE created_at IS NOT NULL
  UNION ALL
  SELECT 'avance', created_at, hijo_id
    FROM public.hitos WHERE created_at IS NOT NULL
),
filtrados AS (
  SELECT m.tipo,
         extract(hour FROM m.created_at AT TIME ZONE 'America/Santiago')::int AS hora
    FROM momentos m
   WHERE NOT EXISTS (SELECT 1 FROM excluidos x WHERE x.id = m.hijo_id)
)
SELECT lpad(h::text, 2, '0') || ':00-' || lpad(h::text, 2, '0') || ':59' AS franja,
       count(f.hora) AS momentos,
       round(100.0 * count(f.hora)
             / nullif(sum(count(f.hora)) OVER (), 0), 1) AS pct,
       count(f.hora) FILTER (WHERE f.tipo = 'episodio') AS episodios,
       round(100.0 * count(f.hora) FILTER (WHERE f.tipo = 'episodio')
             / nullif(sum(count(f.hora) FILTER (WHERE f.tipo = 'episodio')) OVER (), 0), 1) AS pct_episodios,
       count(f.hora) FILTER (WHERE f.tipo = 'avance') AS avances,
       round(100.0 * count(f.hora) FILTER (WHERE f.tipo = 'avance')
             / nullif(sum(count(f.hora) FILTER (WHERE f.tipo = 'avance')) OVER (), 0), 1) AS pct_avances
  FROM generate_series(0, 23) AS h
  LEFT JOIN filtrados f ON f.hora = h
 GROUP BY h
 ORDER BY h;


-- -----------------------------------------------------------------------------
-- BLOQUE B — Retencion por cohorte.
-- Cohorte = lunes (hora Chile) de la semana del PRIMER momento con created_at
-- de cada usuario. Usuario = el adulto que registro (user_id del momento).
-- D1 / D7 / D30 = registro otro momento 1, 7 o 30 dias calendario (hora Chile)
-- despues de su primer dia, o mas tarde.
--
-- base_dN = usuarios de la cohorte que ya llevan N dias desde su primer
-- momento. El % se calcula sobre esa base, no sobre todos: quien empezo ayer
-- todavia no puede tener D7. Si la base es 0, el % sale null.
--
-- OJO 1: D30 no tiene sentido hasta el 16 oct 2026 (30 dias despues del primer
--        created_at posible). Antes de esa fecha base_d30 es 0 y d30_pct null.
-- OJO 2: la cohorte del 14 sep mezcla usuarios nuevos con usuarios que ya
--        registraban antes del 16 sep: para la medicion "empiezan" ese dia.
--
-- Resultado esperado: una fila por semana desde la del 14 sep 2026.
-- -----------------------------------------------------------------------------
WITH excluidos AS (
  SELECT id FROM public.hijos WHERE nombre ILIKE '%brava%'
),
momentos AS (
  SELECT m.user_id,
         (m.created_at AT TIME ZONE 'America/Santiago')::date AS dia
    FROM (
      SELECT user_id, created_at, hijo_id
        FROM public.episodios WHERE created_at IS NOT NULL
      UNION ALL
      SELECT user_id, created_at, hijo_id
        FROM public.hitos WHERE created_at IS NOT NULL
    ) m
   WHERE NOT EXISTS (SELECT 1 FROM excluidos x WHERE x.id = m.hijo_id)
),
primero AS (
  SELECT user_id, min(dia) AS dia0
    FROM momentos
   GROUP BY user_id
),
por_usuario AS (
  SELECT p.user_id,
         p.dia0,
         date_trunc('week', p.dia0)::date AS cohorte,
         bool_or(m.dia >= p.dia0 + 1)  AS d1,
         bool_or(m.dia >= p.dia0 + 7)  AS d7,
         bool_or(m.dia >= p.dia0 + 30) AS d30
    FROM primero p
    JOIN momentos m ON m.user_id = p.user_id
   GROUP BY p.user_id, p.dia0
),
hoy AS (
  SELECT (now() AT TIME ZONE 'America/Santiago')::date AS dia
)
SELECT u.cohorte,
       count(*) AS usuarios,
       count(*) FILTER (WHERE u.dia0 <= hoy.dia - 1) AS base_d1,
       round(100.0 * count(*) FILTER (WHERE u.d1)
             / nullif(count(*) FILTER (WHERE u.dia0 <= hoy.dia - 1), 0), 1) AS d1_pct,
       count(*) FILTER (WHERE u.dia0 <= hoy.dia - 7) AS base_d7,
       round(100.0 * count(*) FILTER (WHERE u.d7)
             / nullif(count(*) FILTER (WHERE u.dia0 <= hoy.dia - 7), 0), 1) AS d7_pct,
       count(*) FILTER (WHERE u.dia0 <= hoy.dia - 30) AS base_d30,
       round(100.0 * count(*) FILTER (WHERE u.d30)
             / nullif(count(*) FILTER (WHERE u.dia0 <= hoy.dia - 30), 0), 1) AS d30_pct
  FROM por_usuario u
 CROSS JOIN hoy
 GROUP BY u.cohorte, hoy.dia
 ORDER BY u.cohorte;


-- -----------------------------------------------------------------------------
-- BLOQUE C — Usuarios distintos con momentos con created_at, hoy.
-- Mismo filtro que A y B (sin La brava). Resultado esperado: 1 fila, 1 numero,
-- igual a la suma de la columna `usuarios` del bloque B.
-- -----------------------------------------------------------------------------
SELECT count(DISTINCT m.user_id) AS usuarios
  FROM (
    SELECT user_id, hijo_id FROM public.episodios WHERE created_at IS NOT NULL
    UNION ALL
    SELECT user_id, hijo_id FROM public.hitos WHERE created_at IS NOT NULL
  ) m
 WHERE NOT EXISTS (
   SELECT 1 FROM public.hijos h
    WHERE h.id = m.hijo_id AND h.nombre ILIKE '%brava%'
 );
