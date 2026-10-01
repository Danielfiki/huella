-- ════════════════════════════════════════════════════════════════════
-- 028 · Eliminar el perfil de un hijo
--
-- Una sola funcion borra al hijo con todo lo suyo, dentro de la transaccion
-- de la llamada: o se borra todo o no se borra nada.
--
-- Por que borra a mano episodios, hitos, estrategias y patrones: sus llaves a
-- hijos son ON DELETE SET NULL. Si se borrara solo la fila de hijos quedarian
-- huerfanos con hijo_id null, que es lo que paso con el reset de Pascual.
-- Lo demas (rutinas, rasgos, analisis_semanal, preguntas, las 4 tablas
-- estrategia_*, checkins_episodio, estrategia_ciclos) cae por CASCADE.
--
-- Solo el creador del hijo (hijos.user_id) puede borrarlo. Es SECURITY
-- DEFINER para poder borrar tambien lo que registro la pareja; por eso el
-- chequeo de dueno va adentro y es lo primero.
--
-- Storage no se toca desde aca: Postgres no borra archivos. La funcion
-- devuelve las rutas y el cliente las borra despues con la API de Storage.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.eliminar_hijo(p_hijo_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dueno        uuid;
  v_avatar       text;
  v_momentos     text[];
  v_avatares     text[];
  n_episodios    int;
  n_hitos        int;
  n_estrategias  int;
  n_patrones     int;
  n_preguntas    int;
BEGIN
  -- 1. Existe y es del usuario. FOR UPDATE: nadie lo edita mientras se borra.
  SELECT user_id, avatar_url INTO v_dueno, v_avatar
    FROM hijos WHERE id = p_hijo_id
    FOR UPDATE;

  IF NOT FOUND OR v_dueno IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No se puede eliminar este hijo' USING ERRCODE = '42501';
  END IF;

  -- 2. Rutas de fotos, ANTES de borrar las filas. foto_url guarda el PATH;
  --    las filas viejas pueden tener una URL entera, de esas se saca el path.
  SELECT coalesce(array_agg(DISTINCT ruta), '{}') INTO v_momentos
    FROM (
      SELECT CASE WHEN foto_url LIKE 'http%'
                  THEN substring(foto_url FROM '/(?:sign|public)/momentos/([^?]+)')
                  ELSE foto_url END AS ruta
        FROM episodios
       WHERE hijo_id = p_hijo_id AND coalesce(foto_url, '') <> ''
      UNION ALL
      SELECT CASE WHEN foto_url LIKE 'http%'
                  THEN substring(foto_url FROM '/(?:sign|public)/momentos/([^?]+)')
                  ELSE foto_url END
        FROM hitos
       WHERE hijo_id = p_hijo_id AND coalesce(foto_url, '') <> ''
    ) f
   WHERE ruta IS NOT NULL;

  -- Foto del hijo: la ruta fija <user_id>/<hijo_id>.jpg y, si avatar_url
  -- apunta a otra, tambien esa.
  SELECT coalesce(array_agg(DISTINCT ruta), '{}') INTO v_avatares
    FROM unnest(ARRAY[
      v_dueno::text || '/' || p_hijo_id::text || '.jpg',
      CASE WHEN v_avatar LIKE 'http%'
           THEN substring(v_avatar FROM '/(?:sign|public)/avatares/([^?]+)')
           ELSE nullif(v_avatar, '') END
    ]) AS ruta
   WHERE ruta IS NOT NULL;

  -- 3. Preguntas: caen por cascada, se cuentan antes para el resumen.
  SELECT count(*) INTO n_preguntas FROM preguntas WHERE hijo_id = p_hijo_id;

  -- 4. Borrado. Episodios arrastra checkins_episodio; estrategias arrastra
  --    estrategia_ciclos. Las referencias cruzadas (patron_id,
  --    episodio_origen_id, estrategia_id) son SET NULL, no bloquean.
  DELETE FROM episodios   WHERE hijo_id = p_hijo_id;
  GET DIAGNOSTICS n_episodios = ROW_COUNT;

  DELETE FROM hitos       WHERE hijo_id = p_hijo_id;
  GET DIAGNOSTICS n_hitos = ROW_COUNT;

  DELETE FROM estrategias WHERE hijo_id = p_hijo_id;
  GET DIAGNOSTICS n_estrategias = ROW_COUNT;

  DELETE FROM patrones    WHERE hijo_id = p_hijo_id;
  GET DIAGNOSTICS n_patrones = ROW_COUNT;

  DELETE FROM hijos       WHERE id = p_hijo_id;

  RETURN json_build_object(
    'episodios',   n_episodios,
    'hitos',       n_hitos,
    'estrategias', n_estrategias,
    'patrones',    n_patrones,
    'preguntas',   n_preguntas,
    'fotos', json_build_object(
      'momentos', to_json(v_momentos),
      'avatares', to_json(v_avatares)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.eliminar_hijo(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.eliminar_hijo(uuid) TO authenticated;

-- Verificacion. Debe devolver UNA fila:
--   eliminar_hijo | true | false | true
SELECT p.proname,
       p.prosecdef                                                  AS security_definer,
       has_function_privilege('anon',          p.oid, 'EXECUTE')    AS anon_puede,
       has_function_privilege('authenticated', p.oid, 'EXECUTE')    AS authenticated_puede
  FROM pg_proc p
 WHERE p.proname = 'eliminar_hijo' AND p.pronamespace = 'public'::regnamespace;
