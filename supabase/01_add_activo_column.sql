-- ============================================
-- PASO 1: AGREGAR COLUMNA ACTIVO A PERFILES
-- ============================================
-- Ejecuta esto PRIMERO

ALTER TABLE perfiles 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Verificar que se agregó
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'perfiles' 
ORDER BY ordinal_position;
