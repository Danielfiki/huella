-- ══════════════════════════════════════════════════════════════
-- Migración 020 — `created_at` en los momentos (episodios e hitos)
-- `fecha` guarda CUÁNDO PASÓ el momento; `created_at`, CUÁNDO SE REGISTRÓ.
-- Con las dos separadas se puede medir retención y la hora real de registro.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Estado: APLICADO en producción el 16 sep 2026 y verificado por
--         information_schema en las dos tablas (is_nullable YES, default now()).
--
-- Por qué hacía falta: hoy `fecha` mezcla las dos cosas sin marca que las
-- distinga. En NuevoPage, EstrategiaDetailPage, onboardingPersistor y el chip
-- "Ahora" vale el instante del registro; en los chips "Esta mañana" (09:00
-- fijo), "Esta tarde" (15:00 fijo), "Ayer" y el selector custom vale un momento
-- declarado por el padre. Ninguna de las dos tablas tenía `created_at`, así que
-- el instante real del registro no quedaba en ninguna parte.
--
-- 🔴 LA COLUMNA ES NULLABLE A PROPÓSITO, Y POR ESO VA EN DOS PASOS.
-- Primero `add column` SIN default, después `alter column ... set default`.
-- Un `not null default now()` en un solo paso le habría puesto a TODAS las
-- filas viejas la fecha de la migración, que es un dato falso: esos momentos
-- no se registraron ese día. En dos pasos las filas anteriores quedan en NULL
-- —"no se sabe", que es la verdad— y solo las nuevas toman `now()`.
--
-- ⚠️ Consecuencia para las métricas: retención y hora de registro se calculan
-- SOLO sobre filas con `created_at` no nulo, o sea momentos creados desde el
-- 16 sep 2026. Las anteriores no entran, y no se pueden reconstruir.
--
-- SIN GRANT: la columna la escribe la base con su default, nunca el cliente.
-- `public.perfiles` tiene GRANT por columna en lista blanca, pero `episodios` e
-- `hitos` no usan ese patrón, y aunque lo usaran esta columna no necesita
-- permiso de escritura: si el cliente no la manda, el default la llena.
--
-- Columna aditiva e idempotente, mismo patrón que las migraciones 013, 014 y
-- 015.
-- ══════════════════════════════════════════════════════════════

-- 1. La columna en los dos lados, SIN default. Los momentos son episodios +
--    hitos, así que las métricas necesitan el mismo dato en ambas o quedan
--    cojas. Al no haber default, las filas que ya existen quedan en NULL.
alter table public.episodios
  add column if not exists created_at timestamptz;

alter table public.hitos
  add column if not exists created_at timestamptz;

-- 2. Recién ahora el default. Aplica solo a los INSERT que vengan después, así
--    que no toca ninguna de las filas del paso 1.
alter table public.episodios
  alter column created_at set default now();

alter table public.hitos
  alter column created_at set default now();

-- 3. Qué significa cada una, escrito en la base para que no se confundan al
--    leerlas desde el SQL Editor.
comment on column public.episodios.fecha is
  'Cuándo PASÓ el episodio: lo declara el padre con los chips de "¿cuándo fue?". No es cuándo se registró.';

comment on column public.episodios.created_at is
  'Cuándo se REGISTRÓ el episodio. Lo pone la base. Es el dato válido para retención y hora de uso. Null en filas anteriores al 16 sep 2026.';

comment on column public.hitos.fecha is
  'Cuándo PASÓ el avance. Hoy la app siempre escribe el instante del registro porque NuevoPage no tiene selector de fecha.';

comment on column public.hitos.created_at is
  'Cuándo se REGISTRÓ el avance. Lo pone la base. Es el dato válido para retención y hora de uso. Null en filas anteriores al 16 sep 2026.';

-- 4. Verificación. Debe devolver DOS filas, ambas:
--    <tabla> | created_at | timestamptz | YES | now()
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('episodios', 'hitos')
  and column_name = 'created_at'
order by table_name;
