-- ============================================
-- SCRIPT FINAL DE REPARACIÓN Y POBLACIÓN
-- ============================================

-- 1. ASEGURAR ESTRUCTURA DE TABLAS
-- ============================================

-- A) Recrear tabla CITAS (DROP para asegurar columnas correctas)
DROP TABLE IF EXISTS citas CASCADE;
CREATE TABLE citas (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cliente_nombre TEXT,
    cliente_telefono TEXT,
    patente_vehiculo TEXT,
    servicio_solicitado TEXT,
    notas TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    creado_por UUID REFERENCES perfiles(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B) Asegurar columna metodos_pago en ORDENES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ordenes' AND column_name = 'metodos_pago') THEN
        ALTER TABLE ordenes ADD COLUMN metodos_pago JSONB DEFAULT NULL;
    END IF;
END $$;

-- ============================================
-- 2. LIMPIEZA TOTAL (TRUNCATE)
-- ============================================
TRUNCATE TABLE citas CASCADE;
TRUNCATE TABLE ordenes CASCADE;
TRUNCATE TABLE vehiculos CASCADE;
TRUNCATE TABLE clientes CASCADE;

-- Reiniciar secuencias
ALTER SEQUENCE IF EXISTS clientes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS ordenes_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS citas_id_seq RESTART WITH 1;

-- ============================================
-- 3. INSERTAR DATOS BASE (CLIENTES Y VEHÍCULOS)
-- ============================================

INSERT INTO clientes (id, nombre, telefono, email) VALUES
(1, 'Juan Pérez', '+56912345678', 'juan.perez@email.com'),
(2, 'María González', '+56987654321', 'maria.gonzalez@email.com'),
(3, 'Pedro Silva', '+56923456789', 'pedro.silva@email.com'),
(4, 'Ana Martínez', '+56934567890', 'ana.martinez@email.com'),
(5, 'Luis Torres', '+56945678901', 'luis.torres@email.com'),
(6, 'Carmen Díaz', '+56956789012', 'carmen.diaz@email.com'),
(7, 'Roberto Muñoz', '+56967890123', 'roberto.munoz@email.com'),
(8, 'Patricia Rojas', '+56978901234', 'patricia.rojas@email.com'),
(9, 'Francisco Soto', '+56989012345', 'francisco.soto@email.com'),
(10, 'Isabel Castro', '+56990123456', 'isabel.castro@email.com'),
(11, 'Diego Ramírez', '+56901234567', 'diego.ramirez@email.com'),
(12, 'Sofía Vargas', '+56912309876', 'sofia.vargas@email.com'),
(13, 'Andrés Morales', '+56923098765', 'andres.morales@email.com'),
(14, 'Valentina Herrera', '+56934098765', 'valentina.herrera@email.com'),
(15, 'Gabriel Núñez', '+56945098765', 'gabriel.nunez@email.com'),
(16, 'Transportes SA', '+56956098765', 'contacto@transportessa.cl'),
(17, 'Empresa FlotaVan', '+56967098765', 'servicios@flotavan.cl'),
(18, 'Carlos Pinto', '+56978098765', 'carlos.pinto@email.com'),
(19, 'Lorena Fuentes', '+56989098765', 'lorena.fuentes@email.com'),
(20, 'Mateo Álvarez', '+56990098765', 'mateo.alvarez@email.com');

INSERT INTO vehiculos (patente, marca, modelo, anio, motor, color, cliente_id) VALUES
('ZZ1122', 'Chevrolet', 'Sail', '2020', '1.4', 'Blanco', 1),
('JJPP77', 'Peugeot', 'Partner', '2015', '1.6 HDi', 'Gris', 16),
('XY9988', 'Kia', 'Rio 5', '2019', '1.4', 'Rojo', 2),
('ABCD10', 'Toyota', 'Hilux', '2018', '2.8 TD', 'Negro', 17),
('WXYZ66', 'Nissan', 'Versa', '2021', '1.6', 'Plata', 3),
('QWER55', 'Hyundai', 'Accent', '2017', '1.4', 'Azul', 4),
('ASDF44', 'Suzuki', 'Swift', '2020', '1.2', 'Blanco', 5),
('ZXCV33', 'Ford', 'Fiesta', '2016', '1.6', 'Negro', 6),
('TYUI22', 'Mazda', 'CX-3', '2019', '2.0', 'Rojo', 7),
('GHJK11', 'Honda', 'Fit', '2018', '1.5', 'Plata', 8),
('BNMQ99', 'Volkswagen', 'Gol', '2015', '1.6', 'Blanco', 9),
('PLOK88', 'Renault', 'Clio', '2019', '1.2 TCe', 'Azul', 10),
('MNBV77', 'Chevrolet', 'Spark', '2020', '1.2', 'Verde', 11),
('LKJH66', 'Toyota', 'Yaris', '2021', '1.5', 'Blanco', 12),
('POIU55', 'Mitsubishi', 'L200', '2017', '2.4 TD', 'Gris', 13),
('NBVC44', 'Nissan', 'March', '2016', '1.6', 'Rojo', 14),
('MLKJ33', 'Kia', 'Sportage', '2020', '2.0', 'Negro', 15),
('GGTT22', 'Peugeot', '208', '2019', '1.6', 'Blanco', 18),
('HHYY11', 'Ford', 'Ranger', '2018', '3.2 TD', 'Azul', 19),
('JJKK00', 'Hyundai', 'Tucson', '2021', '2.0', 'Plata', 20);

-- ============================================
-- 4. INSERTAR ÓRDENES HISTÓRICAS (Normales)
-- ============================================

INSERT INTO ordenes (patente_vehiculo, descripcion_ingreso, estado, creado_por, fecha_ingreso, cliente_nombre, cliente_telefono, precio_total, metodo_pago, metodos_pago, fecha_completada, detalles_vehiculo) VALUES
('ZZ1122', 'Cambio de aceite', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-10-02 09:30:00-03', 'Juan Pérez', '+56912345678', 35000, 'efectivo', '[{"metodo": "efectivo", "monto": 35000}]', '2025-10-02 11:00:00-03', 'OK'),
('XY9988', 'Frenos delanteros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-10-07 14:20:00-03', 'María González', '+56987654321', 95000, 'transferencia', '[{"metodo": "transferencia", "monto": 95000}]', '2025-10-07 17:00:00-03', 'OK'),
('WXYZ66', 'Mantención 50k', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-10-10 08:00:00-03', 'Pedro Silva', '+56923456789', 125000, 'transferencia', '[{"metodo": "transferencia", "monto": 125000}]', '2025-10-10 12:30:00-03', 'OK'),
('QWER55', 'Batería nueva', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-10-12 11:00:00-03', 'Ana Martínez', '+56934567890', 75000, 'efectivo', '[{"metodo": "efectivo", "monto": 75000}]', '2025-10-12 12:00:00-03', 'OK'),
('ASDF44', 'Alineación', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-10-15 09:30:00-03', 'Luis Torres', '+56945678901', 25000, 'efectivo', '[{"metodo": "efectivo", "monto": 25000}]', '2025-10-15 11:00:00-03', 'OK'),
('HHYY11', 'Mantención preventiva', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-12-10 08:30:00-03', 'Lorena Fuentes', '+56989098765', 85000, 'transferencia', '[{"metodo": "transferencia", "monto": 85000}]', '2025-12-10 12:00:00-03', 'OK'),
('ZZ1122', 'Aceite y filtros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-12-12 13:00:00-03', 'Juan Pérez', '+56912345678', 35000, 'efectivo', '[{"metodo": "efectivo", "monto": 35000}]', '2025-12-12 14:30:00-03', 'OK'),
('PLOK88', 'Revisión viaje', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2025-12-30 10:00:00-03', 'Isabel Castro', '+56990123456', 30000, 'transferencia', '[{"metodo": "transferencia", "monto": 30000}]', '2025-12-30 11:30:00-03', 'OK');

-- ============================================
-- 5. INSERTAR 14 ÓRDENES CON DEUDA (CRÍTICO)
-- Se usa metodo_pago 'debe' O metodo_pago NULL con metodos_pago configurado
-- ============================================

INSERT INTO ordenes (patente_vehiculo, descripcion_ingreso, estado, creado_por, fecha_ingreso, cliente_nombre, cliente_telefono, precio_total, metodo_pago, metodos_pago, fecha_completada, detalles_vehiculo) VALUES

-- 1. Transportes SA
('JJPP77', 'Reparación inyectores', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-05 08:30:00-03', 'Transportes SA', '+56956098765', 320000, NULL, '[{"metodo": "debe", "monto": 320000}]', '2026-01-07 17:00:00-03', 'PENDIENTE DE PAGO'),
-- 2. Empresa FlotaVan
('ABCD10', 'Kit de transmisión', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-09 10:00:00-03', 'Empresa FlotaVan', '+56967098765', 450000, NULL, '[{"metodo": "debe", "monto": 450000}]', NULL, 'En espera'),
-- 3. Carlos Pinto
('GGTT22', 'Mantención 70k', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-10 09:00:00-03', 'Carlos Pinto', '+56978098765', 110000, NULL, '[{"metodo": "debe", "monto": 110000}]', '2026-01-10 14:00:00-03', 'PENDIENTE DE PAGO'),
-- 4. Lorena Fuentes
('HHYY11', 'Bomba combustible', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-11 11:00:00-03', 'Lorena Fuentes', '+56989098765', 175000, NULL, '[{"metodo": "debe", "monto": 175000}]', NULL, 'Esperando repuesto'),
-- 5. Juan Pérez
('ZZ1122', 'Junta de culata', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-12 08:00:00-03', 'Juan Pérez', '+56912345678', 380000, NULL, '[{"metodo": "debe", "monto": 380000}]', NULL, 'Presupuesto'),
-- 6. Diego Ramírez
('MNBV77', 'Neumáticos y alineación', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-02 10:00:00-03', 'Diego Ramírez', '+56901234567', 180000, NULL, '[{"metodo": "debe", "monto": 180000}]', '2026-01-02 12:30:00-03', 'PENDIENTE DE PAGO'),
-- 7. Sofía Vargas
('LKJH66', 'Scanner e inyectores', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-03 11:00:00-03', 'Sofía Vargas', '+56912309876', 65000, NULL, '[{"metodo": "debe", "monto": 65000}]', '2026-01-03 13:00:00-03', 'PENDIENTE DE PAGO'),
-- 8. Andrés Morales
('POIU55', 'Frenos traseros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-04 09:30:00-03', 'Andrés Morales', '+56923098765', 45000, NULL, '[{"metodo": "debe", "monto": 45000}]', '2026-01-04 11:00:00-03', 'PENDIENTE DE PAGO'),
-- 9. Valentina Herrera
('NBVC44', 'Aceite caja cambios', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-05 14:00:00-03', 'Valentina Herrera', '+56934098765', 55000, NULL, '[{"metodo": "debe", "monto": 55000}]', '2026-01-05 15:30:00-03', 'PENDIENTE DE PAGO'),
-- 10. Gabriel Núñez
('MLKJ33', 'Radiador', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-06 10:00:00-03', 'Gabriel Núñez', '+56945098765', 120000, NULL, '[{"metodo": "debe", "monto": 120000}]', NULL, 'Instalando'),
-- 11. Pedro Silva
('WXYZ66', 'Discos frenos', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-07 09:00:00-03', 'Pedro Silva', '+56923456789', 80000, NULL, '[{"metodo": "debe", "monto": 80000}]', '2026-01-07 11:30:00-03', 'PENDIENTE DE PAGO'),
-- 12. Ana Martínez
('QWER55', 'Amortiguadores', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-08 11:00:00-03', 'Ana Martínez', '+56934567890', 220000, NULL, '[{"metodo": "debe", "monto": 220000}]', NULL, 'Esperando repuestos'),
-- 13. Luis Torres
('ASDF44', 'Batería', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-09 15:00:00-03', 'Luis Torres', '+56945678901', 90000, NULL, '[{"metodo": "debe", "monto": 90000}]', '2026-01-09 15:30:00-03', 'PENDIENTE DE PAGO'),
-- 14. Carmen Díaz
('ZXCV33', 'Fugas aceite', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', '2026-01-12 11:00:00-03', 'Carmen Díaz', '+56956789012', 40000, NULL, '[{"metodo": "debe", "monto": 40000}]', NULL, 'En evaluación');

-- ============================================
-- 6. INSERTAR 12 CITAS FUTURAS (EN TABLA CITAS)
-- ============================================

INSERT INTO citas (fecha, cliente_nombre, cliente_telefono, patente_vehiculo, servicio_solicitado, estado, creado_por) VALUES
-- Semana 1
('2026-01-14 09:00:00-03', 'Mateo Álvarez', '+56990098765', 'JJKK00', 'Mantención programada', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-01-15 10:30:00-03', 'María González', '+56987654321', 'XY9988', 'Revisión frenos', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-01-16 14:00:00-03', 'Pedro Silva', '+56923456789', 'WXYZ66', 'Cambio de aceite', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
-- Semana 2
('2026-01-20 09:00:00-03', 'Ana Martínez', '+56934567890', 'QWER55', 'Alineación', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-01-21 11:00:00-03', 'Luis Torres', '+56945678901', 'ASDF44', 'Scanner diagnóstico', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-01-22 15:00:00-03', 'Carmen Díaz', '+56956789012', 'ZXCV33', 'Revisión general', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
-- Semana 3
('2026-01-27 10:00:00-03', 'Roberto Muñoz', '+56967890123', 'TYUI22', 'Aire acondicionado', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-01-28 09:30:00-03', 'Patricia Rojas', '+56978901234', 'GHJK11', 'Batería', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-01-29 08:00:00-03', 'Francisco Soto', '+56989012345', 'BNMQ99', 'Mantención 80.000 KM', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-01-30 13:00:00-03', 'Isabel Castro', '+56990123456', 'PLOK88', 'Suspensión', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
-- Semana 4
('2026-02-03 09:00:00-03', 'Diego Ramírez', '+56901234567', 'MNBV77', 'Cambio de correa', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4'),
('2026-02-05 10:30:00-03', 'Sofía Vargas', '+56912309876', 'LKJH66', 'Revisión pre-ITV', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4');

-- 7. VERIFICACIÓN FINAL
SELECT 'Total órdenes' as metrica, COUNT(*) as valor FROM ordenes
UNION ALL
SELECT 'Órdenes con deuda', COUNT(*) FROM ordenes WHERE metodos_pago::text LIKE '%debe%'
UNION ALL
SELECT 'Total citas', COUNT(*) FROM citas;
