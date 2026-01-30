'use client';

import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
import { CitaDB } from '@/lib/storage-adapter'; // Use shared type
import { obtenerCitasSemana } from '@/lib/storage-adapter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NewBadge } from '@/components/ui/new-badge';
import { FEATURE_FLAGS } from '@/config/modules';
import { AppointmentModal } from '@/components/agenda/appointment-modal';
import { useAuth } from '@/contexts/auth-context';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

function getWeekBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
    if (format === 'short') {
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    }
    return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getWeekDays(startDate: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date;
    });
}

function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function getAppointmentPosition(cita: CitaDB): { hour: number; minute: number } | null {
    const dateStr = cita.fecha_inicio || cita.fecha;
    if (!dateStr) return null;

    const date = new Date(dateStr);
    const hour = date.getHours();
    const minute = date.getMinutes();

    if (hour < 8 || hour >= 20) return null; // Out of bounds

    return { hour, minute };
}

const STATUS_COLORS: Record<string, string> = {
    pendiente: 'bg-yellow-500/20 border-yellow-500 text-yellow-100',
    confirmada: 'bg-blue-500/20 border-blue-500 text-blue-100',
    completada: 'bg-green-500/20 border-green-500 text-green-100',
    cancelada: 'bg-red-500/20 border-red-500 text-red-100',
};

