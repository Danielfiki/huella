-- ============================================
-- Migracion 010 -- Foto del cuidador (perfiles.avatar_url)
--
-- Contexto: hasta hoy la identidad del padre/madre en la app era un string de
-- nombre. `public.perfiles` solo tenia (user_id, nombre, plan, ...). La foto
-- del cuidador se muestra en Perfil y en el avatar de sus burbujas del
-- registro conversacional.
--
-- Diseno:
--   * Columna `avatar_url text` NULL. Guarda el PATH del objeto en Storage
--     (`<user_id>/cuidador.jpg`), NUNCA una URL: las URLs firmadas expiran.
--     Es la misma convencion que ya usan hijos.avatar_url, episodios.foto_url
--     y hitos.foto_url. El cliente firma al leer (firmarPath en HuellaContext).
--   * NO se crea bucket nuevo. Se reusa el bucket `avatares` que ya existe.
--     Razon: sus policies (avatares_insert / update / delete) ya autorizan por
--     carpeta -- (storage.foldername(name))[1] = auth.uid()::text -- asi que la
--     foto del cuidador cae dentro de la misma carpeta del usuario y queda
--     cubierta SIN tocar ninguna policy. Un bucket nuevo obligaria a duplicar
--     las 4 policies y a mantenerlas en paralelo para siempre.
--   * Sin colision de nombres: los avatares de hijos se llaman con el UUID del
--     hijo (`<user_id>/<hijo_id>.jpg`). Un UUID nunca es la palabra "cuidador".
--   * RLS: `perfiles` ya tiene la policy own_data (FOR ALL, auth.uid() =
--     user_id). Una columna nueva queda cubierta automaticamente.
--
-- No destructivo (ADD COLUMN IF NOT EXISTS). Idempotente: se puede correr dos
-- veces sin efecto.
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New query.
-- Correr los 3 bloques de abajo UNO POR UNO, en orden.
-- ============================================


-- --------------------------------------------
-- BLOQUE 1 de 3 -- Verificacion ANTES (SELECT, no modifica nada)
-- Confirma que la columna todavia NO existe.
-- --------------------------------------------

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'perfiles'
ORDER BY ordinal_position;

-- Exito esperado: la lista de columnas de perfiles (user_id, nombre,
-- created_at, plan, ...) SIN ninguna fila que diga `avatar_url`.
-- Si ya aparece `avatar_url`, la migracion ya se corrio: salta al BLOQUE 3.


-- --------------------------------------------
-- BLOQUE 2 de 3 -- La migracion
-- --------------------------------------------

BEGIN;

ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.perfiles.avatar_url IS
  'PATH del objeto en el bucket avatares (<user_id>/cuidador.jpg). Nunca una URL: el cliente firma al leer.';

COMMIT;

-- Exito esperado: "Success. No rows returned".


-- --------------------------------------------
-- BLOQUE 3 de 3 -- Verificacion DESPUES (SELECT, no modifica nada)
-- --------------------------------------------

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'perfiles'
  AND column_name  = 'avatar_url';

-- Exito esperado: exactamente 1 fila ->
--   avatar_url | text | YES
-- El YES es importante: la columna es nullable. Nadie queda obligado a subir
-- foto y todas las cuentas existentes siguen funcionando con avatar_url NULL
-- (la UI cae a la inicial del nombre, como hasta hoy).


-- --------------------------------------------
-- STORAGE -- NO hay nada que correr.
--
-- El bucket `avatares` y sus 4 policies ya existen (supabase/schema.sql,
-- lineas 161-199). Autorizan por carpeta del usuario, asi que
-- `<user_id>/cuidador.jpg` ya esta permitido. No se agrega bucket ni policy.
--
-- Si quieres confirmarlo, esta query lista las policies vigentes del bucket:
--
--   SELECT policyname, cmd
--   FROM pg_policies
--   WHERE schemaname = 'storage'
--     AND tablename  = 'objects'
--     AND policyname LIKE 'avatares%'
--   ORDER BY policyname;
--
-- Exito esperado: 4 filas -> avatares_delete, avatares_insert,
-- avatares_select, avatares_update.
-- --------------------------------------------
