-- ============================================
-- SOLUCIÓN COMPLETA: LIMPIAR Y RECREAR TODO
-- ============================================

-- PASO 1: Eliminar usuarios existentes de auth.users
DELETE FROM auth.users 
WHERE email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');

-- PASO 2: Eliminar y recrear tabla perfiles
DROP TABLE IF EXISTS perfiles CASCADE;

CREATE TABLE perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    role TEXT NOT NULL DEFAULT 'mecanico' CHECK (role IN ('admin', 'mecanico', 'recepcionista')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PASO 3: Habilitar RLS y políticas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfiles son visibles para todos" ON perfiles FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar perfiles" ON perfiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar perfiles" ON perfiles FOR UPDATE USING (true);

-- PASO 4: Crear usuario Admin
DO $$
DECLARE
    user_id uuid;
BEGIN
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

    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id, 'joaquin@repaircar.com', 'Joaquín', 'admin', true);

    RAISE NOTICE 'Usuario joaquin@repaircar.com creado con ID: %', user_id;
END $$;

-- PASO 5: Crear usuario Mecánico
DO $$
DECLARE
    user_id uuid;
BEGIN
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

    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id, 'mecanico1@repaircar.com', 'Mecánico 1', 'mecanico', true);

    RAISE NOTICE 'Usuario mecanico1@repaircar.com creado con ID: %', user_id;
END $$;

-- PASO 6: Verificar resultado
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
