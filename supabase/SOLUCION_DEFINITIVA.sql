-- ============================================
-- SOLUCIÓN BASADA EN DIAGNÓSTICO
-- ============================================
-- Los perfiles existen pero NO hay usuarios en auth.users
-- Solución: Eliminar perfiles huérfanos y crear todo desde cero

-- PASO 1: Eliminar perfiles huérfanos
DELETE FROM perfiles 
WHERE email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');

-- PASO 2: Crear usuarios y perfiles desde cero
DO $$
DECLARE
    user_id_joaquin uuid;
    user_id_mecanico uuid;
BEGIN
    -- Crear usuario joaquin
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
    ) RETURNING id INTO user_id_joaquin;

    -- Crear perfil joaquin
    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id_joaquin, 'joaquin@repaircar.com', 'Joaquín', 'admin', true);

    RAISE NOTICE 'Usuario joaquin creado con ID: %', user_id_joaquin;

    -- Crear usuario mecanico1
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
    ) RETURNING id INTO user_id_mecanico;

    -- Crear perfil mecanico1
    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id_mecanico, 'mecanico1@repaircar.com', 'Mecánico 1', 'mecanico', true);

    RAISE NOTICE 'Usuario mecanico1 creado con ID: %', user_id_mecanico;
END $$;

-- PASO 3: Verificar que todo esté correcto
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at IS NOT NULL as confirmado,
    p.nombre_completo,
    p.role,
    p.activo
FROM auth.users u
INNER JOIN perfiles p ON u.id = p.id
WHERE u.email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com')
ORDER BY p.role DESC;

-- ============================================
-- ✅ CREDENCIALES PARA LOGIN:
-- ============================================
-- Admin: joaquin / 2040
-- Mecánico: mecanico1 / 1234
