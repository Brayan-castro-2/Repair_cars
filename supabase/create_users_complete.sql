-- ============================================
-- CREAR USUARIOS COMPLETOS (Auth + Perfiles)
-- ============================================
-- Este script crea usuarios directamente en auth.users y sus perfiles
-- Ejecuta esto en SQL Editor de Supabase

-- IMPORTANTE: Primero deshabilitar el trigger para evitar conflictos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear usuario Admin: joaquin@repaircar.com
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Insertar en auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'joaquin@repaircar.com',
        crypt('2040', gen_salt('bf')), -- Contraseña: 2040
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre_completo":"Joaquín","role":"admin"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO user_id;

    -- Insertar perfil
    INSERT INTO perfiles (id, email, nombre_completo, telefono, role, activo)
    VALUES (
        user_id,
        'joaquin@repaircar.com',
        'Joaquín',
        '+56912345678',
        'admin',
        true
    );

    RAISE NOTICE 'Usuario joaquin@repaircar.com creado con ID: %', user_id;
END $$;

-- Crear usuario Mecánico: mecanico1@repaircar.com
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Insertar en auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'mecanico1@repaircar.com',
        crypt('1234', gen_salt('bf')), -- Contraseña: 1234
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{"nombre_completo":"Mecánico 1","role":"mecanico"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO user_id;

    -- Insertar perfil
    INSERT INTO perfiles (id, email, nombre_completo, telefono, role, activo)
    VALUES (
        user_id,
        'mecanico1@repaircar.com',
        'Mecánico 1',
        '+56987654321',
        'mecanico',
        true
    );

    RAISE NOTICE 'Usuario mecanico1@repaircar.com creado con ID: %', user_id;
END $$;

-- Verificar que se crearon correctamente
SELECT 
    u.id,
    u.email,
    p.nombre_completo,
    p.role,
    p.activo
FROM auth.users u
LEFT JOIN perfiles p ON u.id = p.id
WHERE u.email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com')
ORDER BY p.role DESC;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Deberías ver 2 filas con:
-- - joaquin@repaircar.com | Joaquín | admin | true
-- - mecanico1@repaircar.com | Mecánico 1 | mecanico | true
--
-- CREDENCIALES PARA LOGIN:
-- Admin: joaquin / 2040
-- Mecánico: mecanico1 / 1234
