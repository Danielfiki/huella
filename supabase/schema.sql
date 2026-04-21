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
  tareas       jsonb default '{}'::jsonb
);

-- ── Migraciones para instalaciones existentes ─────────────────
alter table public.hijos      add column if not exists avatar_url     text;
alter table public.episodios  add column if not exists orientacion_ia text;
alter table public.estrategias add column if not exists tareas         jsonb default '{}'::jsonb;

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
