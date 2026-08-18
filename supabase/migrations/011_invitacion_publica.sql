-- ============================================
-- Migracion 011 -- Datos publicos minimos de una invitacion
--
-- Contexto: /invitar es la UNICA pantalla publica con contenido de una familia.
-- La ve la pareja al abrir el link, SIN sesion. Hoy el front llama a
-- `get_invitation_by_token`, que devuelve el EMAIL del inviter y nada mas, y la
-- pantalla termina diciendo "danielundurraga te invita a Huella" (el pedazo del
-- correo antes del @). No hay nombre del hijo ni fotos.
--
-- El rediseno necesita: nombre de pila de quien invita, nombre del hijo/a y las
-- dos fotos. Este RPC entrega ESO Y NADA MAS.
--
-- Que NO devuelve, a proposito:
--   * Ningun email (ni el del inviter ni el del invitado). El RPC viejo si
--     devuelve emails; por eso este es una funcion NUEVA y no un cambio al
--     anterior: exponer correos en una pantalla publica es peor que lo que ya
--     habia.
--   * Ningun dato de crianza: nada de episodios, hitos, estrategias ni rasgos.
--   * Ningun id: ni family_id, ni hijo_id, ni user_id.
--   * La fecha de expiracion (no aporta nada a la pantalla).
--
-- El apellido se recorta: se devuelve solo el primer token de `perfiles.nombre`.
-- Alguien que recibe una invitacion ya sabe quien se la mando; el apellido
-- completo en una URL publica no agrega nada y si expone de mas.
--
-- SOBRE LAS FOTOS -- leer, porque cambia lo que se pidio:
--   Una funcion SQL NO PUEDE generar URLs firmadas de Storage. Las firma la API
--   de Storage, no Postgres. Asi que este RPC devuelve el PATH del objeto
--   (misma convencion que toda la app: la base guarda paths, el cliente firma
--   al leer) y la pantalla firma con TTL corto (5 min) desde el navegador.
--
--   Eso funciona hoy porque el bucket `avatares` es PUBLICO (schema.sql linea
--   164: `public = true`, mas la policy `avatares_select ... to public`). O sea:
--   este RPC no abre ningun acceso nuevo. Las fotos de avatar ya son legibles
--   por cualquiera que conozca el path, desde antes de esta migracion.
--
--   Lo unico que este RPC agrega es que ahora se puede LLEGAR al path teniendo
--   el token de invitacion. Como el token es un secreto de 32 bytes que solo
--   viaja al correo del invitado, y la invitacion caduca, el alcance es el
--   mismo que el del link.
--
--   Si mas adelante se quiere endurecer de verdad, el cambio es hacer PRIVADO
--   el bucket `avatares` -- pero eso toca TODA la app (Home, Perfil, hilo del
--   registro, historial) y no se hace desde aca.
--
-- Idempotente (CREATE OR REPLACE). Se puede correr dos veces sin efecto.
-- Ejecutar en: Supabase Dashboard -> SQL Editor.
-- ============================================


-- --------------------------------------------
-- BLOQUE 1 de 4 -- Verificacion ANTES (SELECT, no modifica nada)
--
-- Snippet: ABRE UNO NUEVO (New query). No borres el de la migracion 010.
-- --------------------------------------------

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_invitation_by_token', 'get_invitation_public_by_token')
ORDER BY routine_name;

-- Exito esperado: EXACTAMENTE 1 fila -> get_invitation_by_token
-- (el RPC viejo, que se queda intacto).
-- Si ya aparecen las 2, la migracion ya se corrio: salta al BLOQUE 3.


-- --------------------------------------------
-- BLOQUE 2 de 4 -- La funcion
--
-- Snippet: el MISMO de arriba, borra el SELECT y pega esto.
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.get_invitation_public_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inv          public.partner_invitations%ROWTYPE;
  v_inviter_nom  text;
  v_inviter_foto text;
  v_hijo_nom     text;
  v_hijo_foto    text;
