ALTER TABLE estrategias
ADD COLUMN IF NOT EXISTS p4_visto_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN estrategias.p4_visto_at IS 'Timestamp del primer cierre o posposición del modal P4 (puente Ciclo 1 → Ciclo 2). NULL significa que el modal aún no se mostró.';
