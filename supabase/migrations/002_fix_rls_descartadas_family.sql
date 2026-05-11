-- Migration 002: arreglar RLS de estrategia_sugerencias_descartadas para familias
-- Problema: la policy actual filtra por hijo_id IN (SELECT id FROM hijos WHERE user_id = auth.uid())
-- Esto no incluye hijos del partner, entonces la pareja no puede leer ni insertar descartes.
-- Solución: usar get_family_user_ids(auth.uid()) igual que las demás tablas de datos.

-- Ejecutar en Supabase SQL Editor:

DROP POLICY IF EXISTS "Users can manage their own discards" ON public.estrategia_sugerencias_descartadas;
DROP POLICY IF EXISTS "family members can manage discards" ON public.estrategia_sugerencias_descartadas;

CREATE POLICY "family members can manage discards"
ON public.estrategia_sugerencias_descartadas
FOR ALL
TO authenticated
USING (
  user_id = ANY(public.get_family_user_ids(auth.uid()))
)
WITH CHECK (
  user_id = auth.uid()
);
