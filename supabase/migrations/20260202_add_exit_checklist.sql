-- Migration: Add Exit Checklist columns to listas_chequeo

DO $$
BEGIN
    -- 1. Agregar Detalles de Salida (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_chequeo' AND column_name = 'detalles_salida') THEN
        ALTER TABLE listas_chequeo ADD COLUMN detalles_salida JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Agregar Fotos de Salida (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_chequeo' AND column_name = 'fotos_salida') THEN
        ALTER TABLE listas_chequeo ADD COLUMN fotos_salida JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 3. Agregar Timestamp de Confirmación Salida
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_chequeo' AND column_name = 'confirmado_salida_en') THEN
        ALTER TABLE listas_chequeo ADD COLUMN confirmado_salida_en TIMESTAMP WITH TIME ZONE;
    END IF;

    -- 4. Agregar Usuario que confirmó salida (Opcional, pero útil)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'listas_chequeo' AND column_name = 'confirmado_salida_por') THEN
       ALTER TABLE listas_chequeo ADD COLUMN confirmado_salida_por UUID REFERENCES perfiles(id);
    END IF;

END $$;

-- Comentario para verificar
COMMENT ON COLUMN listas_chequeo.detalles_salida IS 'Estado de items al momento de la entrega (salida)';
COMMENT ON COLUMN listas_chequeo.fotos_salida IS 'URLs de fotos obligatorias tomadas al momento de salida';
