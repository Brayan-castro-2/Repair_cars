'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { actualizarOrden, buscarVehiculoPorPatente, obtenerOrdenPorId, obtenerPerfiles, obtenerChecklist, type OrdenDB, type VehiculoDB, type PerfilDB } from '@/lib/storage-adapter';
import { generateOrderPDF } from '@/lib/pdf-generator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import ChecklistForm from '@/components/ordenes/checklist-form';
import { ArrowLeft, CheckCircle, Download, Loader2, Printer, Save, ClipboardCheck, Eye, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function OrdenesCleanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user, isLoading: authLoading } = useAuth();

    const orderIdParam = searchParams.get('id');
    const orderId = Number(orderIdParam);

    const [order, setOrder] = useState<OrdenDB | null>(null);
    const [vehiculo, setVehiculo] = useState<VehiculoDB | null>(null);
    const [perfiles, setPerfiles] = useState<PerfilDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [precioFinal, setPrecioFinal] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [descripcion, setDescripcion] = useState('');
    const [estado, setEstado] = useState('pendiente');
    const [asignadoA, setAsignadoA] = useState<string>('');
    const [detalleTrabajos, setDetalleTrabajos] = useState('');
    const [kmIngreso, setKmIngreso] = useState<string>('');
    const [kmSalida, setKmSalida] = useState<string>('');
    const [clienteNombre, setClienteNombre] = useState<string>('');
    const [clienteTelefono, setClienteTelefono] = useState<string>('');
    const [metodosPago, setMetodosPago] = useState<Array<{ metodo: string; monto: number }>>([]);

    const canViewPrices = user?.name?.toLowerCase().includes('juan');

    const parsePrecio = (value: string) => {
        const digits = value.replace(/[^0-9]/g, '');
        return digits ? Number(digits) : 0;
    };

    const formatPrecio = (value: number) => {
        return value.toLocaleString('es-CL');
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    const [showKm, setShowKm] = useState(false);

    const [checklist, setChecklist] = useState<any>(null);

    const [checklistDialog, setChecklistDialog] = useState<{
        open: boolean;
        mode: 'checklist' | 'readonly_ingreso' | 'salida';
    }>({
        open: false,
        mode: 'checklist'
    });

    useEffect(() => {
        if (!Number.isFinite(orderId)) {
            setIsLoading(false);
            setOrder(null);
            setVehiculo(null);
            return;
        }

        const loadData = async () => {
            const [ordenData, perfs, checklistData] = await Promise.all([
                obtenerOrdenPorId(orderId),
                obtenerPerfiles(),
                obtenerChecklist(String(orderId))
            ]);

            setIsLoading(false); // Set loading false earlier to avoid jitter if possible, or keep at end

            if (ordenData) {
                setOrder(ordenData);
                setPerfiles(perfs);
                setChecklist(checklistData);
                setPrecioFinal(formatPrecio(ordenData.precio_total || 0));

                // Clean Description Logic
                const rawDesc = ordenData.descripcion_ingreso || '';
                // Remove "Motor: ..." prefix if present
                const cleanedDesc = rawDesc.replace(/^Motor:.*?( - |$)/i, '').trim() || rawDesc;
                setDescripcion(cleanedDesc);

                setEstado(ordenData.estado);
                setAsignadoA(ordenData.asignado_a || '');
                setDetalleTrabajos(ordenData.detalle_trabajos || '');
                setMetodosPago(ordenData.metodos_pago || []);

                // KM Logic
                const kmMatch = rawDesc.match(/KM:\s*(\d+\.?\d*)/);
                const kmSalidaMatch = rawDesc.match(/→\s*(\d+\.?\d*)/);

                if (kmMatch) setKmIngreso(kmMatch[1]);
                if (kmSalidaMatch) setKmSalida(kmSalidaMatch[1]);

                // Show KM fields only if data exists
                if (kmMatch || kmSalidaMatch) {
                    setShowKm(true);
                }

                // Client Info Logic (Smart Fallback)
                const veh = await buscarVehiculoPorPatente(ordenData.patente_vehiculo);
                setVehiculo(veh);

                // Prioritize Order info, fallback to Vehicle Client info
                setClienteNombre(ordenData.cliente_nombre || veh?.clientes?.nombre_completo || '');
                setClienteTelefono(ordenData.cliente_telefono || veh?.clientes?.telefono || '');
            } else {
                setIsLoading(false);
            }
        };

        setIsLoading(true);
        loadData();
    }, [orderId]);

    const handlePrint = () => {
        if (!Number.isFinite(orderId)) return;
        window.open(`/print/orden/${orderId}`, '_blank');
    };

    const handleTicket = () => {
        if (!Number.isFinite(orderId)) return;
        window.open(`/print/ticket/${orderId}`, '_blank');
    };

    const handleDownloadPDF = async () => {
        if (!order) return;
        try {
            await generateOrderPDF({
                order,
                vehicle: vehiculo,
                checklist, // New checklist data
                companyInfo: {
                    name: "TALLER MECÁNICO",
                    address: "Av. Principal 123", // TODO: Configurable?
                    phone: "+56 9 1234 5678"
                }
            });
        } catch (error) {
            console.error('Error generando PDF:', error);
            alert('Error al generar el PDF. Por favor intenta nuevamente.');
        }
    };

    const handleGuardarTodo = async () => {
        if (!order) return;
        if (user?.role !== 'admin') return;

        const precio = parsePrecio(precioFinal);
        if (precio < 0) {
            alert('El precio no puede ser negativo');
            return;
        }

        // Validar métodos de pago si hay alguno
        if (metodosPago.length > 0) {
            const totalPagos = metodosPago.reduce((sum, mp) => sum + mp.monto, 0);
            if (totalPagos !== precio) {
                alert(`La suma de los métodos de pago ($${totalPagos.toLocaleString('es-CL')}) debe ser igual al precio total ($${precio.toLocaleString('es-CL')})`);
                return;
            }
        }

        let descripcionActualizada = descripcion;
        if (showKm && kmIngreso && kmSalida) {
            const precioKm = precio > 0 ? precio : 15000;
            descripcionActualizada = `${descripcion}\n\nServicios:\n- KM: ${kmIngreso} KM → ${kmSalida} KM: $${precioKm.toLocaleString('es-CL')}`;
        }

        setIsSaving(true);

        // PREPARAR PAYLOAD: Usar any para permitir nulls explícitos en campos opcionales
        const updateData: any = {
            descripcion_ingreso: descripcion,
            estado,
            precio_total: parsePrecio(precioFinal),
            cliente_nombre: clienteNombre || null,
            cliente_telefono: clienteTelefono || null,
            metodos_pago: metodosPago.length > 0 ? metodosPago : null,
            asignado_a: asignadoA || null,
            detalle_trabajos: detalleTrabajos || null,
        };

        // LÓGICA DE FECHAS
        // 1. Si se marca como completada, establecer fecha de entrega y fecha completada
        if (estado === 'completada') {
            const now = new Date().toISOString();
            // Solo establecer fechas si no existen, o actualizarlas? 
            // Para asegurar consistencia, actualizamos a ahora.
            updateData.fecha_entrega = now;
            updateData.fecha_completada = now;
            updateData.fecha_lista = now;
        }
        // 2. Si se cambia de completada a pendiente, LIMPIAR fechas explícitamente (null)
        else if (estado === 'pendiente' && order.estado === 'completada') {
            console.log('🔄 Revertiendo estado a Pendiente: Limpiando fechas');
            updateData.fecha_entrega = null;
            updateData.fecha_completada = null;
            updateData.fecha_lista = null;
        }

        console.log('📤 Enviando actualización:', updateData);

        const updated = await actualizarOrden(order.id, updateData);

        if (updated) {
            setOrder(updated);
            setPrecioFinal(formatPrecio(updated.precio_total || 0));
            // Actualizar estado local para que el select muestre el valor correcto
            setEstado(updated.estado);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);

            // ACTUALIZACIÓN OPTIMISTA / MANUAL DE CACHÉ
            // Actualizamos directamente la lista en caché para que al volver sea instantáneo
            // sin esperar a que el servidor responda al refetch.
            queryClient.setQueryData<OrdenDB[]>(['orders'], (oldOrders) => {
                if (!oldOrders) return [updated];
                return oldOrders.map(o => o.id === updated.id ? updated : o);
            });

            // Invalidar caché para asegurar consistencia final
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
        setIsSaving(false);
    };

    const handleMarcarListo = async () => {
        if (!order) return;
        if (user?.role !== 'admin') return;

        setIsSaving(true);
        const now = new Date().toISOString();
        const updated = await actualizarOrden(order.id, {
            estado: 'completada',
            fecha_lista: now,
            fecha_completada: now,
            fecha_entrega: now,
        });
        if (updated) {
            console.log('✅ Orden actualizada:', updated);
            setOrder(updated);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);

            // ACTUALIZACIÓN OPTIMISTA / MANUAL DE CACHÉ
            queryClient.setQueryData<OrdenDB[]>(['orders'], (oldOrders) => {
                if (!oldOrders) return [updated];
                return oldOrders.map(o => o.id === updated.id ? updated : o);
            });

            // Invalidar caché para actualizar lista de órdenes inmediatamente
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
        } else {
            console.error('❌ Error: No se pudo actualizar la orden');
            alert('Error al actualizar el estado. Por favor intenta de nuevo.');
        }
        setIsSaving(false);
    };

    // Checklist Handlers
    const handleOpenChecklist = (mode: 'checklist' | 'readonly_ingreso' | 'salida') => {
        setChecklistDialog({ open: true, mode });
    };

    const handleChecklistClose = async () => {
        setChecklistDialog({ open: false, mode: 'checklist' });
        // Refresh checklist data
        const checklistData = await obtenerChecklist(String(orderId));
        setChecklist(checklistData);
    };

    const handleGeneratePDF = async () => {
        if (!order) return;
        try {
            await generateOrderPDF({
                order,
                vehicle: vehiculo,
                checklist,
                companyInfo: {
                    name: 'ELECTROMECANICA JR. SPA',
                    address: 'A INMAR 2290 L IND SEC 2, PUERTO MONTT',
                    phone: '+56 9 1234 5678'
                }
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!Number.isFinite(orderId)) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 mb-4">Selecciona una orden</p>
                <Link href="/admin/ordenes">
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                        Volver a órdenes
                    </Button>
                </Link>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 mb-4">Orden no encontrada</p>
                <Link href="/admin/ordenes">
                    <Button variant="outline" className="border-slate-600 text-slate-300">
                        Volver a órdenes
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {saveSuccess && (
                <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Cambios guardados
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">Orden #{order.id}</h1>
                    <p className="text-sm text-slate-400">{new Date(order.fecha_ingreso).toLocaleString('es-CL')}</p>
                </div>
                <div className="flex gap-2">
                    {user?.role === 'admin' ? (
                        <Button onClick={handleTicket} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                            <Printer className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Boleta/Ticket</span>
                        </Button>
                    ) : null}
                    <Button onClick={handleGeneratePDF} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                        <Download className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">PDF{checklist ? ' (con Checklist)' : ''}</span>
                        <span className="sm:hidden">PDF</span>
                    </Button>
                    <Button onClick={handlePrint} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Imprimir Orden</span>
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white">Detalles de la Orden</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Patente</span>
                        <span className="font-mono font-bold text-white">{order.patente_vehiculo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vehículo</span>
                        <span className="text-white">{vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}</span>
                    </div>
                    {user?.role === 'admin' && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Nombre del Cliente</Label>
                                <Input
                                    value={clienteNombre}
                                    onChange={(e) => setClienteNombre(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                    placeholder="Nombre del cliente"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Teléfono del Cliente</Label>
                                <Input
                                    value={clienteTelefono}
                                    onChange={(e) => setClienteTelefono(e.target.value)}
                                    className="bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                    placeholder="+56 9 1234 5678"
                                />
                            </div>
                        </div>
                    )}
                    {user?.role === 'admin' ? (
                        <>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Estado</Label>
                                    <Select value={estado} onValueChange={setEstado}>
                                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            <SelectItem value="pendiente" className="text-slate-200">Pendiente</SelectItem>
                                            <SelectItem value="completada" className="text-slate-200">Completada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Asignado a</Label>
                                    <Select value={asignadoA || 'none'} onValueChange={(v) => setAsignadoA(v === 'none' ? '' : v)}>
                                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl">
                                            <SelectValue placeholder="Seleccionar mecánico" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            <SelectItem value="none" className="text-slate-200">Sin asignar</SelectItem>
                                            {perfiles.filter(p => p.rol === 'mecanico' || p.rol === 'admin').map((perfil) => (
                                                <SelectItem key={perfil.id} value={perfil.id} className="text-slate-200">
                                                    {perfil.nombre_completo}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-700/50 pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-300">Control de Kilometraje</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">{showKm ? 'Activado' : 'Desactivado'}</span>
                                        <Button
                                            type="button"
                                            variant={showKm ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setShowKm(!showKm)}
                                            className={showKm ? "bg-blue-600 hover:bg-blue-500 h-7" : "border-slate-600 text-slate-400 h-7"}
                                        >
                                            {showKm ? 'Ocultar' : 'Mostrar'}
                                        </Button>
                                    </div>
                                </div>

                                {showKm && (
                                    <div className="grid md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">KM Ingreso</Label>
                                            <Input
                                                type="number"
                                                value={kmIngreso}
                                                onChange={(e) => setKmIngreso(e.target.value)}
                                                className="bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                                placeholder="150000"
                                                min="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">KM Salida</Label>
                                            <Input
                                                type="number"
                                                value={kmSalida}
                                                onChange={(e) => setKmSalida(e.target.value)}
                                                className="bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                                placeholder="130000"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Motivo de Ingreso</Label>
                                <Textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    className="min-h-[100px] bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                    placeholder="Describe el motivo de ingreso del vehículo..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Detalle de Trabajos Realizados</Label>
                                <Textarea
                                    value={detalleTrabajos}
                                    onChange={(e) => setDetalleTrabajos(e.target.value)}
                                    className="min-h-[100px] bg-slate-700/50 border-slate-600 text-white rounded-xl"
                                    placeholder="Describe los trabajos realizados en el vehículo..."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Precio Total ($)</Label>
                                <Input
                                    value={precioFinal}
                                    onChange={(e) => setPrecioFinal(e.target.value)}
                                    onBlur={() => setPrecioFinal(formatPrecio(parsePrecio(precioFinal)))}
                                    inputMode="numeric"
                                    className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-lg font-semibold"
                                    placeholder="15000"
                                />
                                <p className="text-xs text-slate-400">Precio en pesos chilenos</p>
                            </div>

                            {/* Métodos de Pago */}
                            <div className="space-y-3 border-t border-slate-700 pt-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-300 text-base">Métodos de Pago</Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setMetodosPago([...metodosPago, { metodo: 'efectivo', monto: 0 }])}
                                        className="bg-slate-600 hover:bg-slate-500 text-white rounded-lg"
                                    >
                                        + Agregar Método
                                    </Button>
                                </div>


                                {metodosPago.length > 0 && (
                                    <div className="space-y-2">
                                        {metodosPago.map((mp, idx) => (
                                            <div key={idx} className="flex gap-2 items-center bg-slate-700/30 p-3 rounded-lg">
                                                <Select
                                                    value={mp.metodo}
                                                    onValueChange={(value) => {
                                                        const updated = [...metodosPago];
                                                        updated[idx].metodo = value;
                                                        setMetodosPago(updated);
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[140px] bg-slate-700 border-slate-600 text-white rounded-lg">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-800 border-slate-700">
                                                        <SelectItem value="efectivo" className="text-slate-200">Efectivo</SelectItem>
                                                        <SelectItem value="debito" className="text-slate-200">Débito</SelectItem>
                                                        <SelectItem value="credito" className="text-slate-200">Crédito</SelectItem>
                                                        <SelectItem value="transferencia" className="text-slate-200">Transferencia</SelectItem>
                                                        <SelectItem value="debe" className="text-slate-200">Debe (Deuda)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="text"
                                                    value={mp.monto > 0 ? formatPrecio(mp.monto) : ''}
                                                    onChange={(e) => {
                                                        const updated = [...metodosPago];
                                                        updated[idx].monto = parsePrecio(e.target.value);
                                                        setMetodosPago(updated);
                                                    }}
                                                    onBlur={(e) => {
                                                        const updated = [...metodosPago];
                                                        updated[idx].monto = parsePrecio(e.target.value);
                                                        setMetodosPago(updated);
                                                        e.target.value = formatPrecio(updated[idx].monto);
                                                    }}
                                                    placeholder="Monto"
                                                    className="flex-1 bg-slate-700 border-slate-600 text-white rounded-lg"
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        const updated = metodosPago.filter((_, i) => i !== idx);
                                                        setMetodosPago(updated);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    ✕
                                                </Button>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700">
                                            <span className="text-slate-400">Total pagos:</span>
                                            <span className="text-white font-semibold">
                                                ${formatPrecio(metodosPago.reduce((sum, mp) => sum + mp.monto, 0))}
                                            </span>
                                        </div>
                                        {metodosPago.length > 0 && parsePrecio(precioFinal) > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-400">Precio total:</span>
                                                <span className="text-white font-semibold">${precioFinal}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <Button
                                    onClick={handleGuardarTodo}
                                    disabled={isSaving}
                                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Guardar Cambios
                                        </>
                                    )}
                                </Button>
                                <Link href="/admin/ordenes">
                                    <Button
                                        variant="outline"
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Volver a Órdenes
                                    </Button>
                                </Link>
                            </div>

                            {/* Botones de Boleta, PDF e Imprimir - Aparecen solo después de guardar */}
                            {saveSuccess && (
                                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-700">
                                    {user?.role === 'admin' && (
                                        <Button onClick={handleTicket} variant="outline" className="flex-1 sm:flex-none border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                                            <Printer className="w-4 h-4 mr-2" />
                                            Boleta/Ticket
                                        </Button>
                                    )}
                                    <Button onClick={handleDownloadPDF} variant="outline" className="flex-1 sm:flex-none border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                                        <Download className="w-4 h-4 mr-2" />
                                        Descargar PDF
                                    </Button>
                                    <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl">
                                        <Printer className="w-4 h-4 mr-2" />
                                        Imprimir Orden
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Precio Final</span>
                                <span className="text-white font-bold">${(order.precio_total || 0).toLocaleString('es-CL')}</span>
                            </div>
                            <div className="pt-2">
                                <p className="text-slate-400 text-sm mb-1">Motivo</p>
                                <p className="text-white whitespace-pre-wrap">{order.descripcion_ingreso}</p>
                            </div>
                        </>
                    )}

                    {order.detalles_vehiculo ? (
                        <div className="pt-2">
                            <p className="text-slate-400 text-sm mb-1">Detalles del Vehículo</p>
                            <p className="text-white whitespace-pre-wrap">{order.detalles_vehiculo}</p>
                        </div>
                    ) : null}

                    {order.fotos_urls?.length ? (
                        <div className="pt-2">
                            <p className="text-slate-400 text-sm mb-2">Imágenes</p>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {order.fotos_urls.map((src, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => window.open(src, '_blank')}
                                        className="rounded-xl border border-slate-700 bg-slate-800/30 p-2 hover:bg-slate-800/50"
                                    >
                                        <img src={src} alt={`foto-${idx}`} className="h-28 w-full rounded-lg object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* SECCIÓN CHECKLIST */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <ClipboardCheck className="w-5 h-5" />
                        Lista de Chequeo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!checklist ? (
                        // Sin checklist
                        <div className="text-center py-8">
                            <p className="text-slate-400 mb-4">No se ha creado checklist para esta orden</p>
                            <Button
                                onClick={() => handleOpenChecklist('checklist')}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <ClipboardCheck className="w-4 h-4 mr-2" />
                                Crear Checklist Ingreso
                            </Button>
                        </div>
                    ) : !checklist.revisado_por_mecanico_at ? (
                        // Checklist sin confirmar
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-yellow-500">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-medium">Confirmación Pendiente</span>
                            </div>
                            <Button
                                onClick={() => handleOpenChecklist('readonly_ingreso')}
                                variant="outline"
                                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Ingreso para Confirmar
                            </Button>
                        </div>
                    ) : (
                        // Checklist confirmado
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-500">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-medium">Ingreso Revisado</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={() => handleOpenChecklist('readonly_ingreso')}
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Ingreso
                                </Button>
                                <Button
                                    onClick={() => handleOpenChecklist('salida')}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Checklist Salida
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CHECKLIST DIALOG */}
            <Dialog open={checklistDialog.open} onOpenChange={(open) => !open && handleChecklistClose()}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100">
                            {checklistDialog.mode === 'checklist' && 'Crear Checklist de Ingreso'}
                            {checklistDialog.mode === 'readonly_ingreso' && 'Checklist de Ingreso'}
                            {checklistDialog.mode === 'salida' && 'Checklist de Salida'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {checklistDialog.mode === 'checklist' && 'Registra el estado del vehículo al momento del ingreso'}
                            {checklistDialog.mode === 'readonly_ingreso' && 'Revisa y confirma el checklist de ingreso'}
                            {checklistDialog.mode === 'salida' && 'Registra el estado del vehículo al momento de la entrega'}
                        </DialogDescription>
                    </DialogHeader>

                    <ChecklistForm
                        orderId={String(orderId)}
                        onClose={handleChecklistClose}
                        initialData={checklist}
                        mode={checklistDialog.mode}
                    />
                </DialogContent>
            </Dialog>
        </div >
    );
}
