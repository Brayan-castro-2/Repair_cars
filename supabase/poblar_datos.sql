-- ============================================
-- SCRIPT DE POBLACIÓN DE BASE DE DATOS
-- Generado para plantilla de taller mecánico
-- ============================================

-- ============================================
-- 1. INSERTAR/ACTUALIZAR USUARIOS (PERFILES)
-- ============================================

-- Insertar los usuarios con sus UIDs reales de Supabase Auth
INSERT INTO perfiles (id, email, nombre_completo, rol, activo) VALUES
('b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'admin@taller.demo', 'Admin Demo', 'admin', true),
('b569d364-ef44-430e-8afb-875e9eb717b4', 'mecanico@taller.demo', 'Carlos Rodríguez', 'mecanico', true)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre_completo = EXCLUDED.nombre_completo,
    rol = EXCLUDED.rol;

-- ============================================
-- 2. INSERTAR CLIENTES
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
(20, 'Mateo Álvarez', '+56990098765', 'mateo.alvarez@email.com')
ON CONFLICT (id) DO NOTHING;

-- Actualizar secuencia
SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));

-- ============================================
-- 3. INSERTAR VEHÍCULOS
-- ============================================

INSERT INTO vehiculos (patente, marca, modelo, anio, motor, color, cliente_id) VALUES
-- Clientes regulares
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
('JJKK00', 'Hyundai', 'Tucson', '2021', '2.0', 'Plata', 20)
ON CONFLICT (patente) DO NOTHING;

-- ============================================
-- 4. INSERTAR ÓRDENES (60 órdenes desde octubre)
-- ============================================

INSERT INTO ordenes (
    patente_vehiculo, descripcion_ingreso, estado, 
    creado_por, asignado_a, fecha_ingreso, 
    cliente_nombre, cliente_telefono, precio_total, metodo_pago,
    fecha_completada, detalles_vehiculo
) VALUES

-- OCTUBRE 2025 (15 órdenes)
('ZZ1122', 'Cambio de aceite y filtros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-02 09:30:00-03', 'Juan Pérez', '+56912345678', 35000, 'efectivo', '2025-10-02 11:00:00-03', 'Vehículo en buen estado'),

