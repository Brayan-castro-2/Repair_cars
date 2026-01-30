-- ============================================
-- SCRIPT DE CORRECCIÓN DE ESQUEMA
-- Agregar columna metodos_pago a la tabla ordenes
-- ============================================

-- 1. Agregar la columna JSONB para múltiples métodos de pago
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordenes' AND column_name = 'metodos_pago') THEN
        ALTER TABLE ordenes ADD COLUMN metodos_pago JSONB DEFAULT NULL;
        COMMENT ON COLUMN ordenes.metodos_pago IS 'Lista de pagos parciales: [{metodo: string, monto: number}]';
    END IF;
END $$;

-- 2. Migrar datos existentes (Opcional, pero recomendado)
-- Si hay un metodo_pago simple, lo convertimos al formato array en metodos_pago
UPDATE ordenes 
SET metodos_pago = jsonb_build_array(
    jsonb_build_object(
        'metodo', metodo_pago, 
        'monto', precio_total
    )
)
WHERE metodos_pago IS NULL 
  AND metodo_pago IS NOT NULL 
  AND precio_total > 0;

-- 3. Verificar que se creó
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ordenes' AND column_name = 'metodos_pago';
