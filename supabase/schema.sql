-- ══════════════════════════════════════════════════════════════
-- HUELLA — Schema completo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ══════════════════════════════════════════════════════════════

-- ── Tablas ───────────────────────────────────────────────────

create table if not exists public.hijos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  nombre     text not null,
  edad       integer,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.episodios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  tipo          text not null,
  intensidad    integer not null,
  contexto      text,
  gatillantes   text[],
  estado_padre  text,
  emocion           text,
  orientacion_ia    text,
  descripcion_libre text,
  fecha             timestamptz default now()
);

create table if not exists public.hitos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  categoria   text not null,
  descripcion text not null,
  fecha       timestamptz default now()
);

create table if not exists public.estrategias (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  habilidad    text not null,
  descripcion  text,
  plan         text,
  fecha_inicio timestamptz default now(),
  semana_actual integer default 1,
  tareas       jsonb default '{}'::jsonb,
  checkins     jsonb default '{}'::jsonb
);

create table if not exists public.api_llamadas (
  user_id uuid references auth.users(id) on delete cascade not null,
  fecha   date not null default current_date,
  cuenta  integer not null default 0,
  primary key (user_id, fecha)
);

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

-- ── Migraciones para instalaciones existentes ─────────────────
alter table public.hijos      add column if not exists avatar_url       text;
alter table public.hijos      add column if not exists fecha_nacimiento date;
alter table public.hijos      add column if not exists genero            text;
alter table public.episodios  add column if not exists orientacion_ia   text;
alter table public.episodios  add column if not exists emocion           text;
alter table public.episodios  add column if not exists descripcion_libre text;
alter table public.episodios  add column if not exists reflexion          text;
alter table public.episodios  add column if not exists foto_url           text;
-- Acción Rápida v1.2 (migración 003): persistencia estructurada del output
-- de generarAccionInmediata + bucket de tiempo para invalidación selectiva.
alter table public.episodios  add column if not exists accion_rapida_texto       text;
alter table public.episodios  add column if not exists accion_rapida_autor       text;
alter table public.episodios  add column if not exists accion_rapida_dimension   text;
alter table public.episodios  add column if not exists accion_rapida_bucket      text;
alter table public.episodios  add column if not exists accion_rapida_generada_en timestamptz;
-- Acción Rápida v1.2: último autor usado por hijo, para anti-repetición.
alter table public.hijos      add column if not exists ultimo_autor_ia    text;
alter table public.estrategias add column if not exists tareas           jsonb default '{}'::jsonb;
alter table public.estrategias add column if not exists checkins         jsonb default '{}'::jsonb;
alter table public.hitos      add column if not exists foto_url          text;

-- ── Row Level Security ────────────────────────────────────────
alter table public.hijos         enable row level security;
alter table public.episodios     enable row level security;
alter table public.hitos         enable row level security;
alter table public.estrategias   enable row level security;
alter table public.api_llamadas        enable row level security;
alter table public.push_subscriptions  enable row level security;

-- Eliminar políticas previas para evitar conflictos al re-ejecutar
drop policy if exists "own_data"       on public.hijos;
drop policy if exists "family_read"    on public.hijos;
drop policy if exists "hijos_select"   on public.hijos;
drop policy if exists "hijos_insert"   on public.hijos;
drop policy if exists "hijos_update"   on public.hijos;
drop policy if exists "hijos_delete"   on public.hijos;
drop policy if exists "own_data" on public.episodios;
drop policy if exists "own_data" on public.hitos;
drop policy if exists "own_data" on public.estrategias;

-- Helper: returns the current user's family_id without triggering RLS on
-- family_members. Used in hijos policies to avoid the infinite-recursion
-- that occurs when a policy subquery hits a table that itself has RLS.
create or replace function public.my_family_id()
returns uuid
language sql
security definer
stable
as $$
  select family_id
  from public.family_members
  where user_id = auth.uid()
  limit 1
$$;

-- Un hijo pertenece a su creador (user_id). Ambos miembros de la familia
-- pueden leerlo y editarlo; solo el creador puede insertar o borrar.

create policy "hijos_select" on public.hijos
  for select using (
    user_id = auth.uid()
    or family_id = public.my_family_id()
  );

create policy "hijos_insert" on public.hijos
  for insert with check (user_id = auth.uid());

create policy "hijos_update" on public.hijos
  for update using (
    user_id = auth.uid()
    or family_id = public.my_family_id()
  );

