-- ============================================
-- CREAR USUARIOS REPAIR CARS (VERSIÓN SIMPLIFICADA)
-- ============================================
-- Este script crea usuarios directamente en auth.users y perfiles

-- Primero, verificar qué columnas tiene la tabla perfiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'perfiles' 
ORDER BY ordinal_position;

-- ============================================
-- CREAR USUARIOS
-- ============================================

-- Usuario Admin: joaquin@repaircar.com
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
        crypt('2040', gen_salt('bf')),
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

    -- Insertar perfil (solo columnas básicas)
    INSERT INTO perfiles (id, email, nombre_completo, role)
    VALUES (
        user_id,
        'joaquin@repaircar.com',
        'Joaquín',
        'admin'
    );

    RAISE NOTICE 'Usuario joaquin@repaircar.com creado con ID: %', user_id;
END $$;

-- Usuario Mecánico: mecanico1@repaircar.com
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
        crypt('1234', gen_salt('bf')),
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

    -- Insertar perfil (solo columnas básicas)
    INSERT INTO perfiles (id, email, nombre_completo, role)
    VALUES (
        user_id,
        'mecanico1@repaircar.com',
        'Mecánico 1',
        'mecanico'
    );

    RAISE NOTICE 'Usuario mecanico1@repaircar.com creado con ID: %', user_id;
END $$;

-- ============================================
-- VERIFICAR USUARIOS CREADOS
-- ============================================
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.nombre_completo,
    p.role
FROM auth.users u
LEFT JOIN perfiles p ON u.id = p.id
WHERE u.email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com')
ORDER BY p.role DESC;
