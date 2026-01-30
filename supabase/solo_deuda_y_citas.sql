-- ============================================
-- SCRIPT COMPLEMENTARIO: SOLO DEUDA Y CITAS
-- ============================================

-- INSERTAR ÓRDENES CON DEUDA (14 Órdenes)
-- Estas órdenes tienen metodo_pago = NULL o estado 'pendiente'/'en_progreso' sin pago

INSERT INTO ordenes (
    patente_vehiculo, descripcion_ingreso, estado, 
    creado_por, asignado_a, fecha_ingreso, 
    cliente_nombre, cliente_telefono, precio_total, metodo_pago,
    fecha_completada, detalles_vehiculo
) VALUES

-- 1. Transportes SA (Deuda antigua)
('JJPP77', 'Reparación sistema de inyección', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-05 08:30:00-03', 'Transportes SA', '+56956098765', 320000, NULL, '2026-01-07 17:00:00-03', 'PENDIENTE DE PAGO'),

-- 2. Empresa FlotaVan (En progreso grande)
('ABCD10', 'Cambio de kit de transmisión', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-09 10:00:00-03', 'Empresa FlotaVan', '+56967098765', 450000, NULL, NULL, 'Piezas en camino'),

-- 3. Carlos Pinto (Recién terminada sin pago)
('GGTT22', 'Mantención 70.000 KM', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-10 09:00:00-03', 'Carlos Pinto', '+56978098765', 110000, NULL, '2026-01-10 14:00:00-03', 'PENDIENTE DE PAGO'),

-- 4. Lorena Fuentes (En espera de repuesto)
('HHYY11', 'Cambio bomba de combustible', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-11 11:00:00-03', 'Lorena Fuentes', '+56989098765', 175000, NULL, NULL, 'Esperando bomba original'),

-- 5. Juan Pérez (Presupuesto alto pendiente)
('ZZ1122', 'Reparación motor - Junta de culata', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-12 08:00:00-03', 'Juan Pérez', '+56912345678', 380000, NULL, NULL, 'Esperando aprobación cliente'),

-- 6. Diego Ramírez
('MNBV77', 'Cambio de neumáticos y alineación', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-02 10:00:00-03', 'Diego Ramírez', '+56901234567', 180000, NULL, '2026-01-02 12:30:00-03', 'PENDIENTE DE PAGO'),

-- 7. Sofía Vargas
('LKJH66', 'Scanner y limpieza inyectores', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-03 11:00:00-03', 'Sofía Vargas', '+56912309876', 65000, NULL, '2026-01-03 13:00:00-03', 'PENDIENTE DE PAGO'),

-- 8. Andrés Morales
('POIU55', 'Revisión frenos traseros', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-04 09:30:00-03', 'Andrés Morales', '+56923098765', 45000, NULL, '2026-01-04 11:00:00-03', 'PENDIENTE DE PAGO'),

-- 9. Valentina Herrera
('NBVC44', 'Cambio aceite caja cambios', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-05 14:00:00-03', 'Valentina Herrera', '+56934098765', 55000, NULL, '2026-01-05 15:30:00-03', 'PENDIENTE DE PAGO'),

-- 10. Gabriel Núñez
('MLKJ33', 'Cambio radiador', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-06 10:00:00-03', 'Gabriel Núñez', '+56945098765', 120000, NULL, NULL, 'Instalando repuesto'),

-- 11. Pedro Silva
('WXYZ66', 'Rectificado de discos', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-07 09:00:00-03', 'Pedro Silva', '+56923456789', 80000, NULL, '2026-01-07 11:30:00-03', 'PENDIENTE DE PAGO'),

-- 12. Ana Martínez
('QWER55', 'Cambio amortiguadores delanteros', 'en_progreso', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-08 11:00:00-03', 'Ana Martínez', '+56934567890', 220000, NULL, NULL, 'Esperando repuestos'),

-- 13. Luis Torres
('ASDF44', 'Batería nueva', 'completada', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-09 15:00:00-03', 'Luis Torres', '+56945678901', 90000, NULL, '2026-01-09 15:30:00-03', 'PENDIENTE DE PAGO'),

-- 14. Carmen Díaz
('ZXCV33', 'Revisión fugas aceite', 'pendiente', 'b6b52060-b3dd-4c48-8747-7d12c6326bd4', 'b569d364-ef44-430e-8afb-875e9eb717b4', '2026-01-12 11:00:00-03', 'Carmen Díaz', '+56956789012', 40000, NULL, NULL, 'En evaluación');


-- ============================================
-- INSERTAR CITAS FUTURAS (12 citas)
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