('JJPP77', 'Falla DPF y Check Engine', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-05 10:15:00-03', 'Transportes SA', '+56956098765', 280000, 'transferencia', '2025-10-08 16:30:00-03', 'Limpieza DPF realizada'),

('XY9988', 'Ruido en frenos delanteros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-07 14:20:00-03', 'María González', '+56987654321', 95000, 'tarjeta_debito', '2025-10-07 17:00:00-03', 'Cambio de pastillas y discos'),

('WXYZ66', 'Mantención 50.000 KM', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-10 08:00:00-03', 'Pedro Silva', '+56923456789', 125000, 'transferencia', '2025-10-10 12:30:00-03', 'Mantención completa'),

('QWER55', 'Cambio de batería', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-12 11:00:00-03', 'Ana Martínez', '+56934567890', 75000, 'efectivo', '2025-10-12 12:00:00-03', 'Batería 75 Ah instalada'),

('ASDF44', 'Alineación y balanceo', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-15 09:30:00-03', 'Luis Torres', '+56945678901', 25000, 'efectivo', '2025-10-15 11:00:00-03', 'OK'),

('ZXCV33', 'Cambio de correa de distribución', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-18 08:30:00-03', 'Carmen Díaz', '+56956789012', 180000, 'tarjeta_credito', '2025-10-19 16:00:00-03', 'Kit completo instalado'),

('TYUI22', 'Revisión de aire acondicionado', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-21 10:00:00-03', 'Roberto Muñoz', '+56967890123', 55000, 'transferencia', '2025-10-21 14:00:00-03', 'Recarga de gas realizada'),

('GHJK11', 'Cambio de neumáticos', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-23 13:00:00-03', 'Patricia Rojas', '+56978901234', 240000, 'transferencia', '2025-10-23 15:30:00-03', '4 neumáticos 195/65 R15'),

('BNMQ99', 'Falla en encendido', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-25 09:00:00-03', 'Francisco Soto', '+56989012345', 65000, 'efectivo', '2025-10-25 12:00:00-03', 'Cambio de bujías'),

('PLOK88', 'Revisión general pre-venta', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-27 10:30:00-03', 'Isabel Castro', '+56990123456', 45000, 'efectivo', '2025-10-27 13:00:00-03', 'Todo OK'),

('MNBV77', 'Cambio de aceite', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-28 14:00:00-03', 'Diego Ramírez', '+56901234567', 30000, 'efectivo', '2025-10-28 15:30:00-03', 'OK'),

('LKJH66', 'Scanner y reseteo de luz Check', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-29 11:00:00-03', 'Sofía Vargas', '+56912309876', 15000, 'efectivo', '2025-10-29 11:30:00-03', 'Sensor O2 con falla'),

('POIU55', 'Mantención 80.000 KM', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-30 08:00:00-03', 'Andrés Morales', '+56923098765', 150000, 'transferencia', '2025-10-30 14:00:00-03', 'Mantención completa'),

('NBVC44', 'Reparación de suspensión', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-10-31 09:30:00-03', 'Valentina Herrera', '+56934098765', 120000, 'tarjeta_debito', '2025-10-31 16:00:00-03', 'Cambio de amortiguadores'),

-- NOVIEMBRE 2025 (20 órdenes)
('MLKJ33', 'Cambio de pastillas de freno', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-02 10:00:00-03', 'Gabriel Núñez', '+56945098765', 85000, 'efectivo', '2025-11-02 12:00:00-03', 'OK'),

('ABCD10', 'Mantención 100.000 KM', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-04 08:30:00-03', 'Empresa FlotaVan', '+56967098765', 195000, 'transferencia', '2025-11-05 15:00:00-03', 'Servicio mayor'),

('GGTT22', 'Cambio de aceite y filtros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-06 09:00:00-03', 'Carlos Pinto', '+56978098765', 40000, 'efectivo', '2025-11-06 10:30:00-03', 'OK'),

('HHYY11', 'Reparación de turbo', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-08 10:00:00-03', 'Lorena Fuentes', '+56989098765', 420000, 'transferencia', '2025-11-12 17:00:00-03', 'Turbo reconstruido'),

('ZZ1122', 'Revisión de transmisión', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-14 11:00:00-03', 'Juan Pérez', '+56912345678', 55000, 'tarjeta_debito', '2025-11-14 14:00:00-03', 'Cambio de aceite de caja'),

('JJKK00', 'Mantención general', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-16 08:00:00-03', 'Mateo Álvarez', '+56990098765', 75000, 'efectivo', '2025-11-16 11:00:00-03', 'OK'),

('XY9988', 'Cambio de batería', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-18 13:00:00-03', 'María González', '+56987654321', 80000, 'transferencia', '2025-11-18 14:00:00-03', 'Batería premium'),

('WXYZ66', 'Alineación y balanceo', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-19 09:30:00-03', 'Pedro Silva', '+56923456789', 25000, 'efectivo', '2025-11-19 11:00:00-03', 'OK'),

('QWER55', 'Cambio de discos y pastillas', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-21 10:00:00-03', 'Ana Martínez', '+56934567890', 110000, 'tarjeta_credito', '2025-11-21 14:00:00-03', 'Frenos renovados'),

('ASDF44', 'Cambio de aceite', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-22 14:00:00-03', 'Luis Torres', '+56945678901', 32000, 'efectivo', '2025-11-22 15:30:00-03', 'OK'),

('ZXCV33', 'Revisión sistema eléctrico', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-24 09:00:00-03', 'Carmen Díaz', '+56956789012', 45000, 'transferencia', '2025-11-24 12:00:00-03', 'Fusibles y cables OK'),

('TYUI22', 'Cambio de neumáticos traseros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-26 10:30:00-03', 'Roberto Muñoz', '+56967890123', 120000, 'tarjeta_debito', '2025-11-26 12:00:00-03', '2 neumáticos nuevos'),

('GHJK11', 'Scanner diagnóstico', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-27 11:00:00-03', 'Patricia Rojas', '+56978901234', 18000, 'efectivo', '2025-11-27 11:45:00-03', 'Sin fallas'),

('BNMQ99', 'Mantención 60.000 KM', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-28 08:30:00-03', 'Francisco Soto', '+56989012345', 95000, 'transferencia', '2025-11-28 13:00:00-03', 'Servicio completo'),

('PLOK88', 'Cambio de filtro de aire', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-29 13:00:00-03', 'Isabel Castro', '+56990123456', 22000, 'efectivo', '2025-11-29 13:45:00-03', 'OK'),

('MNBV77', 'Reparación de escape', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-30 09:00:00-03', 'Diego Ramírez', '+56901234567', 68000, 'efectivo', '2025-11-30 12:00:00-03', 'Silenciador nuevo'),

('LKJH66', 'Cambio de aceite y filtros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-30 14:00:00-03', 'Sofía Vargas', '+56912309876', 38000, 'transferencia', '2025-11-30 15:30:00-03', 'OK'),

('POIU55', 'Revisión de suspensión', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-30 10:00:00-03', 'Andrés Morales', '+56923098765', 35000, 'efectivo', '2025-11-30 11:30:00-03', 'Todo OK'),

('NBVC44', 'Cambio de líquido de frenos', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-30 15:00:00-03', 'Valentina Herrera', '+56934098765', 28000, 'efectivo', '2025-11-30 16:00:00-03', 'OK'),

('MLKJ33', 'Scanner y diagnóstico', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-11-30 11:00:00-03', 'Gabriel Núñez', '+56945098765', 20000, 'efectivo', '2025-11-30 11:45:00-03', 'Sensor presión aceite'),

-- DICIEMBRE 2025 (15 órdenes)
('JJPP77', 'Cambio de embrague', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-02 08:00:00-03', 'Transportes SA', '+56956098765', 350000, 'transferencia', '2025-12-04 16:00:00-03', 'Kit completo instalado'),

('ABCD10', 'Cambio de aceite motor', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-05 09:00:00-03', 'Empresa FlotaVan', '+56967098765', 45000, 'transferencia', '2025-12-05 10:30:00-03', 'Aceite sintético'),

('GGTT22', 'Reparación de dirección', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-07 10:00:00-03', 'Carlos Pinto', '+56978098765', 125000, 'tarjeta_debito', '2025-12-08 15:00:00-03', 'Cremallera reparada'),

('HHYY11', 'Mantención preventiva', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-10 08:30:00-03', 'Lorena Fuentes', '+56989098765', 85000, 'transferencia', '2025-12-10 12:00:00-03', 'OK'),

('ZZ1122', 'Cambio de aceite', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-12 13:00:00-03', 'Juan Pérez', '+56912345678', 35000, 'efectivo', '2025-12-12 14:30:00-03', 'OK'),

('JJKK00', 'Revisión frenos', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-14 09:00:00-03', 'Mateo Álvarez', '+56990098765', 25000, 'efectivo', '2025-12-14 10:30:00-03', 'Pastillas al 40%'),

('XY9988', 'Alineación computarizada', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-16 10:00:00-03', 'María González', '+56987654321', 28000, 'transferencia', '2025-12-16 11:30:00-03', 'OK'),

('WXYZ66', 'Cambio de bujías', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-18 11:00:00-03', 'Pedro Silva', '+56923456789', 48000, 'efectivo', '2025-12-18 12:30:00-03', '4 bujías nuevas'),

('QWER55', 'Revisión general', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-20 09:30:00-03', 'Ana Martínez', '+56934567890', 35000, 'efectivo', '2025-12-20 11:00:00-03', 'Todo OK'),

('ASDF44', 'Cambio filtro combustible', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-22 14:00:00-03', 'Luis Torres', '+56945678901', 18000, 'efectivo', '2025-12-22 15:00:00-03', 'OK'),

('ZXCV33', 'Cambio de neumáticos', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-24 08:00:00-03', 'Carmen Díaz', '+56956789012', 220000, 'tarjeta_credito', '2025-12-24 10:30:00-03', '4 neumáticos nuevos'),

('TYUI22', 'Mantención aire acondicionado', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-26 10:00:00-03', 'Roberto Muñoz', '+56967890123', 45000, 'transferencia', '2025-12-26 12:00:00-03', 'Sistema limpio'),

('GHJK11', 'Cambio de aceite y filtros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-28 09:00:00-03', 'Patricia Rojas', '+56978901234', 40000, 'efectivo', '2025-12-28 10:30:00-03', 'OK'),

('BNMQ99', 'Scanner diagnóstico', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-29 11:00:00-03', 'Francisco Soto', '+56989012345', 15000, 'efectivo', '2025-12-29 11:45:00-03', 'Sin errores'),

('PLOK88', 'Revisión pre-viaje', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2025-12-30 10:00:00-03', 'Isabel Castro', '+56990123456', 30000, 'transferencia', '2025-12-30 11:30:00-03', 'Apto para viajar'),

-- ENERO 2026 (5 órdenes completadas + 5 con deuda/pendientes)
('MNBV77', 'Cambio de aceite', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-03 09:00:00-03', 'Diego Ramírez', '+56901234567', 32000, 'efectivo', '2026-01-03 10:30:00-03', 'OK'),

('LKJH66', 'Mantención 40.000 KM', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-06 08:00:00-03', 'Sofía Vargas', '+56912309876', 95000, 'transferencia', '2026-01-06 13:00:00-03', 'Servicio mayor'),

('POIU55', 'Reparación de frenos ABS', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-08 09:00:00-03', 'Andrés Morales', '+56923098765', 185000, 'transferencia', '2026-01-09 16:00:00-03', 'Módulo ABS reparado'),

('NBVC44', 'Cambio de aceite y filtros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-10 14:00:00-03', 'Valentina Herrera', '+56934098765', 38000, 'efectivo', '2026-01-10 15:30:00-03', 'OK'),

('MLKJ33', 'Revisión suspensión', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-11 10:00:00-03', 'Gabriel Núñez', '+56945098765', 42000, 'tarjeta_debito', '2026-01-11 12:00:00-03', 'Amortiguadores OK'),

-- ÓRDENES CON DEUDA (pendiente de pago)
('JJPP77', 'Reparación sistema de inyección', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-05 08:30:00-03', 'Transportes SA', '+56956098765', 320000, NULL, '2026-01-07 17:00:00-03', 'PENDIENTE DE PAGO'),

('ABCD10', 'Cambio de kit de transmisión', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-09 10:00:00-03', 'Empresa FlotaVan', '+56967098765', 450000, NULL, NULL, 'Piezas en camino'),

('GGTT22', 'Mantención 70.000 KM', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-10 09:00:00-03', 'Carlos Pinto', '+56978098765', 110000, NULL, '2026-01-10 14:00:00-03', 'PENDIENTE DE PAGO'),

('HHYY11', 'Cambio bomba de combustible', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-11 11:00:00-03', 'Lorena Fuentes', '+56989098765', 175000, NULL, NULL, 'Esperando bomba original'),

('ZZ1122', 'Reparación motor - Junta de culata', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-12 08:00:00-03', 'Juan Pérez', '+56912345678', 380000, NULL, NULL, 'Esperando aprobación cliente'),

-- Órdenes adicionales con deuda (Total 14)
('MNBV77', 'Cambio de neumáticos y alineación', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-02 10:00:00-03', 'Diego Ramírez', '+56901234567', 180000, NULL, '2026-01-02 12:30:00-03', 'PENDIENTE DE PAGO'),
('LKJH66', 'Scanner y limpieza inyectores', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-03 11:00:00-03', 'Sofía Vargas', '+56912309876', 65000, NULL, '2026-01-03 13:00:00-03', 'PENDIENTE DE PAGO'),
('POIU55', 'Revisión frenos traseros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-04 09:30:00-03', 'Andrés Morales', '+56923098765', 45000, NULL, '2026-01-04 11:00:00-03', 'PENDIENTE DE PAGO'),
('NBVC44', 'Cambio aceite caja cambios', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-05 14:00:00-03', 'Valentina Herrera', '+56934098765', 55000, NULL, '2026-01-05 15:30:00-03', 'PENDIENTE DE PAGO'),
('MLKJ33', 'Cambio radiador', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-06 10:00:00-03', 'Gabriel Núñez', '+56945098765', 120000, NULL, NULL, 'Instalando repuesto'),
('WXYZ66', 'Rectificado de discos', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-07 09:00:00-03', 'Pedro Silva', '+56923456789', 80000, NULL, '2026-01-07 11:30:00-03', 'PENDIENTE DE PAGO'),
('QWER55', 'Cambio amortiguadores delanteros', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-08 11:00:00-03', 'Ana Martínez', '+56934567890', 220000, NULL, NULL, 'Esperando repuestos'),
('ASDF44', 'Batería nueva', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-09 15:00:00-03', 'Luis Torres', '+56945678901', 90000, NULL, '2026-01-09 15:30:00-03', 'PENDIENTE DE PAGO'),
('ZXCV33', 'Revisión fugas aceite', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-12 11:00:00-03', 'Carmen Díaz', '+56956789012', 40000, NULL, NULL, 'En evaluación');

-- ============================================
-- 5. INSERTAR CITAS FUTURAS (12 citas)
-- ============================================

INSERT INTO ordenes (
    patente_vehiculo, descripcion_ingreso, estado, 
    creado_por, asignado_a, fecha_ingreso, 
    cliente_nombre, cliente_telefono, precio_total, metodo_pago
) VALUES
-- Semana 1 (14-18 enero)
('JJKK00', 'Cita: Mantención programada', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-14 09:00:00-03', 'Mateo Álvarez', '+56990098765', 0, NULL),

('XY9988', 'Cita: Revisión frenos', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-15 10:30:00-03', 'María González', '+56987654321', 0, NULL),

('WXYZ66', 'Cita: Cambio de aceite', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-16 14:00:00-03', 'Pedro Silva', '+56923456789', 0, NULL),

-- Semana 2 (20-24 enero)
('QWER55', 'Cita: Alineación', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-20 09:00:00-03', 'Ana Martínez', '+56934567890', 0, NULL),

('ASDF44', 'Cita: Scanner diagnóstico', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-21 11:00:00-03', 'Luis Torres', '+56945678901', 0, NULL),

('ZXCV33', 'Cita: Revisión general', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-22 15:00:00-03', 'Carmen Díaz', '+56956789012', 0, NULL),

-- Semana 3 (27-31 enero)
('TYUI22', 'Cita: Mantención aire acondicionado', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-27 10:00:00-03', 'Roberto Muñoz', '+56967890123', 0, NULL),

('GHJK11', 'Cita: Cambio de batería', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-28 09:30:00-03', 'Patricia Rojas', '+56978901234', 0, NULL),

('BNMQ99', 'Cita: Mantención 80.000 KM', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-29 08:00:00-03', 'Francisco Soto', '+56989012345', 0, NULL),

('PLOK88', 'Cita: Revisión suspensión', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-30 13:00:00-03', 'Isabel Castro', '+56990123456', 0, NULL),

-- Semana 4 (3-7 febrero)
('MNBV77', 'Cita: Cambio de correa', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-02-03 09:00:00-03', 'Diego Ramírez', '+56901234567', 0, NULL),

('LKJH66', 'Cita: Revisión pre-ITV', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-02-05 10:30:00-03', 'Sofía Vargas', '+56912309876', 0, NULL);

-- ============================================
-- 6. VERIFICACIÓN
-- ============================================

-- Contar órdenes por estado
SELECT estado, COUNT(*) as cantidad 
FROM ordenes 
GROUP BY estado;

-- Órdenes con deuda (sin método de pago y completadas)
SELECT id, patente_vehiculo, cliente_nombre, precio_total, estado
FROM ordenes 
WHERE metodo_pago IS NULL AND precio_total > 0
ORDER BY fecha_ingreso DESC;

-- Próximas citas
SELECT id, patente_vehiculo, cliente_nombre, descripcion_ingreso, fecha_ingreso
FROM ordenes 
WHERE fecha_ingreso > NOW() AND estado = 'pendiente'
ORDER BY fecha_ingreso ASC;

-- Total de ingresos por mes
SELECT 
    TO_CHAR(fecha_ingreso, 'YYYY-MM') as mes,
    COUNT(*) as ordenes,
    SUM(precio_total) as total_ingresos,
    SUM(CASE WHEN metodo_pago IS NOT NULL THEN precio_total ELSE 0 END) as cobrado,
    SUM(CASE WHEN metodo_pago IS NULL AND precio_total > 0 THEN precio_total ELSE 0 END) as por_cobrar
FROM ordenes
GROUP BY TO_CHAR(fecha_ingreso, 'YYYY-MM')
ORDER BY mes DESC;