export default function AgendaPage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<CitaDB | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const queryClient = useQueryClient();

    const weekBounds = useMemo(() => getWeekBounds(currentDate), [currentDate]);
    const weekDays = useMemo(() => getWeekDays(weekBounds.start), [weekBounds.start]);

    const { data: citas = [] } = useQuery({
        queryKey: ['citas', weekBounds.start.toISOString(), weekBounds.end.toISOString()],
        queryFn: () => obtenerCitasSemana(weekBounds.start, weekBounds.end),
        staleTime: 0,
    });

    const goToPreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const handleCreateAppointment = (date?: Date) => {
        setSelectedDate(date);
        setSelectedAppointment(null);
        setIsModalOpen(true);
    };

    const handleEditAppointment = (appointment: CitaDB) => {
        setSelectedAppointment(appointment);
        setSelectedDate(undefined);
        setIsModalOpen(true);
    };

    const handleSaveAppointment = () => {
        queryClient.invalidateQueries({ queryKey: ['citas'] });
        setIsModalOpen(false);
        setSelectedAppointment(null);
        setSelectedDate(undefined);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-blue-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            Agenda Semanal
                            {FEATURE_FLAGS.showNewBadges && <NewBadge />}
                        </h1>
                        <p className="text-sm text-slate-400">
                            {formatDate(weekBounds.start, 'long')} - {formatDate(weekBounds.end, 'long')}
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        onClick={goToPreviousWeek}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 min-w-[120px] pointer-events-none" // Disable pointer events on button so input catches all
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            {isToday(currentDate) ? 'Hoy' : formatDate(currentDate)}
                        </Button>
                        <input
                            type="date"
                            title="Seleccionar fecha"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20" // Added z-20
                            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} // Try to force picker
                            onChange={(e) => {
                                if (e.target.value) {
                                    // Ajustar fecha manteniendo la hora actual para evitar saltos de zona horaria extraños
                                    const [y, m, d] = e.target.value.split('-').map(Number);
                                    const newDate = new Date();
                                    newDate.setFullYear(y, m - 1, d);
                                    setCurrentDate(newDate);
                                }
                            }}
                        />
                    </div>

                    <Button
                        onClick={goToNextWeek}
                        variant="outline"
                        size="sm"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="bg-slate-900/40 border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Week Header */}
                        <div className="grid grid-cols-8 border-b border-slate-700">
                            <div className="p-3 bg-slate-800/50 border-r border-slate-700">
                                <Clock className="w-4 h-4 text-slate-400" />
                            </div>
                            {weekDays.map((day, index) => (
                                <div
                                    key={index}
                                    className={`p-3 text-center border-r border-slate-700 ${isToday(day) ? 'bg-blue-500/20' : 'bg-slate-800/50'
                                        }`}
                                >
                                    <div className="text-xs text-slate-400">{DAYS_OF_WEEK[index]}</div>
                                    <div className={`text-sm font-semibold ${isToday(day) ? 'text-blue-400' : 'text-white'}`}>
                                        {formatDate(day)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Time Slots */}
                        {HOURS.map((hour) => (
                            <div key={hour} className="grid grid-cols-8 border-b border-slate-700 relative group" style={{ minHeight: '100px' }}>
                                {/* Hour Label */}
                                <div className="p-3 bg-slate-800/30 border-r border-slate-700 flex flex-col justify-between items-start sticky left-0 z-10 backdrop-blur-sm">
                                    <span className="text-sm font-bold text-slate-300">{hour}:00</span>
                                    <span className="text-xs text-slate-600 hidden group-hover:block transition-opacity">{hour}:30</span>
                                </div>

                                {/* Half-hour divider line */}
                                <div className="absolute top-1/2 left-0 right-0 border-t border-slate-800/50 w-full pointer-events-none" />

                                {/* Day Cells */}
                                {weekDays.map((day, dayIndex) => {
                                    // Filtrar citas del día usando fecha_inicio o fallback
                                    const dayCitas = citas.filter((cita) => {
                                        const dateStr = cita.fecha_inicio || cita.fecha;
                                        if (!dateStr) return false;
                                        const citaDate = new Date(dateStr);
                                        return citaDate.toDateString() === day.toDateString();
                                    });

                                    // Filtrar citas de la hora
                                    const hourCitas = dayCitas.filter((cita) => {
                                        const pos = getAppointmentPosition(cita);
                                        return pos && pos.hour === hour;
                                    });

                                    return (
                                        <div
                                            key={dayIndex}
                                            onClick={() => {
                                                const dateTime = new Date(day);
                                                dateTime.setHours(hour, 0, 0, 0);
                                                handleCreateAppointment(dateTime);
                                            }}
                                            className={`p-1 border-r border-slate-700 hover:bg-slate-700/30 cursor-pointer transition-colors relative ${isToday(day) ? 'bg-blue-500/5' : ''
                                                }`}
                                        >
                                            {/* Appointments */}
                                            {hourCitas.map((cita) => {
                                                const pos = getAppointmentPosition(cita);
                                                if (!pos) return null;
                                                const topPct = (pos.minute / 60) * 100;

                                                return (
                                                    <div
                                                        key={cita.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditAppointment(cita);
                                                        }}
                                                        className={`absolute left-1 right-1 p-2 rounded-lg border-l-4 text-xs shadow-sm hover:shadow-md transition-all z-10 ${STATUS_COLORS[cita.estado] || 'bg-slate-700 text-slate-300'}`}
                                                        style={{
                                                            top: `${topPct}%`,
                                                            height: 'auto',
                                                            minHeight: '40px'
                                                        }}
                                                    >
                                                        <div className="font-bold truncate text-sm">{cita.titulo || cita.cliente_nombre || 'Sin nombre'}</div>
                                                        <div className="flex justify-between items-center opacity-90 mt-0.5">
                                                            <span className="truncate max-w-[70%]">{cita.servicio_solicitado || 'Sin servicio'}</span>
                                                            {cita.patente_vehiculo && (
                                                                <span className="font-mono bg-black/20 px-1 rounded text-[10px]">{cita.patente_vehiculo}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-yellow-500/10 border-yellow-500/30 p-4">
                    <div className="text-xs text-yellow-400 mb-1">Pendientes</div>
                    <div className="text-2xl font-bold text-yellow-300">
                        {citas.filter((c) => c.estado === 'pendiente').length}
                    </div>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30 p-4">
                    <div className="text-xs text-blue-400 mb-1">Confirmadas</div>
                    <div className="text-2xl font-bold text-blue-300">
                        {citas.filter((c) => c.estado === 'confirmada').length}
                    </div>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30 p-4">
                    <div className="text-xs text-green-400 mb-1">Completadas</div>
                    <div className="text-2xl font-bold text-green-300">
                        {citas.filter((c) => c.estado === 'completada').length}
                    </div>
                </Card>
                <Card className="bg-slate-700/30 border-slate-600/30 p-4">
                    <div className="text-xs text-slate-400 mb-1">Total Semana</div>
                    <div className="text-2xl font-bold text-white">{citas.length}</div>
                </Card>
            </div>

            {/* Floating Add Button */}
            <Button
                onClick={() => handleCreateAppointment()}
                className="fixed bottom-20 md:bottom-8 right-8 rounded-full w-14 h-14 shadow-lg bg-blue-600 hover:bg-blue-700"
                size="icon"
            >
                <Plus className="w-6 h-6" />
            </Button>

            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedAppointment(null);
                    setSelectedDate(undefined);
                }}
                onSave={handleSaveAppointment}
                appointment={selectedAppointment}
                defaultDate={selectedDate}
                userId={user?.id}
            />
        </div>
    );
}
