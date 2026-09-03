-- ══════════════════════════════════════════════════════════════
-- Migración 015 — Bloque 3 del onboarding: el origen de un episodio
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- ⚠️ ORDEN: el código se despliega PRIMERO, esta migración después. El
--    código tolera que la columna no exista todavía:
--      · al LEER, `row.origen` llega undefined → se lee como null → el
--        episodio se comporta como uno registrado a mano.
--      · al ESCRIBIR, `origen` va en un UPDATE aparte del INSERT
--        (onboardingPersistor.crearPrimerEpisodio), así que si la columna
--        falta se pierde la marca pero NUNCA el episodio ni su orientación.
--
-- Contexto: el texto que el padre escribe en el acto B del onboarding ("tu
-- primer momento") se guarda como el primer episodio real del hijo, con su
-- orientación completa generada en segundo plano. Esta columna deja dicho
-- que ese episodio nació ahí y no del registro normal, para poder
-- distinguirlos después (métricas, copy especial en la tarjeta, etc.).
--
-- Mismo patrón que las migraciones 013 y 014: columna aditiva, nullable, sin
-- default, idempotente. Los episodios que ya existen quedan en null, que es
-- exactamente "registrado a mano".
-- ══════════════════════════════════════════════════════════════

-- 1. La columna. null = registro normal; 'onboarding' = nació del acto B.
alter table public.episodios
  add column if not exists origen text;

-- 2. Solo el valor que hoy existe. Si mañana aparece otro origen (importación,
--    pareja, etc.) se amplía el CHECK en una migración nueva.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'episodios_origen_check'
  ) then
    alter table public.episodios
      add constraint episodios_origen_check
      check (origen is null or origen = 'onboarding');
  end if;
end $$;

-- 3. Verificación. Debe devolver una fila: origen | text | YES.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'episodios'
  and column_name = 'origen';
