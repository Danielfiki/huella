-- ══════════════════════════════════════════════════════════════
-- Migración 022 — las categorías del avance pasan a ser las lentes del retrato
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Estado: PENDIENTE de correr en producción.
--
-- ⚠️ CORRER ESTA MIGRACIÓN **ANTES** DE DESPLEGAR EL CÓDIGO NUEVO.
-- El código nuevo guarda `categoria = NULL` cuando el padre no elige lente, y
-- hoy la columna es NOT NULL: si el deploy entra primero, ese guardado revienta
-- y el padre pierde lo que escribió. El paso 2 de acá abajo es el que abre la
-- puerta. Es el único orden que funciona.
--
-- Qué cambia: `hitos.categoria` dejaba de hablar el idioma del retrato. Eran
-- 6 valores sueltos, uno en inglés (`frustration`), que no decían a qué familia
-- del retrato pertenecía el avance. Pasan a ser 12 lentes —4 por familia— que
-- sí la declaran, y esa familia es la que ahora viaja al motor de rasgos como
-- señal de lo que el propio padre eligió mirar.
--
-- Y desaparece la lente "otro". Una chip que no dice nada competía con las que
-- sí dicen algo. Si el padre no elige ninguna, la columna queda en NULL: eso ya
-- significa "no eligió", y no hace falta un valor para decirlo.
--
-- El mapeo, valor por valor:
--   autorregulacion → se_calmo        (calma)
--   empatia         → cuido           (fortalezas)
--   disculpa        → cuido           (fortalezas)  ← dos viejos caen en uno
--   frustration     → acepto_un_no    (calma)
--   social          → jugo_con_otros  (fortalezas)
--   otro            → NULL            (sin lente)
--
-- `empatia` y `disculpa` colapsan en `cuido`: el pedir disculpas y el consolar
-- son la misma cosa vista dos veces, y separarlos partía la evidencia de un
-- rasgo en dos montones que nunca se sumaban.
--
-- Las 7 lentes nuevas (se_intereso, se_atrevio, creo_algo, logro_cuerpo,
-- lo_hizo_solo, dijo_algo, pidio_ayuda, humor) no reciben ninguna fila: no
-- existía forma de registrarlas antes, así que no hay nada que migrar hacia
-- ellas. Empiezan vacías, y es correcto.
--
-- SIN GRANT, y no es un olvido. La lista blanca por columna es de
-- `public.perfiles` (fix del 29 jun 2026). `hitos` tiene el GRANT a nivel de
-- tabla, y la prueba es que `updateHitoFoto` escribe `foto_url` desde el
-- cliente y funciona en producción hoy.
--
-- Idempotente: correrla dos veces no hace daño. La segunda pasada no encuentra
-- ningún valor viejo y actualiza 0 filas.
-- ══════════════════════════════════════════════════════════════

-- ── PASO 1. Qué hay hoy. Correr ESTO PRIMERO y mirar el resultado ──
-- Deja constancia de cuántas filas tiene cada valor antes de tocar nada.
-- Si aparece un valor que no esté en el mapeo de arriba, PARAR: significa que
-- algo escribió una categoría que no conocíamos.
select coalesce(categoria, '(null)') as categoria, count(*) as filas
from public.hitos
group by categoria
order by filas desc;

-- ── PASO 2. Abrir la columna a NULL ──
-- Hoy es NOT NULL (viene del create table original). Sin esto, el UPDATE del
-- paso 3 que manda `otro` a NULL falla entero, y el código nuevo tampoco puede
-- guardar un avance sin lente.
alter table public.hitos
  alter column categoria drop not null;

-- ── PASO 3. La migración de los valores ──
update public.hitos set categoria = 'se_calmo'       where categoria = 'autorregulacion';
update public.hitos set categoria = 'cuido'          where categoria = 'empatia';
update public.hitos set categoria = 'cuido'          where categoria = 'disculpa';
update public.hitos set categoria = 'acepto_un_no'   where categoria = 'frustration';
update public.hitos set categoria = 'jugo_con_otros' where categoria = 'social';
update public.hitos set categoria = null             where categoria = 'otro';

-- ── PASO 4. Verificación. El mismo SELECT del paso 1 ──
-- Tiene que devolver SOLO valores de la lista nueva, más `(null)`:
--   se_intereso, se_atrevio, creo_algo, logro_cuerpo,
--   cuido, lo_hizo_solo, jugo_con_otros, dijo_algo,
--   se_calmo, acepto_un_no, pidio_ayuda, humor
-- Si sale una sola fila con autorregulacion, empatia, disculpa, frustration,
-- social u otro, la migración NO terminó.
select coalesce(categoria, '(null)') as categoria, count(*) as filas
from public.hitos
group by categoria
order by filas desc;

-- ── PASO 5. Red de seguridad. Debe devolver CERO filas ──
select categoria, count(*) as filas
from public.hitos
where categoria in ('autorregulacion', 'empatia', 'disculpa', 'frustration', 'social', 'otro')
group by categoria;

-- ── PASO 6. Confirmar que la columna quedó nullable. Debe decir YES ──
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'hitos' and column_name = 'categoria';
