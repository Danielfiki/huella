-- 031 — Cancelar Mercado Pago desde Huella y Pro hasta el fin del período, 10 oct 2026.
--
-- Hasta hoy Huella no guardaba las suscripciones de Mercado Pago (las buscaba
-- en Mercado Pago por external_reference = user_id) y el webhook bajaba el Pro
-- apenas llegaba una cancelación.
--
-- suscripciones_mp: qué suscripción (preapproval) es de qué usuario, su estado
-- en Huella y hasta cuándo está pagada (`vence`). La escriben SOLO los
-- endpoints del servidor (api/mp-webhook, api/mp-verificar-suscripcion,
-- api/mp-suscripcion) con la service role. El cliente no la lee ni la escribe.
--   estado 'activa'    la suscripción cobra normalmente
--   estado 'cancelada' cancelada, con Pro hasta `vence`
--   estado 'vencida'   ya pasó `vence` y el job la cerró
--
-- vencer_pro_mp(): job de pg_cron cada 15 min. Cierra las canceladas cuyo
-- `vence` ya pasó y baja a 'free' a ese usuario si estaba en 'pro' y no le
-- queda otra suscripción de Mercado Pago activa o cancelada aún pagada, ni
-- una de Google con acceso.
--
-- No toca columnas de perfiles que escriba el cliente: no hace falta GRANT.
-- Ejecutar POR PARTES en: Supabase Dashboard -> SQL Editor -> New query.


-- ══════════════════════════════════════════
-- PASO 1 — La tabla.
-- ══════════════════════════════════════════

create table if not exists public.suscripciones_mp (
  preapproval_id text primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  estado         text not null check (estado in ('activa', 'cancelada', 'vencida')),
  vence          timestamptz,
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now()
);

create index if not exists suscripciones_mp_user_id_idx
  on public.suscripciones_mp (user_id);

alter table public.suscripciones_mp enable row level security;

revoke all on public.suscripciones_mp from anon, authenticated;

-- Esperado: "Success. No rows returned".


-- ══════════════════════════════════════════
-- PASO 2 — La función.
-- ══════════════════════════════════════════

create or replace function public.vencer_pro_mp()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  bajados integer;
begin
  with vencidas as (
    update public.suscripciones_mp
       set estado = 'vencida', actualizado = now()
     where estado = 'cancelada'
       and vence is not null
       and vence <= now()
    returning user_id
  ), bajada as (
    update public.perfiles p
       set plan = 'free'
     where p.plan = 'pro'
       and p.user_id in (select user_id from vencidas)
       and not exists (
         select 1 from public.suscripciones_mp o
          where o.user_id = p.user_id
            and (o.estado = 'activa' or (o.estado = 'cancelada' and o.vence > now()))
       )
       and not exists (
         select 1 from public.suscripciones_google g
          where g.user_id = p.user_id
            and g.estado in ('SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED')
            and g.vence > now()
       )
    returning 1
  )
  select count(*) into bajados from bajada;
  return bajados;
end;
$$;

-- Solo la corre pg_cron (como postgres): nadie desde la app.
revoke all on function public.vencer_pro_mp() from public, anon, authenticated;

-- Esperado: "Success. No rows returned".


-- ══════════════════════════════════════════
-- PASO 3 — El job, cada 15 minutos.
-- ══════════════════════════════════════════

select cron.schedule('vencer-pro-mp', '*/15 * * * *', 'select public.vencer_pro_mp()');

-- Esperado: una fila con un número (el id del job).


-- ══════════════════════════════════════════
-- PASO 4 — Comprobar.
-- ══════════════════════════════════════════

select jobname, schedule, active from cron.job where jobname in ('vencer-pro-google', 'vencer-pro-mp') order by jobname;

-- Esperado: dos filas, las dos con */15 * * * * y active true.
