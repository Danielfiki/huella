-- ════════════════════════════════════════════════════════════════════
-- 027 · Preguntar a Huella
--
-- Una fila por conversación: el papá hace una duda sobre un hijo y Huella
-- responde, hasta 5 preguntas sobre el MISMO tema. Al cerrar (a las 5, o con
-- "Terminar") quedan el resumen de 2 líneas y UN paso siguiente.
--
-- Registrar ≠ Preguntar: esta tabla no toca episodios, hitos ni patrones, y
-- el motor de rasgos no la lee.
--
-- Lo que queda fuera del marco (medicamentos, salud física, diagnóstico,
-- temas legales) NO se guarda: el cliente no inserta ni agrega esos mensajes.
--
-- mensajes es un array JSON, en orden:
--   [{ "pregunta": "...", "respuesta": "...", "lente": "Autor · Lente",
--      "fecha": "2026-09-29T21:40:00Z" }, ...]
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.preguntas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hijo_id         uuid        NOT NULL REFERENCES public.hijos(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  estado          text        NOT NULL DEFAULT 'abierta'
                              CHECK (estado IN ('abierta', 'cerrada')),
  mensajes        jsonb       NOT NULL DEFAULT '[]'::jsonb
                              CHECK (jsonb_typeof(mensajes) = 'array'),
  resumen         text,
  paso_siguiente  text
                              CHECK (paso_siguiente IS NULL OR paso_siguiente IN
                                     ('registrar', 'algo_que_no_cambia', 'plan', 'especialista'))
);

CREATE INDEX IF NOT EXISTS idx_preguntas_hijo_fecha
  ON public.preguntas (hijo_id, created_at DESC);

ALTER TABLE public.preguntas ENABLE ROW LEVEL SECURITY;

-- Policy IDÉNTICA a la de episodios / hitos / estrategias / patrones: la
-- familia lee, cada uno escribe solo lo suyo. Así el modo pareja se comporta
-- igual que con los episodios.
DROP POLICY IF EXISTS "family_data" ON public.preguntas;
CREATE POLICY "family_data" ON public.preguntas
  FOR ALL
  USING      (user_id = ANY (public.get_family_user_ids(auth.uid())))
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preguntas TO authenticated;
