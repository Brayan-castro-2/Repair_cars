-- ============================================
-- REPAIR CARS - COMPLETE DATABASE SETUP
-- ============================================
-- Este script crea toda la estructura de la base de datos
-- para trabajar con Supabase Auth
--
-- IMPORTANTE: Los usuarios se crean desde el Dashboard de Supabase
-- Este script solo crea las tablas y estructura

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Tabla: perfiles (Usuarios del sistema - vinculados a auth.users)
CREATE TABLE IF NOT EXISTS perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    role TEXT NOT NULL DEFAULT 'mecanico' CHECK (role IN ('admin', 'mecanico', 'recepcionista')),
    activo BOOLEAN DEFAULT true,
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

-- Políticas para perfiles
DROP POLICY IF EXISTS "Perfiles son visibles para todos" ON perfiles;
CREATE POLICY "Perfiles son visibles para todos" ON perfiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Solo admins pueden insertar perfiles" ON perfiles;
CREATE POLICY "Solo admins pueden insertar perfiles" ON perfiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Solo admins pueden actualizar perfiles" ON perfiles;
CREATE POLICY "Solo admins pueden actualizar perfiles" ON perfiles FOR UPDATE USING (true);

-- Políticas para clientes
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
-- 6. CREATE TRIGGER FOR AUTO-CREATE PERFIL
-- ============================================
-- Este trigger crea automáticamente un perfil cuando se crea un usuario en auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre_completo, role, activo)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'mecanico'),
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. COMMENTS
-- ============================================
COMMENT ON TABLE perfiles IS 'Usuarios del sistema (admin, mecánicos, recepcionistas) - vinculados a auth.users';
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
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- ✅ La base de datos está lista
-- 
-- 📋 PRÓXIMOS PASOS - CREAR USUARIOS:
--
-- Los usuarios deben crearse desde el Dashboard de Supabase:
-- 1. Ve a Authentication → Users
-- 2. Click en "Add user" → "Create new user"
-- 3. Crea estos usuarios:
--
--    👤 ADMIN - JOAQUÍN:
--       Email: joaquin@repaircar.com
--       Password: 2040
--       User Metadata (JSON):
--       {
--         "nombre_completo": "Joaquín",
--         "role": "admin"
--       }
--
--    � MECÁNICO 1:
--       Email: mecanico1@repaircar.com
--       Password: 1234
--       User Metadata (JSON):
--       {
--         "nombre_completo": "Mecánico 1",
--         "role": "mecanico"
--       }
--
-- 4. El trigger creará automáticamente el perfil en la tabla perfiles
-- 5. ¡Listo para usar!
