-- ============================================
-- Migracion 012 -- La tabla `patrones`, documentada
--
-- ESTA MIGRACION NO SE CORRE EN PRODUCCION. La tabla YA EXISTE alla desde el
-- rediseno de patrones; se creo directo en el editor de Supabase y nunca quedo
-- en un archivo. Este archivo existe para tres cosas:
--
--   1. Que la forma real de la tabla este en el repo y no solo en la cabeza de
--      Supabase. Hoy, si alguien quiere saber que columnas tiene, tiene que
--      deducirlas leyendo `crearPatron` en HuellaContext -- y ahi no aparecen ni
--      los CHECK, ni las FK, ni la policy, que es justamente lo que importa.
--   2. Poder levantar un entorno nuevo (staging, un fork, una restauracion)
--      con la tabla IDENTICA a produccion.
--   3. Dejar por escrito las reglas de producto que hoy viven como CHECK en la
--      base y que nadie adivinaria leyendo el front.
--
-- Todo el DDL de abajo es IDEMPOTENTE: si por lo que sea se corre contra
-- produccion, no cambia nada y no rompe nada. Aun asi, no hace falta correrlo.
--
-- Fuente: introspeccion de PRODUCCION (information_schema, pg_constraint,
-- pg_indexes, pg_policies, pg_trigger) el 20 de agosto de 2026. No esta
-- deducido del codigo: son los valores reales.
--
-- DEPENDENCIAS: esta tabla necesita que ya existan `auth.users`, `public.hijos`,
-- `public.estrategias` y la funcion `public.get_family_user_ids` (schema.sql).
--
-- AISLAMIENTO -- REGLA ARQUITECTONICA. `patrones` esta separada del motor de
-- rasgos A PROPOSITO: el motor NUNCA la lee. `detectarRasgos` recibe solo
-- episodios e hitos. Nada que se agregue aca puede romper ese aislamiento.
-- ============================================


-- --------------------------------------------
-- BLOQUE 1 de 3 -- Verificacion (SELECT, no modifica nada)
--
-- Snippet: ABRE UNO NUEVO (New query).
-- Confirma que la tabla ya esta y que NO hay nada que correr.
-- --------------------------------------------

SELECT
  to_regclass('public.patrones')                                      AS tabla,
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'patrones')         AS columnas,
  (SELECT count(*) FROM pg_constraint
   WHERE conrelid = 'public.patrones'::regclass)                      AS constraints,
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'patrones')            AS policies;

-- Exito esperado en PRODUCCION: 1 fila ->
--   public.patrones | 15 | 11 | 1
-- Si sale asi, ya esta todo: NO corras los bloques 2 ni 3.
-- Si `tabla` viene NULL, estas en un entorno nuevo y el bloque 2 la crea.


-- --------------------------------------------
-- BLOQUE 2 de 3 -- La definicion (solo para un entorno NUEVO)
--
-- Snippet: el MISMO, borra el bloque 1 y pega esto.
-- En produccion no hace nada: todo es IF NOT EXISTS.
-- --------------------------------------------

BEGIN;

CREATE TABLE IF NOT EXISTS public.patrones (
  -- Identidad y pertenencia
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL,
  hijo_id        uuid,

  -- Las 5 respuestas del formulario. Son la UNICA entrada del analisis:
  -- `analizarPatron` no ve ningun episodio.
  descripcion    text        NOT NULL,
  desde_cuando   text        NOT NULL,
  frecuencia     text        NOT NULL,
  interferencia  text        NOT NULL,
  ya_intentado   text,

  -- Salida de la IA. Se escriben en un UPDATE posterior sobre la MISMA fila,
  -- nunca en el INSERT: si el analisis falla, el relato del padre ya quedo
  -- guardado y la pantalla puede reintentar sin perderlo.
  clasificacion  text,
  orientacion_ia jsonb,

  -- Enganche del plan. Lo escribe `vincularEstrategiaAPatron`.
  estrategia_id  uuid,

  -- Ciclo de vida
  estado         text        NOT NULL DEFAULT 'abierto',
  cierre_motivo  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  cerrado_at     timestamptz,

  -- ── Reglas de producto que viven en la base ──

  CONSTRAINT patrones_desde_cuando_check
    CHECK (desde_cuando = ANY (ARRAY['siempre'::text, 'reciente'::text, 'regresion'::text])),
  CONSTRAINT patrones_frecuencia_check
    CHECK (frecuencia = ANY (ARRAY['diario'::text, 'semanal'::text, 'ocasional'::text])),
  CONSTRAINT patrones_interferencia_check
    CHECK (interferencia = ANY (ARRAY['alta'::text, 'baja'::text])),
  CONSTRAINT patrones_clasificacion_check
    CHECK (clasificacion = ANY (ARRAY['esperable'::text, 'instalado'::text, 'derivar'::text])),
  CONSTRAINT patrones_estado_check
    CHECK (estado = ANY (ARRAY['abierto'::text, 'cerrado'::text])),
  CONSTRAINT patrones_cierre_motivo_check
    CHECK (cierre_motivo = ANY (ARRAY['resuelto'::text, 'ya_no_preocupa'::text, 'dejado_estar'::text])),

  -- EL CHECK QUE MAS IMPORTA, y el que nadie adivinaria leyendo el front:
  -- una REGRESION no puede terminar clasificada como 'esperable' ni como
  -- 'instalado'. Si algo ya se habia logrado y volvio atras, la unica salida
  -- valida es 'derivar'.
  --
  -- La regla esta DOS VECES a proposito: `analizarPatron` la fuerza en el
  -- post-proceso (y ademas se lo avisa al modelo antes de redactar), y este
  -- CHECK es la red por si algun dia alguien escribe la fila por otro camino.
  -- Que el UPDATE reviente ahi es el comportamiento buscado, no un accidente.
  CONSTRAINT patrones_regresion_deriva
    CHECK (NOT ((desde_cuando = 'regresion'::text)
                AND (clasificacion = ANY (ARRAY['esperable'::text, 'instalado'::text])))),

  -- ── Integridad referencial ──
  -- Se borra la cuenta y se van los patrones. Se borra el hijo o el plan y el
  -- patron SOBREVIVE con la referencia en NULL: lo que el padre escribio no se
  -- pierde por borrar otra cosa.
  CONSTRAINT patrones_user_id_fkey
    FOREIGN KEY (user_id)       REFERENCES auth.users(id)         ON DELETE CASCADE,
  CONSTRAINT patrones_hijo_id_fkey
    FOREIGN KEY (hijo_id)       REFERENCES public.hijos(id)       ON DELETE SET NULL,
  CONSTRAINT patrones_estrategia_id_fkey
    FOREIGN KEY (estrategia_id) REFERENCES public.estrategias(id) ON DELETE SET NULL
);

