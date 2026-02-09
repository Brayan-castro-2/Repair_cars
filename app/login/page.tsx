'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, User, Lock } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Usar el email/usuario tal como se ingresa
            const email = username.toLowerCase().trim();

            const result = await login(email, password);
            if (result.success) {
                router.push('/');
            } else {
                setError(result.error || 'Credenciales incorrectas');
            }
        } catch {
            setError('Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col bg-dark-500">
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="text-center mb-10">
                        <div className="relative w-40 h-40 mx-auto mb-6 rounded-2xl overflow-hidden border-4 border-gold-500 shadow-[0_0_30px_rgba(230,184,0,0.3)] bg-gold-500/10">
                            <Image
                                src="/images/fondo2.png"
                                alt="Repair Cars Logo"
                                fill
                                className="object-contain p-4"
                                priority
                            />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                            Repair Cars
                        </h1>
                        <p className="text-sm text-gray-400">
                            Sistema de Gestión Profesional
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-gray-300 text-sm font-medium">
                                Usuario / Email
                            </Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <Input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="joaquin"
                                    className="h-14 pl-12 bg-dark-400 border-dark-200 text-white placeholder:text-gray-500 rounded-xl text-base focus:border-gold-500"
                                    autoComplete="username"
                                    autoFocus
                                    tabIndex={1}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-300 text-sm font-medium">
                                Contraseña
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••"
                                    className="h-14 pl-12 bg-dark-400 border-dark-200 text-white placeholder:text-gray-500 rounded-xl text-base focus:border-gold-500"
                                    autoComplete="current-password"
                                    tabIndex={2}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-14 bg-gold-500 hover:bg-gold-600 text-black text-lg font-semibold rounded-xl shadow-xl shadow-gold-500/25 transition-all duration-200 mt-2 touch-target"
                            disabled={isLoading}
                            tabIndex={3}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Ingresando...
                                </>
                            ) : (
                                'Ingresar'
                            )}
                        </Button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <div className="py-6 text-center">
                <p className="text-xs text-gray-600">
                    © 2024 Repair Cars • Sistema Profesional v2.0
                </p>
            </div>
        </main>
    );
}
