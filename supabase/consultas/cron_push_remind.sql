-- ============================================
-- Pieza 7 · el job que dispara el aviso diario
--
-- POR QUE NO VA EN VERCEL: el plan es Hobby y ahi los cron solo corren UNA vez
-- al dia, sin precision de hora. La pieza necesita disparar a la hora que cada
-- padre eligio, asi que el job se muda a Supabase.
--
-- QUE HACE: cada media hora llama a api/push-remind.js. El endpoint calcula la
-- hora local de Chile y manda solo a quienes tienen esa hora guardada. Corre en
-- :00 y :30 porque una de las tres opciones es 21:30.
--
-- 48 corridas al dia. Casi todas no mandan nada y salen en una sola consulta
-- barata (el filtro va en el SELECT, no en el bucle).
--
-- EL SECRETO VA EN VAULT, NO ESCRITO ACA. Lo que se pone en cron.schedule
-- queda guardado en la tabla cron.job, que es legible por cualquiera con
-- acceso a la base. Vault lo guarda cifrado y el job lo lee al ejecutarse.
--
-- Ejecutar POR PARTES en: Supabase Dashboard -> SQL Editor -> New query.
-- ============================================


-- ══════════════════════════════════════════
-- PASO 1 — Instalar las dos extensiones.
-- Verificado el 9 sep: pg_cron 1.6.4 y pg_net 0.20.0 estan DISPONIBLES pero
-- no instaladas. Esto las instala.
-- ══════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron  WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net   WITH SCHEMA extensions;

-- Esperado: dos filas con installed_version lleno.
SELECT name, installed_version
FROM pg_available_extensions
WHERE name IN ('pg_cron', 'pg_net');


-- ══════════════════════════════════════════
-- PASO 2 — Guardar el CRON_SECRET en Vault.
-- REEMPLAZA el texto entre comillas por el valor real de CRON_SECRET, el
-- MISMO que esta en las variables de entorno de Vercel. Si no coinciden, el
-- endpoint responde 401 y no se manda nada.
-- ══════════════════════════════════════════

SELECT vault.create_secret(
  'PEGA_AQUI_EL_CRON_SECRET',
  'cron_secret_push',
  'Bearer token que api/push-remind.js exige. Mismo valor que CRON_SECRET en Vercel.'
);

-- Esperado: una fila con el nombre. NO devuelve el valor en claro.
SELECT name, description, created_at
FROM vault.secrets
WHERE name = 'cron_secret_push';


-- ══════════════════════════════════════════
-- PASO 3 — Crear el job.
-- Corre en :00 y :30 de cada hora, en UTC (pg_cron siempre agenda en UTC).
-- No importa: el horario de Chile lo resuelve el endpoint, que ademas maneja
-- solo el cambio de huso. Agendar en UTC y decidir en el endpoint es lo que
-- evita tener que tocar el cron dos veces al anio.
-- ══════════════════════════════════════════

SELECT cron.schedule(
  'push-remind-huella',
  '0,30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://www.huella.lat/api/push-remind',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'cron_secret_push'
      )
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Esperado: una fila, active = true, schedule = '0,30 * * * *'.
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'push-remind-huella';


-- ══════════════════════════════════════════
-- PASO 4 — Verificar en la primera media hora.
-- Correr DESPUES de que pase un :00 o un :30.
-- ══════════════════════════════════════════

-- (a) El job corrio? status debe decir 'succeeded'.
SELECT j.jobname, d.status, d.start_time, d.return_message
FROM cron.job_run_details d
JOIN cron.job j ON j.jobid = d.jobid
WHERE j.jobname = 'push-remind-huella'
ORDER BY d.start_time DESC
LIMIT 5;

-- (b) Que respondio el endpoint? 200 con {"sent":N,...} es exito.
--     Un 401 significa que el secreto de Vault no coincide con el de Vercel.
SELECT id, status_code, content, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;


-- ══════════════════════════════════════════
-- PARA DESHACER (si algo sale mal)
-- ══════════════════════════════════════════
-- SELECT cron.unschedule('push-remind-huella');
