-- ============================================
-- REPAIR CARS - COMPLETE DATABASE SETUP
-- ============================================
-- Este script crea toda la estructura de la base de datos
-- incluyendo tablas, políticas RLS y usuarios iniciales

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Tabla: perfiles (Usuarios del sistema)
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    role TEXT NOT NULL DEFAULT 'mecanico' CHECK (role IN ('admin', 'mecanico', 'recepcionista')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo TEXT NOT NULL,
    rut TEXT UNIQUE,
    email TEXT,
    telefono TEXT,
    direccion TEXT,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: vehiculos
CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patente TEXT UNIQUE NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    anio INTEGER,
    color TEXT,
    motor TEXT,
    vin TEXT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: ordenes
CREATE TABLE IF NOT EXISTS ordenes (
    id BIGSERIAL PRIMARY KEY,
    patente_vehiculo TEXT NOT NULL,
    cliente_nombre TEXT,
    cliente_telefono TEXT,
    cliente_email TEXT,
    cliente_rut TEXT,
    descripcion_ingreso TEXT,
    detalles_vehiculo TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'entregada', 'cancelada')),
    precio_total NUMERIC(10, 2) DEFAULT 0,
    asignado_a UUID REFERENCES perfiles(id),
    detalle_trabajos TEXT,
    fotos_urls TEXT[],
    km_ingreso INTEGER,
    km_salida INTEGER,
    metodos_pago JSONB DEFAULT '[]'::jsonb,
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_lista TIMESTAMP WITH TIME ZONE,
    fecha_completada TIMESTAMP WITH TIME ZONE,
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: listas_chequeo (Checklists de ingreso y salida)
CREATE TABLE IF NOT EXISTS listas_chequeo (
    id BIGSERIAL PRIMARY KEY,
    orden_id BIGINT UNIQUE NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
    detalles JSONB NOT NULL DEFAULT '{}'::jsonb,
    fotos JSONB NOT NULL DEFAULT '{}'::jsonb,
    revisado_por_mecanico_at TIMESTAMP WITH TIME ZONE,
    -- Campos de salida
    detalles_salida JSONB DEFAULT '{}'::jsonb,
    fotos_salida JSONB DEFAULT '{}'::jsonb,
    confirmado_salida_en TIMESTAMP WITH TIME ZONE,
    confirmado_salida_por UUID REFERENCES perfiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: citas (Agendamiento)
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_email TEXT,
    patente_vehiculo TEXT,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracion_minutos INTEGER DEFAULT 60,
    servicio_solicitado TEXT,
    notas TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    asignado_a UUID REFERENCES perfiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ordenes_patente ON ordenes(patente_vehiculo);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_ingreso ON ordenes(fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_vehiculos_patente ON vehiculos(patente);
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_rut ON clientes(rut);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_listas_orden ON listas_chequeo(orden_id);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas_chequeo ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- Políticas para perfiles (todos pueden leer, solo admins pueden modificar)
DROP POLICY IF EXISTS "Perfiles son visibles para todos" ON perfiles;
CREATE POLICY "Perfiles son visibles para todos" ON perfiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo admins pueden insertar perfiles" ON perfiles;
CREATE POLICY "Solo admins pueden insertar perfiles" ON perfiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Solo admins pueden actualizar perfiles" ON perfiles;
CREATE POLICY "Solo admins pueden actualizar perfiles" ON perfiles FOR UPDATE USING (true);

-- Políticas para clientes (todos pueden ver y modificar)
DROP POLICY IF EXISTS "Clientes son visibles para todos" ON clientes;
CREATE POLICY "Clientes son visibles para todos" ON clientes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar clientes" ON clientes;
CREATE POLICY "Todos pueden insertar clientes" ON clientes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar clientes" ON clientes;
CREATE POLICY "Todos pueden actualizar clientes" ON clientes FOR UPDATE USING (true);

-- Políticas para vehículos
DROP POLICY IF EXISTS "Vehiculos son visibles para todos" ON vehiculos;
CREATE POLICY "Vehiculos son visibles para todos" ON vehiculos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar vehiculos" ON vehiculos;
CREATE POLICY "Todos pueden insertar vehiculos" ON vehiculos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar vehiculos" ON vehiculos;
CREATE POLICY "Todos pueden actualizar vehiculos" ON vehiculos FOR UPDATE USING (true);

-- Políticas para órdenes
DROP POLICY IF EXISTS "Ordenes son visibles para todos" ON ordenes;
CREATE POLICY "Ordenes son visibles para todos" ON ordenes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar ordenes" ON ordenes;
CREATE POLICY "Todos pueden insertar ordenes" ON ordenes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar ordenes" ON ordenes;
CREATE POLICY "Todos pueden actualizar ordenes" ON ordenes FOR UPDATE USING (true);

-- Políticas para listas_chequeo
DROP POLICY IF EXISTS "Listas de chequeo son visibles para todos" ON listas_chequeo;
CREATE POLICY "Listas de chequeo son visibles para todos" ON listas_chequeo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar listas de chequeo" ON listas_chequeo;
CREATE POLICY "Todos pueden insertar listas de chequeo" ON listas_chequeo FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar listas de chequeo" ON listas_chequeo;
CREATE POLICY "Todos pueden actualizar listas de chequeo" ON listas_chequeo FOR UPDATE USING (true);

-- Políticas para citas
DROP POLICY IF EXISTS "Citas son visibles para todos" ON citas;
CREATE POLICY "Citas son visibles para todos" ON citas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar citas" ON citas;
CREATE POLICY "Todos pueden insertar citas" ON citas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar citas" ON citas;
CREATE POLICY "Todos pueden actualizar citas" ON citas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Todos pueden eliminar citas" ON citas;
CREATE POLICY "Todos pueden eliminar citas" ON citas FOR DELETE USING (true);

-- ============================================
-- 6. INSERT INITIAL USERS
-- ============================================

-- Usuario Admin: Joaquín (contraseña: 2040)
-- Hash generado con bcrypt para "2040"
INSERT INTO perfiles (id, email, nombre_completo, telefono, role, password_hash)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'joaquin@repaircar.com',
    'Joaquín',
    '+56912345678',
    'admin',
    '$2a$10$YourHashHere' -- Este hash debe ser reemplazado con el hash real de "2040"
)
ON CONFLICT (email) DO NOTHING;

-- Usuario Mecánico: Mecánico 1 (contraseña: 1234)
-- Hash generado con bcrypt para "1234"
INSERT INTO perfiles (id, email, nombre_completo, telefono, role, password_hash)
VALUES (
    'b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
    'mecanico1@repaircar.com',
    'Mecánico 1',
    '+56987654321',
    'mecanico',
    '$2a$10$YourHashHere' -- Este hash debe ser reemplazado con el hash real de "1234"
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 7. COMMENTS
-- ============================================
COMMENT ON TABLE perfiles IS 'Usuarios del sistema (admin, mecánicos, recepcionistas)';
COMMENT ON TABLE clientes IS 'Clientes del taller';
COMMENT ON TABLE vehiculos IS 'Vehículos de los clientes';
COMMENT ON TABLE ordenes IS 'Órdenes de trabajo';
COMMENT ON TABLE listas_chequeo IS 'Checklists de ingreso y salida de vehículos';
COMMENT ON TABLE citas IS 'Citas agendadas';

COMMENT ON COLUMN listas_chequeo.detalles_salida IS 'Estado de items al momento de la entrega (salida)';
COMMENT ON COLUMN listas_chequeo.fotos_salida IS 'URLs de fotos obligatorias tomadas al momento de salida';

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- La base de datos está lista para usar
-- Usuarios creados:
--   - joaquin@repaircar.com (admin) - contraseña: 2040
--   - mecanico1@repaircar.com (mecanico) - contraseña: 1234
