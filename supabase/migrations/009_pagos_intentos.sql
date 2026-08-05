-- ══════════════════════════════════════════════════════════════
-- Migración 009 — Tabla pagos_intentos (telemetría de pagos)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Contexto: hoy no existe NINGÚN registro de intentos de pago. El único
-- rastro es `console.error` en Vercel, que en el plan Hobby vive 1 hora.
-- Cuando un usuario reporta que no pudo pagar, quedamos ciegos: no se
-- puede saber si tocó el botón, si el endpoint respondió, ni qué dijo
-- Mercado Pago. Esta tabla deja huella de cada intento.
--
-- Esto NO es data de usuario: es telemetría interna de diagnóstico.
-- No se muestra en la app ni se lee desde el cliente. Lo único que el
-- usuario ve es la `referencia` (HP-XXXXXX) cuando algo falla, para
-- poder dictarla y cruzarla contra la fila exacta.
--
-- Diseño:
--   • RLS ACTIVA y SIN policies → intocable con anon key, igual que
--     `codigos_beta` (migración 007). Solo escribe el backend con
--     SUPABASE_SERVICE_ROLE_KEY (service_role saltea RLS) y solo se
--     consulta desde el SQL Editor.
--   • `origen` distingue quién originó el dato ('cliente' | 'endpoint'),
--     NO quién hizo el insert: el insert SIEMPRE lo hace el backend.
--     Un evento de cliente (botón tocado, redirect) llega al backend y
--     este lo escribe con origen = 'cliente'.
--   • Toda columna que puede faltar es nullable y las de valores cerrados
--     tienen default. Regla de oro: registrar de más es barato; que un
--     insert de telemetría rompa el pago es inaceptable.
--
-- ⚠ Correr los 5 bloques de abajo UNO POR UNO en el SQL Editor.
-- ══════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 1 de 5 — Tabla pagos_intentos (RLS activa, sin policies)
-- ──────────────────────────────────────────────────────────────

create table if not exists public.pagos_intentos (
  id            uuid        primary key default gen_random_uuid(),

  -- Código corto y legible que se le muestra al usuario cuando falla,
  -- para que lo dicte por teléfono/WhatsApp. El default se conecta en el
  -- BLOQUE 3 (la función necesita que la tabla ya exista).
  referencia    text        not null unique,

  -- Nullable a propósito: el intento puede cortar ANTES de resolver la
  -- sesión de Supabase (que es justo uno de los cortes que buscamos).
  -- `set null` y no `cascade`: si el usuario borra su cuenta se pierde el
  -- vínculo, pero el rastro de diagnóstico se conserva.
  user_id       uuid        references auth.users(id)      on delete set null,
  family_id     uuid        references public.families(id) on delete set null,

  -- Quién originó el evento. El insert siempre lo hace el backend.
  origen        text        not null default 'endpoint'
                            check (origen in ('cliente', 'endpoint')),

  -- Hasta dónde llegó el flujo:
  --   boton       → el cuidador tocó "Activar Huella Pro" (origen cliente)
  --   endpoint    → /api/mp-crear-suscripcion recibió la llamada
  --   preapproval → Mercado Pago respondió y devolvió init_point
  --   redirect    → el navegador se fue al init_point (origen cliente)
  --   fallo       → cortó y no se pudo determinar dónde (también el default,
  --                 para que un insert incompleto entre igual y no se pierda)
  etapa         text        not null default 'fallo'
                            check (etapa in ('boton', 'endpoint', 'preapproval', 'redirect', 'fallo')),

  resultado     text        not null default 'ok'
                            check (resultado in ('ok', 'error')),

  -- Texto libre a propósito (no jsonb): si el detalle de MP viene
  -- malformado, un jsonb inválido haría fallar el insert y perderíamos
  -- justo el error que estamos cazando. Acá entra cualquier cosa.
  error_mensaje text,
  error_detalle text,

  -- El caso que estamos cazando (bfcache dejando el botón pegado en
  -- "Redirigiéndote al pago…") NO se reproduce en Chrome de escritorio:
  -- distinguir celular de escritorio es el dato clave del diagnóstico.
  user_agent    text,
  plataforma    text,  -- sugerido: 'movil' | 'escritorio' | 'tablet' | null

  created_at    timestamptz not null default now()
);