-- Indice que calza con la consulta real de la app: patrones de un hijo,
-- filtrados por estado (el tope de 3 abiertos, la lista de Momentos).
CREATE INDEX IF NOT EXISTS idx_patrones_hijo_estado
  ON public.patrones USING btree (hijo_id, estado);

ALTER TABLE public.patrones ENABLE ROW LEVEL SECURITY;

-- Policy IDENTICA, byte por byte, a la de episodios / hitos / estrategias
-- (schema.sql). No es una convencion propia de patrones: es LA convencion.
--
--   USING      -> lee toda la familia
--   WITH CHECK -> escribe SOLO el autor
--
-- El WITH CHECK es lo que impide que la pareja edite o cierre un patron ajeno:
-- puede alcanzar la fila por el USING, pero la fila resultante seguiria
-- teniendo el user_id del autor, y ahi el WITH CHECK la rechaza. El front pone
-- ademas un `.eq('user_id', user.id)` en los UPDATE, que convierte ese rechazo
-- en un no-op silencioso en vez de un error.
--
-- Se crea SOLO si falta, para que correr esto en produccion no tire la policy
-- vigente ni por un instante.
DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'patrones' AND policyname = 'family_data'
  ) THEN
    CREATE POLICY "family_data" ON public.patrones
      FOR ALL
      USING      (user_id = ANY (public.get_family_user_ids(auth.uid())))
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$policy$;

COMMIT;

-- Exito esperado: "Success. No rows returned".
--
-- SOBRE LOS GRANTS -- por que NO se reproducen aca.
-- En produccion, anon y authenticated tienen los 7 privilegios sobre esta tabla
-- (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER). No es una
-- decision de este proyecto: es lo que Supabase otorga por defecto a toda tabla
-- del esquema `public`, igual que a episodios, hitos y estrategias. Quien
-- protege los datos es la RLS de arriba, no los grants. Escribirlos aca daria
-- la impresion de que alguien decidio darle TRUNCATE a anon, y ademas pisaria
-- los defaults de Supabase en un entorno nuevo. Por eso se documentan y no se
-- emiten.
--
-- SIN TRIGGERS. La tabla no tiene ninguno: no hay `updated_at`. Las fechas que
-- importan son `created_at` (default now()) y `cerrado_at`, que la escribe
-- `cerrarPatron` desde el cliente.
--
-- SIN COMMENT ON TABLE. Produccion no tiene comentario en la tabla, y este
-- archivo documenta sin modificar: agregarlo seria el unico cambio real que
-- este archivo introduciria en prod si se corriera, y no vale la pena.


-- --------------------------------------------
-- BLOQUE 3 de 3 -- Verificacion de equivalencia (SELECT, no modifica nada)
--
-- Snippet: el MISMO, borra el bloque 2 y pega esto.
-- Solo hace falta en un entorno NUEVO, para confirmar que quedo igual a prod.
-- --------------------------------------------

SELECT
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'patrones')          AS columnas_esperadas_15,
  (SELECT count(*) FROM pg_constraint
   WHERE conrelid = 'public.patrones'::regclass AND contype = 'c')     AS checks_esperados_7,
  (SELECT count(*) FROM pg_constraint
   WHERE conrelid = 'public.patrones'::regclass AND contype = 'f')     AS fks_esperadas_3,
  (SELECT count(*) FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'patrones')             AS indices_esperados_2,
  (SELECT relrowsecurity FROM pg_class
   WHERE oid = 'public.patrones'::regclass)                            AS rls_esperada_true,
  (SELECT count(*) FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'patrones')             AS policies_esperadas_1;

-- Exito esperado: 15 | 7 | 3 | 2 | true | 1
-- Cualquier numero distinto significa que el entorno nuevo NO quedo igual a
-- produccion, y conviene mirar cual antes de usarlo.
