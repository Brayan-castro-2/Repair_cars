'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function DebugDB() {
    const [status, setStatus] = useState<any>({ loading: true });
    const [users, setUsers] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [authSession, setAuthSession] = useState<any>(null);

    const checkConnection = async () => {
        setStatus({ loading: true, step: 'Iniciando diagnóstico...' });

        try {
            // 1. Verificar Sesión Auth
            const { data: sessionData } = await supabase.auth.getSession();
            setAuthSession(sessionData.session);

            // 2. Verificar Conexión a Supabase (haciendo un ping simple)
            const start = performance.now();
            const { data: healthData, error: healthError } = await supabase.from('perfiles').select('count', { count: 'exact', head: true });
            const end = performance.now();

            if (healthError) {
                throw new Error(`Error conectando a tabla Perfiles: ${healthError.message} (${healthError.code})`);
            }

            // 3. Intentar leer perfiles (si RLS lo permite)
            const { data: profilesData, error: profilesError } = await supabase.from('perfiles').select('*').limit(5);

            if (profilesError) {
                console.error('Error leyendo perfiles:', profilesError);
            } else {
                setProfiles(profilesData || []);
            }

            // 4. Intentar login de prueba (opcional, solo para ver si responde)
            // No hacemos login real, solo verificamos que el cliente esté configurado
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...';

            setStatus({
                loading: false,
                success: true,
                latency: Math.round(end - start) + 'ms',
                url: url,
                keyPrefix: key,
                message: 'Conexión exitosa a Supabase'
            });

        } catch (error: any) {
            console.error('Error de diagnóstico:', error);
            setStatus({
                loading: false,
                success: false,
                error: error.message,
                details: error
            });
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    // Intento de login manual
    const [email, setEmail] = useState('joaquin@repaircar.com');
    const [password, setPassword] = useState('2040');
    const [loginResult, setLoginResult] = useState<any>(null);

    const handleTestLogin = async () => {
        setLoginResult({ status: 'Intentando login...' });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                setLoginResult({ status: 'Error', error: error.message });
                return;
            }

            setLoginResult({ status: 'Auth Exitoso', user: data.user });

            // Intentar leer perfil inmediatamente después
            if (data.user) {
                const { data: perfil, error: perfilError } = await supabase
                    .from('perfiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (perfilError) {
                    setLoginResult(prev => ({ ...prev, profileStatus: 'Error leyendo perfil', profileError: perfilError.message }));
                } else {
                    setLoginResult(prev => ({ ...prev, profileStatus: 'Perfil Encontrado', profile: perfil }));
                }
            }

        } catch (e: any) {
            setLoginResult({ status: 'Excepción', error: e.message });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto bg-white text-black min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Diagnóstico de Base de Datos</h1>

            <div className="grid gap-6">
                {/* Estado de Conexión */}
                <div className={`p-4 rounded border ${status.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <h2 className="font-bold mb-2">Estado de Conexión</h2>
                    {status.loading ? (
                        <p>Verificando...</p>
                    ) : (
                        <div className="text-sm font-mono whitespace-pre-wrap">
                            {JSON.stringify(status, null, 2)}
                        </div>
                    )}
                </div>

                {/* Prueba de Login */}
                <div className="p-4 border rounded bg-gray-50">
                    <h2 className="font-bold mb-4">Prueba de Login Directa</h2>
                    <div className="flex gap-4 mb-4">
                        <input
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="border p-2 rounded"
                            placeholder="Email"
                        />
                        <input
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="border p-2 rounded"
                            placeholder="Password"
                        />
                        <Button onClick={handleTestLogin}>Probar Login</Button>
                    </div>
                    {loginResult && (
                        <pre className="text-xs bg-gray-800 text-white p-4 rounded overflow-auto max-h-60">
                            {JSON.stringify(loginResult, null, 2)}
                        </pre>
                    )}
                </div>

                {/* Perfiles Visibles */}
                <div className="p-4 border rounded">
                    <h2 className="font-bold mb-2">Tabla Perfiles (Primeros 5)</h2>
                    {profiles.length === 0 ? (
                        <p className="text-gray-500">No se encontraron perfiles o no hay permisos de lectura pública.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2">Email</th>
                                        <th className="p-2">Nombre</th>
                                        <th className="p-2">Rol (Columna 'rol')</th>
                                        <th className="p-2">Role (Columna 'role'?)</th>
                                        <th className="p-2">Raw JSON</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profiles.map(p => (
                                        <tr key={p.id} className="border-b">
                                            <td className="p-2">{p.email}</td>
                                            <td className="p-2">{p.nombre_completo}</td>
                                            <td className="p-2 font-bold text-blue-600">{p.rol}</td>
                                            <td className="p-2 font-bold text-red-600">{p.role}</td>
                                            <td className="p-2 max-w-xs overflow-hidden text-xs font-mono">
                                                {JSON.stringify(p)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
