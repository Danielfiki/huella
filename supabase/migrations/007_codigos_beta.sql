-- ══════════════════════════════════════════════════════════════
-- Migración 007 — Sistema de códigos de invitación de un solo uso
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Contexto: para invitar testers a la beta sin activar Pro tester por
-- tester con SQL a mano. Un código de un solo uso (HUELLA-01…HUELLA-20)
-- que el usuario canjea desde la app y le activa un pase Pro de 45 días.
--
-- Prerrequisito de seguridad (ya hecho, sesión 29 jun): se cerró el hueco
-- de column-grants en `perfiles` — el cliente ya NO puede escribir
-- plan/plan_beta_hasta directo. El único camino a Pro es backend (pago) o
-- una RPC security definer. Esta migración crea esa RPC.
--
-- Diseño:
--   • Tabla codigos_beta con RLS ACTIVA y SIN policies → intocable directo
--     desde el cliente; solo accesible vía la RPC security definer.
--   • RPC canjear_codigo_beta: marca el código atómicamente (update con
--     where usado=false returning → imposible usarlo dos veces) y escribe
--     plan_beta_hasta = now() + 45 días en perfiles.
--
-- Se consume desde: CuentaPage (sección de canje) y PanelPage (card CTA).
-- Tras canjear OK, la UI llama reloadData() → isPro() pasa a true al instante.
--
-- ⚠ Correr los 4 bloques de abajo UNO POR UNO en el SQL Editor.
-- ══════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 1 de 4 — Tabla codigos_beta (RLS activa, sin policies)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.codigos_beta (
  codigo      text primary key,
  usado       boolean     not null default false,
  usado_por   uuid        references auth.users(id),
  usado_en    timestamptz,
  nota        text,
  created_at  timestamptz not null default now()
);

-- RLS activa SIN policies: nadie (authenticated ni anon) puede leer ni
-- escribir la tabla directo. El único acceso es vía canjear_codigo_beta,
-- que corre como owner (security definer) y saltea RLS.
alter table public.codigos_beta enable row level security;

-- Éxito esperado: "Success. No rows returned".


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 2 de 4 — RPC canjear_codigo_beta (security definer)
-- ──────────────────────────────────────────────────────────────

create or replace function public.canjear_codigo_beta(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid            uuid;
  v_codigo         text;
  v_marcado        text;
  v_existe         boolean;
  v_plan_beta      timestamptz;
begin
  -- 1. Debe haber usuario autenticado.
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  -- Normaliza el código como se guardó (mayúsculas, sin espacios de borde).
  v_codigo := upper(trim(p_codigo));

  -- 2. Canje atómico: marca el código SOLO si sigue sin usar. El where
  --    usado = false + returning lo hace imposible de usar dos veces, aun
  --    con dos canjes simultáneos (uno gana la fila, el otro no la toca).
  update public.codigos_beta
     set usado     = true,
         usado_por = v_uid,
         usado_en  = now()
   where codigo = v_codigo
     and usado  = false
  returning codigo into v_marcado;

  -- 3. No se marcó ninguna fila: distinguir por qué.
  if v_marcado is null then
    select exists (
      select 1 from public.codigos_beta where codigo = v_codigo
    ) into v_existe;

    if v_existe then
      -- El código existe pero ya estaba usado.
      return jsonb_build_object('ok', false, 'error', 'ya_usado');
    else
      -- El código no existe.
      return jsonb_build_object('ok', false, 'error', 'invalido');
    end if;
  end if;

  -- 4. Canje OK: activa el pase Pro de 45 días en el perfil del usuario.
  update public.perfiles
     set plan_beta_hasta = now() + interval '45 days'
   where user_id = v_uid
  returning plan_beta_hasta into v_plan_beta;

  return jsonb_build_object(
    'ok',              true,
    'plan_beta_hasta', v_plan_beta
  );
end;
$$;

grant execute on function public.canjear_codigo_beta(text) to authenticated;

-- Éxito esperado: "Success. No rows returned".


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 3 de 4 — Los 20 códigos (HUELLA-01 … HUELLA-20)
-- ──────────────────────────────────────────────────────────────

insert into public.codigos_beta (codigo) values
  ('HUELLA-01'),
  ('HUELLA-02'),
  ('HUELLA-03'),
  ('HUELLA-04'),
  ('HUELLA-05'),
  ('HUELLA-06'),
  ('HUELLA-07'),
  ('HUELLA-08'),
  ('HUELLA-09'),
  ('HUELLA-10'),
  ('HUELLA-11'),
  ('HUELLA-12'),
  ('HUELLA-13'),
  ('HUELLA-14'),
  ('HUELLA-15'),
  ('HUELLA-16'),
  ('HUELLA-17'),
  ('HUELLA-18'),
  ('HUELLA-19'),
  ('HUELLA-20')
on conflict (codigo) do nothing;

-- Éxito esperado: "Success. 20 rows" (o menos si algún código ya existía).


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 4 de 4 — Monitoreo de uso (SELECT, no modifica nada)
-- Corre este cuando quieras ver cuáles códigos se usaron y por quién.
-- ──────────────────────────────────────────────────────────────

select
  c.codigo,
  c.usado,
  c.usado_en,
  u.email as usado_por_email
from public.codigos_beta c
left join auth.users u on u.id = c.usado_por
order by c.usado desc, c.codigo asc;