-- RLS activa SIN policies: ni anon ni authenticated pueden leer o escribir.
-- service_role saltea RLS, así que el backend escribe sin problema.
alter table public.pagos_intentos enable row level security;

-- Defensa en profundidad: además de RLS, sacamos los grants por defecto
-- que Supabase le da a anon/authenticated sobre tablas nuevas del schema.
revoke all on public.pagos_intentos from anon, authenticated;

-- Éxito esperado: "Success. No rows returned".


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 2 de 5 — Índices de consulta
-- ──────────────────────────────────────────────────────────────

-- Lo más frecuente: "muéstrame los últimos intentos".
create index if not exists pagos_intentos_created_at_idx
  on public.pagos_intentos (created_at desc);

-- "Muéstrame solo lo que falló" (índice parcial: liviano).
create index if not exists pagos_intentos_errores_idx
  on public.pagos_intentos (created_at desc)
  where resultado = 'error';

-- "Todos los intentos de este usuario que reclamó".
create index if not exists pagos_intentos_user_id_idx
  on public.pagos_intentos (user_id);

-- Éxito esperado: "Success. No rows returned".


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 3 de 5 — Generador de referencia HP-XXXXXX + default
-- ──────────────────────────────────────────────────────────────

-- Alfabeto de 32 caracteres SIN los ambiguos al dictar por teléfono:
-- fuera 0/O y 1/I/L. 32^6 = 1.073.741.824 combinaciones posibles.
-- El loop reintenta si sale una repetida, así que el unique nunca puede
-- hacer fallar un insert de telemetría.
create or replace function public.gen_referencia_pago()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_largo    constant int  := length(v_alfabeto);
  v_ref      text;
  i          int;
begin
  loop
    v_ref := 'HP-';
    for i in 1..6 loop
      v_ref := v_ref || substr(v_alfabeto, 1 + floor(random() * v_largo)::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.pagos_intentos where referencia = v_ref
    );
  end loop;
  return v_ref;
end;
$$;

-- Ahora sí: la referencia se genera sola. El backend NO tiene que
-- calcularla; inserta y lee la referencia de vuelta con `returning`.
alter table public.pagos_intentos
  alter column referencia set default public.gen_referencia_pago();

-- Éxito esperado: "Success. No rows returned".


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 4 de 5 — Documentación de la tabla (comments)
-- ──────────────────────────────────────────────────────────────

comment on table public.pagos_intentos is
  'Telemetría interna de intentos de pago de Huella Pro. NO es data de usuario. RLS activa sin policies: solo escribe el backend con service role, solo se consulta desde el SQL Editor.';

comment on column public.pagos_intentos.referencia is
  'Código corto HP-XXXXXX que se le muestra al usuario cuando el pago falla, para que lo dicte y podamos ubicar esta fila exacta.';
comment on column public.pagos_intentos.origen is
  'Quién originó el evento (cliente | endpoint). El INSERT siempre lo hace el backend con service role.';
comment on column public.pagos_intentos.etapa is
  'Hasta dónde llegó el flujo: boton, endpoint, preapproval, redirect, fallo.';
comment on column public.pagos_intentos.error_detalle is
  'Texto libre. Acá va serializada la respuesta cruda de Mercado Pago cuando hay error.';
comment on column public.pagos_intentos.plataforma is
  'Derivada del user agent. Sugerido: movil | escritorio | tablet. Sin check para que un valor inesperado nunca haga fallar el registro.';

-- Éxito esperado: "Success. No rows returned".


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 5 de 5 — Consulta de monitoreo (SELECT, no modifica nada)
-- Corre esta cuando un usuario reporte que no pudo pagar.
-- Si te dictó una referencia, agrega:  where p.referencia = 'HP-XXXXXX'
-- ──────────────────────────────────────────────────────────────

select
  p.created_at,
  p.referencia,
  p.origen,
  p.etapa,
  p.resultado,
  p.plataforma,
  u.email,
  p.error_mensaje,
  p.error_detalle,
  p.user_agent
from public.pagos_intentos p
left join auth.users u on u.id = p.user_id
order by p.created_at desc
limit 100;
