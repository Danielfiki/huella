-- ══════════════════════════════════════════════════════════════
-- Migración 016 — Pieza 2 de la cola: la micro-respuesta a "¿Cómo te sentiste tú?"
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- ⚠️ ORDEN: el código se despliega PRIMERO, esta migración después. El
--    código tolera que la columna no exista todavía:
--      · al LEER, `row.reflexion_respuesta` llega undefined → se lee como
--        null → el episodio se ve exactamente como hoy, sin respuesta.
--      · al ESCRIBIR, la respuesta va en un UPDATE aparte del que guarda
--        `reflexion`, así que si la columna falta se pierde la respuesta
--        pero NUNCA el texto que el padre escribió, que es lo que importa.
--
-- Contexto: el campo "¿Cómo te sentiste tú?" es lo único de la app que es
-- solo del padre, y hasta hoy caía al vacío: escribía cómo se sintió y no
-- recibía nada. Esta columna guarda 1 o 2 frases que acompañan ese
-- sentimiento, generadas al guardar el texto, para que sigan ahí al reabrir
-- el episodio desde el Historial.
--
-- La columna es además el CANDADO que evita llamadas repetidas: la
-- micro-respuesta se genera UNA sola vez por episodio, solo si esto está
-- vacío. Si el padre edita su texto después, el texto nuevo se guarda pero
-- la respuesta no se regenera. Eso protege la cuota diaria de IA (20
-- llamadas por usuario) y evita que reescribir se convierta en una forma de
-- pedir otra respuesta.
--
-- Mismo patrón que las migraciones 013, 014 y 015: columna aditiva,
-- nullable, sin default, idempotente. Los episodios que ya existen quedan en
-- null, que es exactamente "todavía sin respuesta".
-- ══════════════════════════════════════════════════════════════

-- 1. La columna. null = sin respuesta (episodio viejo, o la IA falló).
alter table public.episodios
  add column if not exists reflexion_respuesta text;

-- 2. Verificación. Debe devolver una fila: reflexion_respuesta | text | YES.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'episodios'
  and column_name = 'reflexion_respuesta';
