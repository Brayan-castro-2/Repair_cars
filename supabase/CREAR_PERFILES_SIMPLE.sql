-- ============================================
-- SOLUCIÓN SIMPLE: USAR USUARIOS EXISTENTES
-- ============================================
-- Los usuarios ya existen en auth.users, solo necesitamos crear sus perfiles

-- Primero, ver qué usuarios existen
SELECT id, email, created_at
FROM auth.users
WHERE email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');

-- Si ves usuarios arriba, continúa con el siguiente paso:
-- Eliminar perfiles existentes (si los hay)
DELETE FROM perfiles 
WHERE email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');

-- Crear perfiles para los usuarios existentes
-- IMPORTANTE: Reemplaza los UUIDs con los que viste en la query anterior

-- Perfil para joaquin@repaircar.com
INSERT INTO perfiles (id, email, nombre_completo, role, activo)
SELECT 
    id,
    'joaquin@repaircar.com',
    'Joaquín',
    'admin',
    true
FROM auth.users
WHERE email = 'joaquin@repaircar.com';

-- Perfil para mecanico1@repaircar.com
INSERT INTO perfiles (id, email, nombre_completo, role, activo)
SELECT 
    id,
    'mecanico1@repaircar.com',
    'Mecánico 1',
    'mecanico',
    true
FROM auth.users
WHERE email = 'mecanico1@repaircar.com';

-- Verificar que se crearon
SELECT 
    u.id,
    u.email,
    p.nombre_completo,
    p.role,
    p.activo
FROM auth.users u
INNER JOIN perfiles p ON u.id = p.id
WHERE u.email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com')
ORDER BY p.role DESC;

-- ============================================
-- SI NO VES USUARIOS EN LA PRIMERA QUERY:
-- ============================================
-- Significa que NO existen en auth.users
-- En ese caso, ve al Dashboard de Supabase:
-- Authentication → Users → Add user
-- Y créalos manualmente con:
-- - Email: joaquin@repaircar.com / Password: 2040
-- - Email: mecanico1@repaircar.com / Password: 1234
-- Luego ejecuta este script de nuevo
