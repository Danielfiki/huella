-- ══════════════════════════════════════════════════════════════
-- Migración 021 — `respuesta_ia` en los avances (hitos)
-- La micro-respuesta de Huella al avance que acaba de registrar el cuidador.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Estado: PENDIENTE de correr en producción.
--
-- Por qué hace falta: `hitos` no tiene ninguna columna de texto de IA. Al lado,
-- `episodios` tiene `orientacion_ia` y `reflexion_respuesta`. Hoy el cuidador
-- registra un avance y no recibe nada de vuelta; esta columna es donde queda
-- guardado lo que Huella le responde, para que no se pierda al salir de la
-- pantalla y pueda mostrarse después en el álbum de avances.
--
-- Un disparo por hito, igual que la micro-respuesta de la reflexión: el candado
-- es la propia columna. Si ya tiene texto, no se vuelve a llamar a la IA.
--
-- SIN GRANT, y esto NO es un olvido. `public.perfiles` tiene GRANT por columna
-- en lista blanca desde el fix de seguridad del 29 jun 2026, y toda columna
-- nueva de `perfiles` escribible desde el cliente necesita el suyo. `hitos` NO
-- usa ese patrón: tiene el GRANT a nivel de tabla. La prueba es que
-- `updateHitoFoto` (HuellaContext.jsx:1305) escribe `foto_url` con un update
-- directo desde el cliente y funciona en producción hoy. Si `hitos` tuviera
-- lista blanca, esa escritura ya estaría devolviendo 403.
--
-- Columna aditiva e idempotente, mismo patrón que las migraciones 013, 014,
-- 015 y 020. No toca ninguna fila existente: las que ya están quedan en NULL,
-- que es la verdad — a esos avances nunca se les generó una respuesta.
-- ══════════════════════════════════════════════════════════════

-- 1. La columna. Nullable y sin default: NULL significa "todavía no se generó",
--    y es justo lo que el candado necesita distinguir.
alter table public.hitos
  add column if not exists respuesta_ia text;

-- 2. Qué es, escrito en la base para que no haya que venir al repo a saberlo.
comment on column public.hitos.respuesta_ia is
  'Micro-respuesta de Huella al avance, generada con Haiku (claude-haiku-4-5) una sola vez por hito. Dos frases: qué dice el avance de quién está siendo el hijo, y una cosa concreta que el cuidador puede hacer esta semana. NULL = todavía no se generó; la propia columna es el candado que impide una segunda llamada a la IA.';

-- 3. Verificación. Debe devolver UNA fila: respuesta_ia | text | YES
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'hitos'
  and column_name  = 'respuesta_ia';
