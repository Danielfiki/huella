-- Ejecutar en el SQL Editor de Supabase
-- MIGRACIÓN requerida (ejecutar una vez si la tabla episodios ya existe):
-- alter table public.episodios add column if not exists orientacion_ia text;


-- Tabla: perfil del hijo (uno por usuario)
create table public.hijos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  nombre text not null,
  edad integer,
  created_at timestamptz default now()
);

-- Tabla: episodios de conducta
create table public.episodios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tipo text not null,
  intensidad integer not null,
  contexto text,
  gatillantes text[],
  estado_padre text,
  fecha timestamptz default now()
);

-- Tabla: hitos positivos
create table public.hitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  categoria text not null,
  descripcion text not null,
  fecha timestamptz default now()
);

-- Tabla: estrategias de crianza
create table public.estrategias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habilidad text not null,
  descripcion text,
  plan text,
  fecha_inicio timestamptz default now(),
  semana_actual integer default 1
);

-- Habilitar Row Level Security en todas las tablas
alter table public.hijos enable row level security;
alter table public.episodios enable row level security;
alter table public.hitos enable row level security;
alter table public.estrategias enable row level security;

-- Políticas: cada usuario solo accede a sus propios datos
create policy "own_data" on public.hijos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.episodios
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.hitos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_data" on public.estrategias
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
