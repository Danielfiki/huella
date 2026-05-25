-- ══════════════════════════════════════════════════════════════
-- Migración 003 — Rediseño de "Acción Rápida" v1.2
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Contexto: rediseño de la Acción Rápida del detalle de episodio
-- según BRIEF_ACCION_RAPIDA.md. Persiste la acción estructurada por
-- episodio (texto + autor + dimensión + bucket de tiempo) y agrega
-- el campo de anti-repetición de autor por hijo.
-- ══════════════════════════════════════════════════════════════

-- 1. Persistencia estructurada de la Acción Rápida por episodio.
--    Conviven con `orientacion_ia` (la respuesta larga, intacta).
alter table public.episodios
  add column if not exists accion_rapida_texto       text,
  add column if not exists accion_rapida_autor       text,
  add column if not exists accion_rapida_dimension   text,
  add column if not exists accion_rapida_bucket      text,
  add column if not exists accion_rapida_generada_en timestamptz;

-- 2. Anti-repetición de autor por hijo (no por episodio).
--    Se actualiza cada vez que se genera o regenera una Acción Rápida.
alter table public.hijos
  add column if not exists ultimo_autor_ia text;

-- 3. Índice para acelerar lectura del bucket en el render del Historial.
--    Pensado para el futuro: hoy la cantidad de episodios por hijo es baja.
create index if not exists episodios_accion_bucket_idx
  on public.episodios(accion_rapida_bucket)
  where accion_rapida_bucket is not null;

-- RLS: no requiere cambios. Los policies `family_data` (episodios)
-- y `hijos_*` (hijos) ya cubren acceso de escritura/lectura para
-- las columnas nuevas.
