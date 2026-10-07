-- 029 — Suscripciones de Google Play (app de Android), 7 oct 2026.
--
-- Guarda qué compra de Google Play (purchaseToken) es de qué usuario, con el
-- estado y el vencimiento que informa Google. La escriben SOLO los endpoints
-- del servidor (api/play-verificar y api/play-rtdn) con la service role, que
-- salta RLS. El cliente no lee ni escribe esta tabla: por eso RLS queda
-- encendida sin ninguna policy y se quitan los permisos de anon/authenticated.
--
-- El Pro sigue viviendo donde siempre: perfiles.plan = 'pro' (igual que
-- Mercado Pago). Esta migración NO toca perfiles ni sus GRANT por columna.

create table if not exists public.suscripciones_google (
  purchase_token        text primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  product_id            text not null,
  estado                text not null,
  vence                 timestamptz,
  renovacion_automatica boolean,
  token_anterior        text,
  creado                timestamptz not null default now(),
  actualizado           timestamptz not null default now()
);

create index if not exists suscripciones_google_user_id_idx
  on public.suscripciones_google (user_id);

alter table public.suscripciones_google enable row level security;

revoke all on public.suscripciones_google from anon, authenticated;
