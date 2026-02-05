-- ============================================
-- CREAR PERFILES MANUALMENTE PARA USUARIOS EXISTENTES
-- ============================================
-- Este script crea los perfiles para los usuarios que ya existen en auth.users
-- Ejecuta esto DESPUÉS de crear los usuarios en Authentication

-- Insertar perfil para Joaquín (Admin)
INSERT INTO perfiles (id, email, nombre_completo, telefono, role, activo)
VALUES (
    '35696214-a8ad-4b1e-80c7-2bb10599c3a1'::uuid,  -- Reemplaza con el UUID real de joaquin@repaircar.com
    'joaquin@repaircar.com',
    'Joaquín',
    '+56912345678',
    'admin',
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre_completo = EXCLUDED.nombre_completo,
    role = EXCLUDED.role,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- Insertar perfil para Mecánico 1
INSERT INTO perfiles (id, email, nombre_completo, telefono, role, activo)
VALUES (
    'f8568b09-e44e-42b1-bf41-140e7f8a255c'::uuid,  -- Reemplaza con el UUID real de mecanico1@repaircar.com
    'mecanico1@repaircar.com',
    'Mecánico 1',
    '+56987654321',
    'mecanico',
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre_completo = EXCLUDED.nombre_completo,
    role = EXCLUDED.role,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- ============================================
-- INSTRUCCIONES:
-- ============================================
-- 1. Ve a Authentication → Users en Supabase
-- 2. Copia el UUID de joaquin@repaircar.com (primera columna)
-- 3. Reemplaza '35696214-a8ad-4b1e-80c7-2bb10599c3a1' con ese UUID
-- 4. Copia el UUID de mecanico1@repaircar.com
-- 5. Reemplaza 'f8568b09-e44e-42b1-bf41-140e7f8a255c' con ese UUID
-- 6. Ejecuta este SQL en SQL Editor
-- 7. Verifica en Table Editor → perfiles que se crearon los registros
-- 8. ¡Listo! Ya puedes hacer login
