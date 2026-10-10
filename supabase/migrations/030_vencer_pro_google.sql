-- 030 — El Pro de Google se apaga solo al llegar "vence", 10 oct 2026.
--
-- Hasta hoy el Pro de Google (perfiles.plan = 'pro') solo bajaba cuando Google
-- avisaba al servidor (api/play-rtdn) o cuando la app se abría y volvía a
-- verificar. Si ese aviso no llegaba y el papá no abría la app, el Pro seguía
-- para siempre.
--
-- Esto agrega un job de pg_cron que cada 15 minutos busca suscripciones de
-- Google que la base todavía tiene con acceso pero cuya fecha `vence` ya pasó:
--   * las marca 'VENCIDA_SIN_AVISO' (una sola vez por compra, así un Pro que
--     después pague por Mercado Pago no vuelve a bajar en cada corrida), y
--   * baja a 'free' a ese usuario si estaba en 'pro' y no le queda otra
--     suscripción de Google con acceso (mismo criterio que api/_lib/play.js).
--
-- Si en realidad renovó y el aviso de Google no llegó, al abrir la app
-- (restaurarComprasPlay → api/play-verificar) se relee Google y vuelve a 'pro'
-- con el `vence` nuevo.
--
-- No toca columnas de perfiles que escriba el cliente: no hace falta GRANT.
-- Ejecutar POR PARTES en: Supabase Dashboard -> SQL Editor -> New query.


-- ══════════════════════════════════════════
-- PASO 1 — La función.
-- ══════════════════════════════════════════

create or replace function public.vencer_pro_google()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  bajados integer;
begin
  with vencidas as (
    update public.suscripciones_google
       set estado = 'VENCIDA_SIN_AVISO', actualizado = now()
     where estado in ('SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED')
       and vence is not null
       and vence <= now()
    returning user_id
  ), bajada as (
    update public.perfiles p
       set plan = 'free'
     where p.plan = 'pro'
       and p.user_id in (select user_id from vencidas)
       and not exists (
         select 1 from public.suscripciones_google o
          where o.user_id = p.user_id
            and o.estado in ('SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED')
            and o.vence > now()
       )
    returning 1
  )
  select count(*) into bajados from bajada;
  return bajados;
end;
$$;

-- Solo la corre pg_cron (como postgres): nadie desde la app.
revoke all on function public.vencer_pro_google() from public, anon, authenticated;

-- Esperado: "Success. No rows returned".


-- ══════════════════════════════════════════
-- PASO 2 — El job, cada 15 minutos.
-- ══════════════════════════════════════════

select cron.schedule('vencer-pro-google', '*/15 * * * *', 'select public.vencer_pro_google()');

-- Esperado: una fila con un número (el id del job).


-- ══════════════════════════════════════════
-- PASO 3 — Comprobar.
-- ══════════════════════════════════════════

select jobname, schedule, command, active from cron.job where jobname = 'vencer-pro-google';

-- Esperado: una fila, schedule */15 * * * *, active true.
