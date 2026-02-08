-- ============================================
-- DIAGNÓSTICO COMPLETO Y SOLUCIÓN
-- ============================================

-- PASO 1: Ver TODO lo que existe actualmente
SELECT '=== USUARIOS EN AUTH.USERS ===' as seccion;
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

SELECT '=== PERFILES EXISTENTES ===' as seccion;
SELECT id, email, nombre_completo, role, activo
FROM perfiles
ORDER BY created_at DESC;

-- PASO 2: Ver si hay conflictos específicos
SELECT '=== CONFLICTOS POTENCIALES ===' as seccion;
SELECT 
    u.id as user_id,
    u.email as user_email,
    p.id as perfil_id,
    p.email as perfil_email,
    CASE 
        WHEN u.id = p.id THEN 'OK - IDs coinciden'
        ELSE 'ERROR - IDs no coinciden'
    END as estado
FROM auth.users u
FULL OUTER JOIN perfiles p ON u.email = p.email
WHERE u.email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com')
   OR p.email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');

-- ============================================
-- EJECUTA HASTA AQUÍ PRIMERO Y MUÉSTRAME LOS RESULTADOS
-- ============================================
-- Después de ver los resultados, ejecuta la parte de abajo

-- PASO 3: LIMPIAR TODO (ejecutar solo después de ver diagnóstico)
-- Descomentar estas líneas cuando estés listo:

-- DELETE FROM perfiles WHERE email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');
-- DELETE FROM auth.users WHERE email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');

-- PASO 4: RECREAR DESDE CERO (ejecutar después de limpiar)
-- Descomentar cuando hayas limpiado:

/*
DO $$
DECLARE
    user_id_joaquin uuid;
    user_id_mecanico uuid;
BEGIN
    -- Crear joaquin
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(), 'authenticated', 'authenticated',
        'joaquin@repaircar.com', crypt('2040', gen_salt('bf')),
        NOW(), '{"provider":"email","providers":["email"]}',
        '{"nombre_completo":"Joaquín","role":"admin"}',
        NOW(), NOW(), '', '', '', ''
    ) RETURNING id INTO user_id_joaquin;

    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id_joaquin, 'joaquin@repaircar.com', 'Joaquín', 'admin', true);

    -- Crear mecanico1
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(), 'authenticated', 'authenticated',
        'mecanico1@repaircar.com', crypt('1234', gen_salt('bf')),
        NOW(), '{"provider":"email","providers":["email"]}',
        '{"nombre_completo":"Mecánico 1","role":"mecanico"}',
        NOW(), NOW(), '', '', '', ''
    ) RETURNING id INTO user_id_mecanico;

    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id_mecanico, 'mecanico1@repaircar.com', 'Mecánico 1', 'mecanico', true);

    RAISE NOTICE 'Usuarios creados: joaquin=%, mecanico=%', user_id_joaquin, user_id_mecanico;
END $$;

-- Verificar
SELECT u.id, u.email, p.nombre_completo, p.role
FROM auth.users u
INNER JOIN perfiles p ON u.id = p.id
WHERE u.email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');
*/
