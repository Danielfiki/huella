-- ══════════════════════════════════════════════════════════════
-- Migración 005 — Idempotencia + Atomicidad de Estrategias (Sesión C)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- ⚠️ ESTOS OBJETOS YA FUERON APLICADOS MANUALMENTE EN PRODUCCIÓN vía el
-- SQL Editor (mayo 2026) y están verificados en prod. Este archivo los
-- versiona en el repo para dejar registro. Es idempotente (if not exists /
-- create or replace), así que re-correrlo es seguro. La BD viva es la
-- fuente de verdad: si algo diverge, reconciliar contra
-- `select pg_get_functiondef(oid) from pg_proc where proname = 'crear_estrategia_con_ciclo';`
--
-- Contexto:
--   (a) Fix #2 — idempotencia: un doble-tap/reentrada en "Iniciar nuevo
--       ciclo" podía insertar ciclos duplicados. El índice único lo hace
--       imposible a nivel BD (complementa el guard useRef del cliente,
--       commit e1826b7).
--   (b) Fix #1 — atomicidad: crear un plan hacía 2 inserts separados
--       (estrategias + estrategia_ciclos) sin transacción; si el segundo
--       fallaba podía quedar una estrategia huérfana sin ciclos. La RPC
--       crea ambos en una sola transacción (todo o nada). El cliente
--       (crearEstrategiaConCiclo) la llama en commit 9b39f03.
-- ══════════════════════════════════════════════════════════════

-- ── (a) Índice único: previene ciclos duplicados ──────────────────
-- Requiere que NO existan duplicados previos de (estrategia_id, numero_ciclo).
-- Auditoría previa (debe devolver 0 filas antes de crear el índice):
--   select estrategia_id, numero_ciclo, count(*)
--   from public.estrategia_ciclos
--   group by estrategia_id, numero_ciclo having count(*) > 1;
create unique index if not exists estrategia_ciclos_unq_numero
  on public.estrategia_ciclos (estrategia_id, numero_ciclo);

-- ── (b) RPC atómica: crea estrategia + ciclo 1 en una transacción ──
-- security invoker → corre bajo las RLS del usuario (family_data exige
-- with check auth.uid() = user_id, que se cumple porque seteamos user_id
-- con auth.uid()). duracion_semanas se deriva del plan (el cliente ya no
-- la calcula). Retorna la fila de estrategias (los callers usan .id).
create or replace function public.crear_estrategia_con_ciclo(
  p_hijo_id uuid default null,
  p_habilidad text default null,
  p_habilidad_grupo text default null,
  p_descripcion text default null,
  p_fecha_inicio timestamptz default null,
  p_episodio_origen_id uuid default null,
  p_episodios_detonantes_ids uuid[] default '{}',
  p_plan jsonb default null
)
returns public.estrategias
language plpgsql
security invoker
as $$
declare
  v_estrategia public.estrategias%rowtype;
  v_duracion   int;
begin
  -- Duración derivada del plan (cantidad de semanas); 4 por defecto.
  v_duracion := case
    when jsonb_typeof(p_plan->'semanas') = 'array'
      then jsonb_array_length(p_plan->'semanas')
    else 4
  end;

  insert into public.estrategias (
    user_id, hijo_id, habilidad, habilidad_grupo, descripcion,
    fecha_inicio, episodio_origen_id, episodios_detonantes_ids
  ) values (
    auth.uid(), p_hijo_id, p_habilidad, p_habilidad_grupo, p_descripcion,
    coalesce(p_fecha_inicio, now()), p_episodio_origen_id,
    coalesce(p_episodios_detonantes_ids, '{}')
  ) returning * into v_estrategia;

  insert into public.estrategia_ciclos (
    estrategia_id, user_id, hijo_id, numero_ciclo, estado,
    plan, semana_actual, duracion_semanas, usar_memoria_ia
  ) values (
    v_estrategia.id, auth.uid(), p_hijo_id, 1, 'activo',
    p_plan, 1, v_duracion, false
  );

  return v_estrategia;
end;
$$;

grant execute on function public.crear_estrategia_con_ciclo(
  uuid, text, text, text, timestamptz, uuid, uuid[], jsonb
) to authenticated;
