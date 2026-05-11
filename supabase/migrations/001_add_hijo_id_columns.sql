-- Migration 001: hijo_id FK columns
-- Context: episodios, hitos, estrategias y rutinas tienen columna hijo_id (uuid, FK a hijos.id).
-- Esta columna vincula cada registro a un hijo específico dentro de la familia.
-- El schema.sql ya incluye estas columnas; este archivo documenta el cambio para referencia.
-- Estado: activo en producción desde mayo 2025.

-- Si necesitas agregar hijo_id a una tabla que aún no lo tiene:
-- ALTER TABLE public.<tabla> ADD COLUMN IF NOT EXISTS hijo_id uuid REFERENCES public.hijos(id) ON DELETE SET NULL;
-- CREATE INDEX IF NOT EXISTS idx_<tabla>_hijo_id ON public.<tabla>(hijo_id);
