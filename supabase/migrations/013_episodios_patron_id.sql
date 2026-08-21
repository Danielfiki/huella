-- ============================================
-- Migracion 013 -- Vinculo momento <-> patron (episodios.patron_id)
--
-- ESTA MIGRACION SI SE CORRE EN PRODUCCION. A diferencia de la 012, que solo
-- documentaba una tabla que ya existia, esta agrega una columna nueva.
--
-- QUE ABRE. Hoy no existe NINGUNA relacion en datos entre un momento y un
-- patron. Los momentos se registran, los patrones se registran, y nadie sabe
-- que el berrinche del martes es una manifestacion mas de "no deja el chupete".
-- Sin esa relacion no se puede:
--   * decir cuantos momentos lleva un patron,
--   * re-analizar la lectura con lo que paso despues de registrarla (bloque 7),
--   * y sobre todo, hacer que el patron EMERJA SOLO desde momentos repetidos,
--     que es el norte del producto (opcion B).
-- Esta columna es el cimiento de los tres.
--
-- Bloque 5 de 8 del plan Patrones Vivos. Los bloques 6 (vincular al registrar) y
-- 7 (actualizar lectura) dependen de esto y NO se tocan aca: esta migracion no
-- trae UI ni logica de vinculacion, solo la columna.
--
-- SEGURIDAD DEL CAMBIO -- por que es de bajo riesgo:
--   * Es ADITIVA. No altera ninguna columna existente ni toca ninguna fila.
--   * La columna es NULLABLE y sin default: los episodios que ya existen quedan
--     en NULL, que es exactamente lo que corresponde -- "este momento no esta
--     vinculado a ningun patron". No hay backfill que hacer.
--   * Es IDEMPOTENTE. Correrla dos veces no cambia nada ni tira error.
--   * No hay downtime: ADD COLUMN de una columna nullable sin default no
--     reescribe la tabla en Postgres moderno.
--
-- AISLAMIENTO -- REGLA ARQUITECTONICA INTOCADA. El motor de rasgos NO se entera
-- de esto. `detectarRasgos` recibe episodios e hitos y nunca lee `patrones`;
-- agregarle una columna a `episodios` no cambia lo que ese motor consume. La
-- separacion sigue igual de estricta que antes de esta migracion.
--
-- RLS -- NO HACE FALTA NINGUNA POLICY NUEVA. Verificado contra el esquema:
-- `episodios` tiene la policy `family_data` FOR ALL, con
-- USING (user_id = any(get_family_user_ids(auth.uid()))) y
-- WITH CHECK (auth.uid() = user_id). Las policies de Postgres son a nivel de
-- FILA, no de columna: una columna nueva queda cubierta automaticamente por la
-- policy que ya protege esa fila. Quien puede leer el episodio puede leer su
-- patron_id, y quien puede escribirlo puede escribirlo. Es la misma herencia
-- que ya ocurrio cuando se agrego `hijo_id` (migracion 001) y cuando se
-- agregaron las columnas de accion rapida (migracion 003).
--
-- LIMITE CONOCIDO, PARA EL BLOQUE 6 -- leer antes de implementar la
-- vinculacion. La FK garantiza que el patron EXISTA, pero NO que sea de la
-- misma familia: nada a nivel de base impide escribir en `patron_id` el id de
-- un patron ajeno. La RLS de `episodios` valida quien puede tocar la FILA, no
-- a que apunta la columna. En la practica el riesgo es nulo (los ids son UUID y
-- la UI solo ofrece los patrones del hijo activo), pero si el bloque 6 va a
-- escribir esta columna, la validacion de pertenencia la tiene que poner el
-- cliente o un CHECK/trigger -- no la da esta migracion.
--
-- Ejecutar en: Supabase Dashboard -> SQL Editor. Los 3 bloques UNO POR UNO.
-- ============================================


-- --------------------------------------------
-- BLOQUE 1 de 3 -- Verificacion PREVIA (SELECT, no modifica nada)
--
-- Snippet: ABRE UNO NUEVO (New query).
-- --------------------------------------------

SELECT
  (SELECT count(*) FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'episodios'
     AND column_name  = 'patron_id')            AS columna_ya_existe,
  (SELECT count(*) FROM public.episodios)       AS episodios_antes;

-- Exito esperado: 1 fila con
--   columna_ya_existe = 0
--   episodios_antes   = <un numero>
--
-- ANOTA EL NUMERO DE `episodios_antes`. El bloque 3 lo vuelve a pedir y tienen
-- que ser IDENTICOS: es la prueba de que la migracion no toco ninguna fila.
--
-- Si `columna_ya_existe` sale 1, la migracion ya se corrio: salta al bloque 3.


