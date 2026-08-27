-- ══════════════════════════════════════════════════════════════
-- Migración 014 — Paso 8 del Cerebro Huella: la zona de la orientación
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- ⚠️ ORDEN OBLIGATORIO: el código se despliega PRIMERO, esta migración
--    después. El código tolera que la columna no exista todavía:
--      · al LEER, `row.orientacion_zona` llega undefined → se lee como null
--        → el episodio se comporta como uno viejo (sin enlace, sin error).
--      · al ESCRIBIR, la zona va en un UPDATE aparte del texto, así que si
--        la columna falta se pierde la zona pero NUNCA la orientación.
--
-- Contexto: cuando la orientación de un episodio se explica por una zona del
-- cerebro, la IA la marca al final de su respuesta. El texto se guarda limpio
-- en `orientacion_ia` (el marcador nunca se persiste: saldría impreso en el
-- informe PDF) y el slug de la zona vive acá, en su propia columna.
--
-- Mismo patrón que la migración 003 de la Acción Rápida: columnas
-- estructuradas conviviendo con la respuesta larga de texto.
-- ══════════════════════════════════════════════════════════════

-- 1. La columna. Nullable a propósito: null significa "sin zona", y es el
--    caso normal en tres situaciones legítimas — episodios anteriores a esta
--    migración, episodios donde ninguna zona explica lo que pasó, y episodios
--    que ameritan mirada profesional (ahí la IA devuelve "ninguna" y no se
--    ofrece el enlace, para no distraer del cierre sereno).
alter table public.episodios
  add column if not exists orientacion_zona text;

-- 2. Los seis slugs válidos, los mismos de ZONAS en contenidoCerebro.js.
--    El CHECK acepta null: es un valor esperado, no un error.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'episodios_orientacion_zona_check'
  ) then
    alter table public.episodios
      add constraint episodios_orientacion_zona_check
      check (orientacion_zona is null or orientacion_zona = any (array[
        'amigdala'::text, 'frontal'::text, 'hipocampo'::text,
        'cerebelo'::text, 'tronco'::text, 'corteza'::text
      ]));
  end if;
end $$;

-- RLS: no requiere cambios. La policy `family_data` de `episodios` ya cubre
-- lectura y escritura de la columna nueva.

-- Verificación (debe devolver 1 fila: orientacion_zona | text | YES):
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'episodios'
  and column_name  = 'orientacion_zona';
