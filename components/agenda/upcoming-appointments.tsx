'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { obtenerCitasSemana, type CitaDB } from '@/lib/storage-adapter';

// Ajustar interfaz si es necesario
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

// Ajustar interfaz si es necesario
interface CitaDisplay extends CitaDB {
    minutesUntil: number;
    cliente_nombre?: string; // Mapeado
}

export function UpcomingAppointments() {
    const router = useRouter();
    const [upcoming, setUpcoming] = useState<CitaDisplay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUpcoming();
        // Refresh every minute
        const interval = setInterval(loadUpcoming, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadUpcoming = async () => {
        try {
            // V3: Fetch next 7 days
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);

            const citas = await obtenerCitasSemana(today, nextWeek);
            const now = new Date();

            // Filter pending appointments
            const next = citas
                .filter(c => c.estado === 'pendiente' || c.estado === 'confirmada')
                .map(c => {
                    const citaDate = new Date(c.fecha_inicio);
                    const diffMs = citaDate.getTime() - now.getTime();
                    const diffMins = Math.floor(diffMs / 60000);

                    return {
                        ...c,
                        minutesUntil: diffMins,
                        cliente_nombre: c.clientes?.nombre_completo || 'Cliente sin nombre'
                    };
                })
                .filter(c => c.minutesUntil >= -60 && c.minutesUntil <= 10080)
                .sort((a, b) => a.minutesUntil - b.minutesUntil);

            setUpcoming(next);
        } catch (error) {
            console.error('Error loading upcoming appointments', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;

    const todayCount = upcoming.filter(c => c.minutesUntil < 1440).length; // < 24h approximation

    return (
        <Card className="bg-slate-900/50 border-slate-800 p-0 overflow-hidden mb-6">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="citas" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 hover:bg-slate-800/50 hover:no-underline rounded-lg transition-all">
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                <span className="font-semibold text-white">Próximas Citas</span>
                            </div>

                            <div className="flex gap-2 ml-auto mr-2">
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                                    Total: {upcoming.length}
                                </Badge>
                                {todayCount > 0 && (
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                                        Hoy: {todayCount}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4 pt-1 bg-slate-950/30">
                        {upcoming.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No hay citas próximas
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pt-2">
                                {upcoming.slice(0, 6).map((cita) => (
                                    <div
                                        key={cita.id}
                                        className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col justify-between group hover:border-blue-500/30 transition-all"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-slate-200 font-medium truncate block max-w-[140px]">
                                                    {cita.cliente_nombre}
                                                </span>
                                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${cita.minutesUntil < 0 ? 'bg-red-900/30 text-red-400' :
                                                    cita.minutesUntil < 60 ? 'bg-amber-900/30 text-amber-400' :
                                                        'bg-slate-800 text-slate-400'
                                                    }`}>
                                                    {cita.minutesUntil < 0 ? 'Atrasada' :
                                                        cita.minutesUntil < 60 ? `${cita.minutesUntil}min` :
                                                            new Date(cita.fecha_inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                                                    {cita.patente_vehiculo || '---'}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate flex-1">
                                                    {cita.titulo || 'Servicio'}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            className="w-full h-7 text-xs bg-blue-600/90 hover:bg-blue-600 text-white mt-1"
                                            onClick={() => router.push(`/recepcion?citaId=${cita.id}`)}
                                        >
                                            <CheckCircle2 className="w-3 h-3 mr-1.5" />
                                            Recibir
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}
