-- ════════════════════════════════════════════════════════════════════
-- Migración · Estrategias rediseño
-- Pegar en SQL Editor de Supabase
--
-- IMPORTANTE: este repo NO tiene tabla relacional 'estrategia_semanas'.
-- Las semanas, tareas y reflexiones viven dentro de JSONB en la tabla
-- 'estrategias' (campos: plan JSONB, checkins JSONB).
-- ════════════════════════════════════════════════════════════════════

-- 1) Tabla nueva: descartes de sugerencias IA
--    Persiste el estado del ✕ en SugerenciaIACard.
--    Reaparece si fingerprint cambia o pasaron > 14 días.
create table if not exists estrategia_sugerencias_descartadas (
  id            uuid primary key default gen_random_uuid(),
  hijo_id       uuid not null references hijos(id) on delete cascade,
  fingerprint   text not null,
  habilidad_id  text,
  descartada_at timestamptz not null default now(),
  unique (hijo_id, fingerprint)
);

create index if not exists idx_sug_desc_hijo
  on estrategia_sugerencias_descartadas (hijo_id);

-- RLS
alter table estrategia_sugerencias_descartadas enable row level security;

create policy "select propio" on estrategia_sugerencias_descartadas
  for select using (
    hijo_id in (select id from hijos where user_id = auth.uid())
  );
create policy "insert propio" on estrategia_sugerencias_descartadas
  for insert with check (
    hijo_id in (select id from hijos where user_id = auth.uid())
  );
create policy "delete propio" on estrategia_sugerencias_descartadas
  for delete using (
    hijo_id in (select id from hijos where user_id = auth.uid())
  );

-- 2) Columnas en estrategias — agregar las que falten.
--    Usar IF NOT EXISTS para que sea idempotente.
alter table estrategias
  add column if not exists episodios_detonantes_ids uuid[] default '{}',
  add column if not exists habilidad_grupo text,
  add column if not exists semana_actual integer default 1,
  add column if not exists total_semanas integer default 4,
  add column if not exists completado_at timestamptz,
  add column if not exists abandonado_at timestamptz;

-- 3) Migración de datos: copiar episodio_origen_id (uuid singular existente)
--    al nuevo array episodios_detonantes_ids para no perder planes ya creados.
--    Sólo actualiza filas donde el array nuevo está vacío y existe el legado.
update estrategias
   set episodios_detonantes_ids = array[episodio_origen_id]
 where (episodios_detonantes_ids is null or array_length(episodios_detonantes_ids, 1) is null)
   and episodio_origen_id is not null;

-- 4) Reflexiones semanales y tareas: NO se crea tabla relacional.
--    Persistir dentro de JSONB existente:
--      - estrategias.plan  → array de semanas con sus tareas
--      - estrategias.checkins → array de { semana_numero, reflexion, completada_at }
--    El reducer y los servicios escriben directo al JSONB con jsonb_set
--    o reemplazando el objeto entero. Ver README §6 para el shape exacto.

-- 5) (Iteración futura · NO ejecutar ahora — incluido como referencia)
--    Cuando se incorpore "pausar plan":
-- alter table estrategias add column pausado_at timestamptz;