create policy "hijos_delete" on public.hijos
  for delete using (user_id = auth.uid());

create policy "own_data" on public.episodios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.hitos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.estrategias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.api_llamadas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_data" on public.push_subscriptions;
create policy "own_data" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage: bucket avatares ──────────────────────────────────

-- Crear bucket público (o convertirlo en público si ya existe)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

-- Eliminar políticas previas
drop policy if exists "avatares_insert" on storage.objects;
drop policy if exists "avatares_update" on storage.objects;
drop policy if exists "avatares_delete" on storage.objects;
drop policy if exists "avatares_select" on storage.objects;

-- Usuarios autenticados pueden subir/actualizar dentro de su carpeta (user_id/*)
create policy "avatares_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatares_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatares_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lectura pública (el bucket ya es público, pero la política es necesaria)
create policy "avatares_select" on storage.objects
  for select to public
  using (bucket_id = 'avatares');

-- ── Storage: bucket momentos ──────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('momentos', 'momentos', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists "momentos_insert" on storage.objects;
drop policy if exists "momentos_update" on storage.objects;
drop policy if exists "momentos_delete" on storage.objects;
drop policy if exists "momentos_select" on storage.objects;

create policy "momentos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'momentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "momentos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'momentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "momentos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'momentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "momentos_select" on storage.objects
  for select to public
  using (bucket_id = 'momentos');

-- ══════════════════════════════════════════════════════════════
-- MODO PAREJA
-- ══════════════════════════════════════════════════════════════

-- ── Tablas nuevas ─────────────────────────────────────────────

create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists public.family_members (
  family_id uuid references public.families(id) on delete cascade not null,
  user_id   uuid references auth.users(id)      on delete cascade not null,
  role      text not null default 'owner',        -- 'owner' | 'partner'
  joined_at timestamptz default now(),
  primary key (family_id, user_id)
);

create table if not exists public.partner_invitations (
  id            uuid primary key default gen_random_uuid(),
  inviter_id    uuid references auth.users(id) on delete cascade not null,
  invitee_email text not null,
  family_id     uuid references public.families(id) on delete cascade not null,
  token         text unique not null default encode(gen_random_bytes(32), 'hex'),
  status        text not null default 'pending',   -- 'pending' | 'accepted' | 'cancelled'
  created_at    timestamptz default now(),
  expires_at    timestamptz default (now() + interval '7 days')
);

-- Columna family_id en hijos
alter table public.hijos add column if not exists
  family_id uuid references public.families(id) on delete set null;

-- Índice no-único: una familia puede tener hijos registrados por ambos padres
drop index if exists hijos_family_id_unique;
create index if not exists hijos_family_id_idx on public.hijos(family_id);

-- ── RLS tablas nuevas ─────────────────────────────────────────

alter table public.families            enable row level security;
alter table public.family_members      enable row level security;
alter table public.partner_invitations enable row level security;

drop policy if exists "families_read"       on public.families;
drop policy if exists "families_insert"     on public.families;
drop policy if exists "family_members_read" on public.family_members;
drop policy if exists "family_members_own"  on public.family_members;
drop policy if exists "invitations_own"     on public.partner_invitations;

create policy "families_read" on public.families
  for select using (
    id in (select family_id from public.family_members where user_id = auth.uid())
  );

create policy "families_insert" on public.families
  for insert with check (true);

create policy "family_members_read" on public.family_members
  for select using (
    family_id in (select family_id from public.family_members where user_id = auth.uid())
  );

create policy "family_members_own" on public.family_members
  for all using (user_id = auth.uid());

create policy "invitations_own" on public.partner_invitations
  for all using (inviter_id = auth.uid());

-- ── Función auxiliar: user_ids de la misma familia ────────────

create or replace function public.get_family_user_ids(p_user_id uuid)
returns uuid[]
language sql stable security definer
as $$
  select coalesce(
    array_agg(distinct fm.user_id),
    array[p_user_id]
  )
  from public.family_members fm
  where fm.family_id in (
    select family_id from public.family_members where user_id = p_user_id
  );
$$;

-- ── Actualizar RLS de tablas de datos ─────────────────────────
-- La nueva política permite leer datos de todos los miembros de
-- la misma familia. Para usuarios sin familia, get_family_user_ids
-- devuelve array[propio_uid], preservando el comportamiento anterior.

drop policy if exists "own_data"    on public.episodios;
drop policy if exists "own_data"    on public.hitos;
drop policy if exists "own_data"    on public.estrategias;
drop policy if exists "own_data"    on public.hijos;
drop policy if exists "family_data" on public.episodios;
drop policy if exists "family_data" on public.hitos;
drop policy if exists "family_data" on public.estrategias;
drop policy if exists "family_data" on public.hijos;

create policy "family_data" on public.episodios
  for all
  using    (user_id = any(public.get_family_user_ids(auth.uid())))
  with check (auth.uid() = user_id);

create policy "family_data" on public.hitos
  for all
  using    (user_id = any(public.get_family_user_ids(auth.uid())))
  with check (auth.uid() = user_id);

create policy "family_data" on public.estrategias
  for all
  using    (user_id = any(public.get_family_user_ids(auth.uid())))
  with check (auth.uid() = user_id);

-- hijos: ambos miembros pueden leer/escribir el hijo canónico
create policy "family_data" on public.hijos
  for all
  using (
    user_id = auth.uid()
    or family_id in (select family_id from public.family_members where user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or family_id in (select family_id from public.family_members where user_id = auth.uid())
  );

-- ── Funciones RPC ─────────────────────────────────────────────

-- Crear familia e invitar pareja (idempotente: re-invita si ya tiene familia)
create or replace function public.create_family_and_invite(p_invitee_email text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_family_id uuid;
  v_token     text;
begin
  select family_id into v_family_id
  from public.family_members
  where user_id = auth.uid()
  limit 1;

  if v_family_id is null then
    insert into public.families default values returning id into v_family_id;
    insert into public.family_members (family_id, user_id, role)
    values (v_family_id, auth.uid(), 'owner');
    update public.hijos set family_id = v_family_id where user_id = auth.uid();
  end if;

  update public.partner_invitations
  set status = 'cancelled'
  where family_id = v_family_id and status in ('pending', 'rejected_pending_data');

  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.partner_invitations (inviter_id, invitee_email, family_id, token)
  values (auth.uid(), lower(trim(p_invitee_email)), v_family_id, v_token);

  return jsonb_build_object('success', true, 'family_id', v_family_id, 'token', v_token);
end;
$$;
grant execute on function public.create_family_and_invite(text) to authenticated;

-- Leer invitación por token sin necesitar estar logueado como invitante
create or replace function public.get_invitation_by_token(p_token text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_inv   partner_invitations%rowtype;
  v_email text;
begin
  select * into v_inv
  from public.partner_invitations
  where token = p_token and status = 'pending' and expires_at > now();

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  select email into v_email from auth.users where id = v_inv.inviter_id;

  return jsonb_build_object(
    'valid',         true,
    'inviteeEmail',  v_inv.invitee_email,
    'inviterEmail',  v_email,
    'expiresAt',     v_inv.expires_at
  );
end;
$$;
grant execute on function public.get_invitation_by_token(text) to anon, authenticated;

-- Leer la invitación pendiente del usuario autenticado (sin necesitar token)
-- Defensa contra el bug de duplicado en modo parejas (Falla 3, mayo 2026):
-- onboardingPersistor consulta esta RPC antes de crear hijo nuevo. Si hay
-- invitación pendiente para el email del usuario, aborta el flujo y redirige
-- a /invitar?token=xxx. Es SECURITY DEFINER porque la policy invitations_own
-- restringe lectura al inviter_id, no al invitee.
create or replace function public.get_my_pending_invitation()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_email          text;
  v_inv            public.partner_invitations%rowtype;
  v_inviter_email  text;
begin
  select email into v_email
  from auth.users
  where id = auth.uid();

  if v_email is null then
    return jsonb_build_object('hasInvitation', false);
  end if;

  select * into v_inv
  from public.partner_invitations
  where lower(invitee_email) = lower(v_email)
    and status     = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('hasInvitation', false);
  end if;

  select email into v_inviter_email
  from auth.users
  where id = v_inv.inviter_id;

  return jsonb_build_object(
    'hasInvitation', true,
    'token',         v_inv.token,
    'inviterEmail',  v_inviter_email,
    'expiresAt',     v_inv.expires_at
  );
end;
$$;
grant execute on function public.get_my_pending_invitation() to authenticated;

-- Aceptar invitación (operación atómica)
-- Lógica de 3 casos para resolver duplicación de hijos:
--   Caso A: invitada sin hijos propios → join directo
--   Caso B: invitada tiene hijos pero sin datos derivados → borrar hijos vacíos, luego join
--   Caso C: invitada tiene datos propios → rechazar con error_code pending_data
--           (no modifica datos del partner, pero marca la invitación como
--           rejected_pending_data para que el owner sepa por qué quedó colgada)
create or replace function public.accept_partner_invitation(p_token text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_inv             partner_invitations%rowtype;
  v_in_family       uuid;
  v_partner_hijos   uuid[];
  v_has_data        boolean;
  v_count_eps       integer;
  v_count_hitos     integer;
  v_count_estrat    integer;
  v_count_rutinas   integer;
begin
  select * into v_inv
  from public.partner_invitations
  where token = p_token and status = 'pending' and expires_at > now();

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invitación inválida o expirada');
  end if;

  if v_inv.inviter_id = auth.uid() then
    return jsonb_build_object('success', false, 'error', 'No puedes aceptar tu propia invitación');
  end if;

  select family_id into v_in_family
  from public.family_members where user_id = auth.uid() limit 1;

  if v_in_family is not null then
    return jsonb_build_object('success', false, 'error', 'Ya perteneces a una familia');
  end if;

  -- Detectar hijos propios de la invitada
  select array_agg(id) into v_partner_hijos
  from public.hijos
  where user_id = auth.uid();

  if v_partner_hijos is not null then
    -- Verificar si hay datos derivados asociados a este usuario
    select (
      exists(select 1 from public.episodios   where user_id = auth.uid() limit 1) or
      exists(select 1 from public.hitos        where user_id = auth.uid() limit 1) or
      exists(select 1 from public.estrategias  where user_id = auth.uid() limit 1) or
      exists(select 1 from public.rutinas      where user_id = auth.uid() limit 1)
    ) into v_has_data;

    if v_has_data then
      -- Caso C: contar datos para detallar el mensaje al usuario
      select count(*) into v_count_eps     from public.episodios  where user_id = auth.uid();
      select count(*) into v_count_hitos   from public.hitos       where user_id = auth.uid();
      select count(*) into v_count_estrat  from public.estrategias where user_id = auth.uid();
      select count(*) into v_count_rutinas from public.rutinas     where user_id = auth.uid();

      -- Marcar la invitación como auto-rechazada para que el owner
      -- pueda actuar sin esperar la expiración a los 7 días
      update public.partner_invitations
      set status = 'rejected_pending_data'
      where id = v_inv.id;

      return jsonb_build_object(
        'success',    false,
        'error_code', 'pending_data',
        'error',      'Tienes datos previos registrados. Contáctanos para que te ayudemos a unificar tu historial.',
        'counts',     jsonb_build_object(
          'episodios',   v_count_eps,
          'hitos',       v_count_hitos,
          'estrategias', v_count_estrat,
          'rutinas',     v_count_rutinas
        )
      );
    else
      -- Caso B: tiene hijos pero vacíos → borrarlos para evitar duplicados
      delete from public.hijos where user_id = auth.uid();
    end if;
  end if;

  -- Caso A y B (post-limpieza): vincular la familia

  -- Safety net: asegurar que los hijos del invitador estén vinculados a la familia
  update public.hijos
  set family_id = v_inv.family_id
  where user_id = v_inv.inviter_id
    and family_id is null;

  insert into public.family_members (family_id, user_id, role)
  values (v_inv.family_id, auth.uid(), 'partner')
  on conflict do nothing;

  update public.partner_invitations set status = 'accepted' where id = v_inv.id;

  return jsonb_build_object('success', true, 'familyId', v_inv.family_id);
end;
$$;
grant execute on function public.accept_partner_invitation(text) to authenticated;

-- Obtener info del partner (accede a auth.users via security definer)
create or replace function public.get_partner_info()
returns jsonb
language plpgsql security definer
as $$
declare
  v_family_id uuid;
  v_role      text;
  v_partner   jsonb;
begin
  select family_id, role into v_family_id, v_role
  from public.family_members
  where user_id = auth.uid()
  limit 1;

  if v_family_id is null then
    return jsonb_build_object('hasFamily', false);
  end if;

  select jsonb_build_object('id', fm.user_id, 'email', au.email, 'nombre', p.nombre)
  into v_partner
  from public.family_members fm
  join auth.users au on au.id = fm.user_id
  left join public.perfiles p on p.user_id = fm.user_id
  where fm.family_id = v_family_id and fm.user_id != auth.uid()
  limit 1;

  return jsonb_build_object(
    'hasFamily', true,
    'familyId',  v_family_id,
    'role',      v_role,
    'partner',   v_partner
  );
end;
$$;
grant execute on function public.get_partner_info() to authenticated;

-- Desconectar pareja (solo el invitante/owner puede hacerlo)
create or replace function public.disconnect_partner()
returns jsonb
language plpgsql security definer
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id
  from public.family_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if v_family_id is null then
    return jsonb_build_object('success', false, 'error', 'Solo el invitante puede desconectar');
  end if;

  delete from public.family_members
  where family_id = v_family_id and role = 'partner';

  update public.partner_invitations set status = 'cancelled'
  where family_id = v_family_id and status = 'pending';

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.disconnect_partner() to authenticated;

-- Upsert de hijo: INSERT si p_hijo_id es null, UPDATE si se pasa un UUID.
-- Retorna el UUID del hijo creado o actualizado.
drop function if exists public.upsert_family_child(text, integer, text);
drop function if exists public.upsert_family_child(text, integer, text, date, text);

create or replace function public.upsert_family_child(
  p_nombre           text,
  p_edad             integer,
  p_avatar_url       text,
  p_fecha_nacimiento date  default null,
  p_genero           text  default null,
  p_hijo_id          uuid  default null
)
returns uuid
language plpgsql security definer
as $$
declare
  v_family_id uuid;
  v_hijo_id   uuid;
begin
  select family_id into v_family_id
  from public.family_members
  where user_id = auth.uid()
  limit 1;

  if p_hijo_id is not null then
    -- Actualizar hijo existente identificado por su UUID
    update public.hijos
       set nombre           = p_nombre,
           edad             = p_edad,
           avatar_url       = p_avatar_url,
           fecha_nacimiento = p_fecha_nacimiento,
           genero           = p_genero
     where id = p_hijo_id
       and (
         user_id = auth.uid()
         or (v_family_id is not null and family_id = v_family_id)
       )
    returning id into v_hijo_id;

    if v_hijo_id is null then
      raise exception 'Hijo no encontrado o sin permisos: %', p_hijo_id;
    end if;
  else
    -- Defensa en profundidad: si el usuario pertenece a una familia,
    -- solo el owner puede crear hijos nuevos (la UI ya esconde el botón).
    if v_family_id is not null then
      if (select role from public.family_members where user_id = auth.uid() limit 1) <> 'owner' then
        raise exception 'Solo el owner puede agregar hijos a la familia';
      end if;
    end if;

    -- Insertar hijo nuevo
    insert into public.hijos (user_id, family_id, nombre, edad, avatar_url, fecha_nacimiento, genero)
    values (auth.uid(), v_family_id, p_nombre, p_edad, p_avatar_url, p_fecha_nacimiento, p_genero)
    returning id into v_hijo_id;
  end if;

  return v_hijo_id;
end;
$$;
grant execute on function public.upsert_family_child(text, integer, text, date, text, uuid) to authenticated;

-- ── Perfil del padre/madre ────────────────────────────────────────────────
-- Migración: ejecutar en Supabase Dashboard → SQL Editor si ya tienes la DB

create table if not exists public.perfiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  created_at timestamptz default now()
);

alter table public.perfiles enable row level security;

drop policy if exists "own_data" on public.perfiles;
create policy "own_data" on public.perfiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Eliminar la cuenta del usuario autenticado y todos sus datos (cascade)
create or replace function public.delete_user()
returns void
language plpgsql security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
grant execute on function public.delete_user() to authenticated;
grant execute on function public.upsert_family_child(text, integer, text, date, text, uuid) to authenticated;

-- ── Tabla: rutinas ────────────────────────────────────────────
-- Bloques de rutina diaria por hijo (hora, nombre, nota, es_momento_riesgo)
create table if not exists public.rutinas (
  id                uuid primary key default gen_random_uuid(),
  hijo_id           uuid references public.hijos(id) on delete cascade not null,
  user_id           uuid references auth.users(id) on delete cascade not null,
  hora              text not null,
  nombre            text not null,
  nota              text,
  es_momento_riesgo boolean not null default false,
  created_at        timestamptz default now()
);

alter table public.rutinas enable row level security;

drop policy if exists "rutinas_all" on public.rutinas;
create policy "rutinas_all" on public.rutinas
  for all
  using    (user_id = any(public.get_family_user_ids(auth.uid())))
  with check (auth.uid() = user_id);