BEGIN
  -- Misma validacion que get_invitation_by_token: existe, pendiente, vigente.
  SELECT * INTO v_inv
  FROM public.partner_invitations
  WHERE token      = p_token
    AND status     = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    -- Respuesta uniforme: no distingue "no existe" de "expirada" de "ya usada".
    -- Un atacante que pruebe tokens no aprende nada de la diferencia.
    RETURN jsonb_build_object('valid', false);
  END IF;

  -- Nombre de pila del inviter (primer token) + path de su foto.
  SELECT NULLIF(split_part(COALESCE(p.nombre, ''), ' ', 1), ''), p.avatar_url
    INTO v_inviter_nom, v_inviter_foto
  FROM public.perfiles p
  WHERE p.user_id = v_inv.inviter_id;

  -- El hijo de la familia a la que se invita. Se toma el mas antiguo: si la
  -- familia tuviera mas de uno, el primero es el que da nombre a la pantalla.
  SELECT h.nombre, h.avatar_url
    INTO v_hijo_nom, v_hijo_foto
  FROM public.hijos h
  WHERE h.family_id = v_inv.family_id
  ORDER BY h.created_at ASC
  LIMIT 1;

  -- Respaldo para cuentas viejas: hijos.family_id se agrego despues, asi que
  -- puede venir NULL. En ese caso se cae al primer hijo del propio inviter.
  IF v_hijo_nom IS NULL THEN
    SELECT h.nombre, h.avatar_url
      INTO v_hijo_nom, v_hijo_foto
    FROM public.hijos h
    WHERE h.user_id = v_inv.inviter_id
    ORDER BY h.created_at ASC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'valid',             true,
    'inviterNombre',     v_inviter_nom,
    'inviterFotoPath',   v_inviter_foto,
    'hijoNombre',        v_hijo_nom,
    'hijoFotoPath',      v_hijo_foto
  );
END;
$$;

COMMENT ON FUNCTION public.get_invitation_public_by_token(text) IS
  'Datos publicos minimos de una invitacion, para la pantalla /invitar sin sesion. Devuelve nombre de pila del inviter, nombre del hijo y PATHS de las dos fotos. NUNCA emails, ids ni datos de crianza. El cliente firma los paths con TTL corto.';

-- Solo EXECUTE, y explicito: primero se revoca el default de PUBLIC y despues
-- se otorga a los dos roles que de verdad la usan.
REVOKE ALL ON FUNCTION public.get_invitation_public_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_public_by_token(text) TO anon, authenticated;

-- Exito esperado: "Success. No rows returned".


-- --------------------------------------------
-- BLOQUE 3 de 4 -- Verificacion DESPUES (SELECT, no modifica nada)
--
-- Snippet: el MISMO, borra el bloque 2 y pega esto.
-- --------------------------------------------

SELECT
  p.proname                           AS funcion,
  p.prosecdef                         AS es_security_definer,
  pg_get_function_identity_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_invitation_by_token', 'get_invitation_public_by_token')
ORDER BY p.proname;

-- Exito esperado: EXACTAMENTE 2 filas, las dos con es_security_definer = true:
--   get_invitation_by_token         | true | p_token text
--   get_invitation_public_by_token  | true | p_token text
-- El RPC viejo TIENE que seguir ahi: esta migracion no lo toca.


-- --------------------------------------------
-- BLOQUE 4 de 4 -- Prueba con una invitacion real (SELECT, no modifica nada)
--
-- Snippet: el MISMO, borra el bloque 3 y pega esto.
-- OPCIONAL pero recomendado: confirma que devuelve datos y no correos.
-- --------------------------------------------

SELECT public.get_invitation_public_by_token(
  (SELECT token
   FROM public.partner_invitations
   WHERE status = 'pending' AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1)
) AS resultado;

-- Exito esperado: 1 fila con un JSON parecido a
--   {"valid": true, "inviterNombre": "Daniel", "hijoNombre": "Pascual",
--    "inviterFotoPath": "<uuid>/cuidador.jpg", "hijoFotoPath": "<uuid>/<uuid>.jpg"}
--
-- Revisa DOS cosas:
--   1. Que NO aparezca ningun @ en el JSON. Si aparece un correo, algo esta mal.
--   2. Que los campos de foto sean PATHS (`uuid/archivo.jpg`) y no URLs http.
--      Si son null, esa persona no tiene foto subida y la pantalla cae a la
--      inicial, que es el comportamiento esperado.
--
-- Si no hay ninguna invitacion pendiente, devuelve NULL y no prueba nada:
-- manda una invitacion de prueba desde la app y vuelve a correr este bloque.
