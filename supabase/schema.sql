-- ══════════════════════════════════════════════════════════════
-- HUELLA — Schema completo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ══════════════════════════════════════════════════════════════

-- ── Tablas ───────────────────────────────────────────────────

create table if not exists public.hijos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
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
  orientacion_ia text,
  fecha         timestamptz default now()
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

-- ── Migraciones para instalaciones existentes ─────────────────
alter table public.hijos      add column if not exists avatar_url     text;
alter table public.episodios  add column if not exists orientacion_ia text;
alter table public.estrategias add column if not exists tareas         jsonb default '{}'::jsonb;
alter table public.estrategias add column if not exists checkins       jsonb default '{}'::jsonb;
alter table public.hitos      add column if not exists foto_url       text;

-- ── Row Level Security ────────────────────────────────────────
alter table public.hijos       enable row level security;
alter table public.episodios   enable row level security;
alter table public.hitos        enable row level security;
alter table public.estrategias  enable row level security;

-- Eliminar políticas previas para evitar conflictos al re-ejecutar
drop policy if exists "own_data" on public.hijos;
drop policy if exists "own_data" on public.episodios;
drop policy if exists "own_data" on public.hitos;
drop policy if exists "own_data" on public.estrategias;

create policy "own_data" on public.hijos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.episodios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.hitos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.estrategias
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

-- Columna family_id en hijos (hijo canónico de la familia)
alter table public.hijos add column if not exists
  family_id uuid references public.families(id) on delete set null;

create unique index if not exists hijos_family_id_unique
  on public.hijos(family_id) where family_id is not null;

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
  where family_id = v_family_id and status = 'pending';

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

-- Aceptar invitación (operación atómica)
create or replace function public.accept_partner_invitation(p_token text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_inv       partner_invitations%rowtype;
  v_in_family uuid;
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

  select jsonb_build_object('id', fm.user_id, 'email', au.email)
  into v_partner
  from public.family_members fm
  join auth.users au on au.id = fm.user_id
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

-- Upsert del hijo canónico (INSERT o UPDATE preservando user_id original)
create or replace function public.upsert_family_child(
  p_nombre     text,
  p_edad       integer,
  p_avatar_url text
) returns void
language plpgsql security definer
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id
  from public.family_members
  where user_id = auth.uid()
  limit 1;

  if v_family_id is not null then
    update public.hijos
    set nombre = p_nombre, edad = p_edad, avatar_url = p_avatar_url
    where family_id = v_family_id;

    if not found then
      insert into public.hijos (user_id, family_id, nombre, edad, avatar_url)
      values (auth.uid(), v_family_id, p_nombre, p_edad, p_avatar_url);
    end if;
  else
    insert into public.hijos (user_id, nombre, edad, avatar_url)
    values (auth.uid(), p_nombre, p_edad, p_avatar_url)
    on conflict (user_id) do update
    set nombre = excluded.nombre, edad = excluded.edad, avatar_url = excluded.avatar_url;
  end if;
end;
$$;
grant execute on function public.upsert_family_child(text, integer, text) to authenticated;
