-- ══════════════════════════════════════════════════════════════
-- Diagnóstico de intentos de pago — consulta de monitoreo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- CUÁNDO USARLA: cuando un usuario reporte que no pudo pagar.
-- Muestra los últimos 100 intentos con la etapa donde quedó cada uno,
-- el error que se registró y si venía de celular o de escritorio.
--
-- Esta consulta NO modifica nada: es solo lectura.
-- La tabla `pagos_intentos` tiene RLS activa sin policies, así que esto
-- solo funciona desde el SQL Editor (o con service role), nunca desde
-- la app. Ver `supabase/migrations/009_pagos_intentos.sql`.
-- ══════════════════════════════════════════════════════════════

select
  p.created_at,
  p.referencia,
  p.origen,
  p.etapa,
  p.resultado,
  p.plataforma,
  u.email,
  p.error_mensaje,
  p.error_detalle,
  p.user_agent
from public.pagos_intentos p
left join auth.users u on u.id = p.user_id
order by p.created_at desc
limit 100;


-- ──────────────────────────────────────────────────────────────
-- VARIANTE — buscar por referencia específica
-- Úsala cuando el usuario te dicte su código (formato HP-XXXXXX).
-- Reemplaza HP-XXXXXX por el código real y corre este bloque.
-- ──────────────────────────────────────────────────────────────

-- select
--   p.created_at,
--   p.referencia,
--   p.origen,
--   p.etapa,
--   p.resultado,
--   p.plataforma,
--   u.email,
--   p.error_mensaje,
--   p.error_detalle,
--   p.user_agent
-- from public.pagos_intentos p
-- left join auth.users u on u.id = p.user_id
-- where p.referencia = 'HP-XXXXXX'
-- order by p.created_at desc;
