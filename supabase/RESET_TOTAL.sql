-- ============================================
-- ☢️ RESET TOTAL: BORRAR TODO Y EMPEZAR DE CERO
-- ============================================
-- ESTE SCRIPT BORRA TODOS LOS USUARIOS Y PERFILES
-- Y RECREA LA TABLA CORRECTAMENTE

-- 1. Eliminar usuarios existentes (Esto borra perfiles por CASCADE)
DELETE FROM auth.users WHERE email IN ('joaquin@repaircar.com', 'mecanico1@repaircar.com');

-- 2. Eliminar tabla perfiles por si acaso tiene esquema incorrecto
DROP TABLE IF EXISTS perfiles CASCADE;

-- 3. Recrear tabla perfiles con esquema CORRECTO
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

-- 4. Habilitar seguridad RLS
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfiles son visibles para todos" ON perfiles FOR SELECT USING (true);
CREATE POLICY "Todos pueden insertar perfiles" ON perfiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos pueden actualizar perfiles" ON perfiles FOR UPDATE USING (true);

-- 5. Crear Usuario Admin: Joaquín
DO $$
DECLARE
    user_id uuid;
BEGIN
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
    ) RETURNING id INTO user_id;

    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id, 'joaquin@repaircar.com', 'Joaquín', 'admin', true);
    
    RAISE NOTICE 'Admin creado: joaquin@repaircar.com';
END $$;

-- 6. Crear Usuario Mecánico: Mecánico 1
DO $$
DECLARE
    user_id uuid;
BEGIN
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
    ) RETURNING id INTO user_id;

    INSERT INTO perfiles (id, email, nombre_completo, role, activo)
    VALUES (user_id, 'mecanico1@repaircar.com', 'Mecánico 1', 'mecanico', true);
    
    RAISE NOTICE 'Mecánico creado: mecanico1@repaircar.com';
END $$;

-- 7. Verificar Resultado Final
SELECT 
    u.id, 
    u.email, 
    p.nombre_completo, 
    p.role, 
    p.activo 
FROM auth.users u
JOIN perfiles p ON u.id = p.id
ORDER BY p.role;