-- --------------------------------------------
-- BLOQUE 2 de 3 -- La migracion
--
-- Snippet: el MISMO, borra el bloque 1 y pega esto.
-- --------------------------------------------

BEGIN;

-- La columna. Nullable y sin default a proposito: NULL significa "este momento
-- no pertenece a ningun patron", que es el estado de todos los episodios que ya
-- existen y de la mayoria de los que vendran.
ALTER TABLE public.episodios
  ADD COLUMN IF NOT EXISTS patron_id uuid;

-- La FK. ON DELETE SET NULL, el MISMO criterio que patrones.hijo_id y
-- patrones.estrategia_id: borrar un patron NO puede borrar los momentos que
-- alguna vez se le vincularon. El momento es el dato sagrado de esta app -- lo
-- escribio el padre y no se pierde por borrar otra cosa. Al borrar el patron,
-- sus momentos simplemente vuelven a quedar sin vincular.
--
-- Va en un DO porque ADD CONSTRAINT no acepta IF NOT EXISTS: sin esta guarda,
-- correr el bloque dos veces tiraria error en vez de no hacer nada.
DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.episodios'::regclass
      AND conname  = 'episodios_patron_id_fkey'
  ) THEN
    ALTER TABLE public.episodios
      ADD CONSTRAINT episodios_patron_id_fkey
      FOREIGN KEY (patron_id) REFERENCES public.patrones(id) ON DELETE SET NULL;
  END IF;
END
$fk$;

-- Indice PARCIAL, no completo. La consulta que este indice tiene que servir es
-- una sola: "dame los momentos de ESTE patron". Como la enorme mayoria de los
-- episodios va a tener patron_id NULL, un indice completo guardaria millones de
-- entradas nulas que nadie consulta.
--
-- El parcial funciona igual para esa consulta: Postgres puede usarlo cuando el
-- predicado de la query implica el del indice, y `patron_id = '<uuid>'` implica
-- `patron_id IS NOT NULL`. Mismo servicio, una fraccion del tamano.
CREATE INDEX IF NOT EXISTS idx_episodios_patron_id
  ON public.episodios (patron_id)
  WHERE patron_id IS NOT NULL;

COMMENT ON COLUMN public.episodios.patron_id IS
  'Patron al que pertenece este momento, si pertenece a alguno. NULL = sin vincular, que es el estado por defecto. Base del re-analisis de la lectura (bloque 7) y de que el patron emerja solo desde momentos repetidos (norte del producto).';

COMMIT;

-- Exito esperado: "Success. No rows returned".


-- --------------------------------------------
-- BLOQUE 3 de 3 -- Verificacion POSTERIOR (SELECT, no modifica nada)
--
-- Snippet: el MISMO, borra el bloque 2 y pega esto.
-- --------------------------------------------

SELECT
  (SELECT data_type FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'episodios'
     AND column_name = 'patron_id')                         AS tipo_columna,
  (SELECT is_nullable FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'episodios'
     AND column_name = 'patron_id')                         AS nullable,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'public.episodios'::regclass
     AND conname  = 'episodios_patron_id_fkey')             AS fk,
  (SELECT indexdef FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'episodios'
     AND indexname  = 'idx_episodios_patron_id')            AS indice,
  (SELECT count(*) FROM public.episodios)                   AS episodios_despues,
  (SELECT count(*) FROM public.episodios
   WHERE patron_id IS NOT NULL)                             AS ya_vinculados;

-- Exito esperado: 1 fila con
--   tipo_columna      = uuid
--   nullable          = YES
--   fk                = FOREIGN KEY (patron_id) REFERENCES patrones(id) ON DELETE SET NULL
--   indice            = CREATE INDEX idx_episodios_patron_id ON public.episodios
--                       USING btree (patron_id) WHERE (patron_id IS NOT NULL)
--   episodios_despues = EL MISMO NUMERO que anotaste del bloque 1
--   ya_vinculados     = 0
--
-- Las dos ultimas son las que importan de verdad:
--   * `episodios_despues` distinto de `episodios_antes` significaria que algo
--     toco filas, y esta migracion no debe tocar ninguna. Si no calzan, AVISA
--     antes de seguir.
--   * `ya_vinculados` = 0 es lo correcto: todavia no hay nada que vincule
--     momentos con patrones. Eso llega en el bloque 6.
