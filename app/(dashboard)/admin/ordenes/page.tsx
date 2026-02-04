'use client';

import { useState, useMemo, useCallback, Fragment, useRef, useEffect } from 'react';
import { type OrdenDB, type PerfilDB, type VehiculoDB, actualizarOrden, eliminarCita, obtenerChecklist } from '@/lib/storage-adapter';
import { generateOrderPDF } from '@/lib/pdf-generator';
import { useInfiniteOrders, useOrdersCount, useDeleteOrder } from '@/hooks/use-orders';
import { useQueryClient } from '@tanstack/react-query';
import { ORDERS_QUERY_KEY } from '@/hooks/use-orders';
import { usePerfiles } from '@/hooks/use-perfiles';
import { useVehiculos } from '@/hooks/use-vehiculos';
import { useAuth } from '@/contexts/auth-context';
import { useAppointments, APPOINTMENTS_QUERY_KEY } from '@/hooks/use-appointments';
import type { CitaDB } from '@/lib/supabase';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ChecklistForm from '@/components/ordenes/checklist-form';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    FileText,
    Calendar,
    Settings,
    ChevronDown,
    Download,
    Eye,
    Trash2,
    Edit,
    CheckCircle,
    X,
    User,
    Wrench,
    DollarSign,
    ClipboardCheck,
    Printer,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Loader2,
    ChevronRight,
} from 'lucide-react';

import Link from 'next/link';


export default function OrdenesPage() {
    const { user } = useAuth();

    const {
        data: infiniteData,
        isLoading: isLoadingOrders,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteOrders();
    const { data: totalOrdersCount = 0 } = useOrdersCount();

    // Flatten orders from pages
    const orders = useMemo(() => infiniteData?.pages.flatMap(page => page.orders) || [], [infiniteData]);

    const observer = useRef<IntersectionObserver>();
    const lastOrderElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isFetchingNextPage) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasNextPage) {
                fetchNextPage();
            }
        });
        if (node) observer.current.observe(node);
    }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

    const { data: appointments = [], isLoading: isLoadingAppointments } = useAppointments();
    const { data: perfiles = [], isLoading: isLoadingPerfiles } = usePerfiles();
    const { data: vehiculos = [], isLoading: isLoadingVehiculos } = useVehiculos();
    const deleteOrder = useDeleteOrder();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewFilter, setViewFilter] = useState<string>('orders'); // NEW: orders, appointments, nearby, all
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [mechanicFilter, setMechanicFilter] = useState<string>('all');
    const [debtFilter, setDebtFilter] = useState<string>('all');

    const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
    const [sortConfig, setSortConfig] = useState<{ key: keyof OrdenDB | 'precio_total' | 'fecha_ingreso', direction: 'asc' | 'desc' }>({ key: 'fecha_ingreso', direction: 'desc' });
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    // Checklist State
    const [checklists, setChecklists] = useState<Record<string, any>>({});
    const [loadingChecklists, setLoadingChecklists] = useState<Record<string, boolean>>({});

    // Checklist Dialog State
    const [checklistDialog, setChecklistDialog] = useState<{
        open: boolean;
        orderId: string | null;
        mode: 'checklist' | 'readonly_ingreso' | 'salida';
    }>({ open: false, orderId: null, mode: 'checklist' });

    const fetchChecklist = async (orderId: number, force = false) => {
        if (!force && checklists[orderId]) return;

        setLoadingChecklists(prev => ({ ...prev, [orderId]: true }));
        try {
            const data = await obtenerChecklist(orderId.toString());
            // Ensure data is not null before setting
            if (data) {
                setChecklists(prev => ({ ...prev, [orderId]: data }));
            }
        } catch (error) {
            console.error('Error fetching checklist:', error);
        } finally {
            setLoadingChecklists(prev => ({ ...prev, [orderId]: false }));
        }
    };



    const handleOpenChecklist = (orderId: number, mode: 'checklist' | 'readonly_ingreso' | 'salida') => {
        setChecklistDialog({ open: true, orderId: orderId.toString(), mode });
        fetchChecklist(orderId);
    };

    const handleChecklistClose = () => {
        const orderId = checklistDialog.orderId;
        setChecklistDialog({ open: false, orderId: null, mode: 'checklist' });
        // Refresh checklist data
        if (orderId) {
            const id = parseInt(orderId);
            setChecklists(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
            fetchChecklist(id, true);
        }
    };

    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

    // Auto-fetch checklist when order is expanded
    useEffect(() => {
        if (expandedOrderId !== null) {
            fetchChecklist(expandedOrderId);
        }
    }, [expandedOrderId]);

    const isAdmin = user?.role === 'admin';
    const canViewPrices = user?.name?.toLowerCase().includes('juan');
    const isLoading = isLoadingOrders || isLoadingPerfiles || isLoadingVehiculos;

    // Memoizar mapas para búsquedas O(1) en lugar de O(n)
    const perfilesMap = useMemo(() => {
        const map = new Map<string, string>();
        perfiles.forEach(p => map.set(p.id, p.nombre_completo));
        return map;
    }, [perfiles]);

    const vehiculosMap = useMemo(() => {
        const map = new Map<string, VehiculoDB>();
        vehiculos.forEach(v => map.set(v.patente, v));
        return map;
    }, [vehiculos]);

    const getPerfilNombre = useCallback((id: string) => {
        return perfilesMap.get(id) || 'Sin asignar';
    }, [perfilesMap]);

    const hasDebt = useCallback((order: OrdenDB) => {
        // V3: Check simple 'debe' status or method
        return order.metodo_pago === 'debe' || order.estado === 'entregada' && !order.fecha_cierre;
    }, []);

    // Extraer el motivo limpio de la descripción
    const getCleanMotivo = useCallback((descripcion: string) => {
        if (!descripcion) return '-';

        // Buscar la sección de servicios
        const lines = descripcion.split('\n');
        const servicios: string[] = [];

        let inServicios = false;
        for (const line of lines) {
            if (line.trim() === 'Servicios:') {
                inServicios = true;
                continue;
            }

            if (inServicios && line.trim().startsWith('-')) {
                // Extraer solo el nombre del servicio, sin el precio
                // Formato: "- DPF ELECTRONICO: $50000" -> "DPF ELECTRONICO"
                const match = line.match(/-\s*([^:]+)/);
                if (match) {
                    servicios.push(match[1].trim());
                }
            }
        }

        // Si encontramos servicios, devolverlos unidos
        if (servicios.length > 0) {
            return servicios.join(', ');
        }

        // Fallback: devolver la primera línea no vacía
        const firstLine = lines.find(l => l.trim() !== '');
        return firstLine?.trim() || '-';
    }, []);

    const isToday = (date: string) => {
        const today = new Date();
        const orderDate = new Date(date);
        return orderDate.toDateString() === today.toDateString();
    };

    const isThisWeek = (date: string) => {
        const today = new Date();
        const orderDate = new Date(date);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo && orderDate <= today;
    };

    const isThisMonth = (date: string) => {
        const today = new Date();
        const orderDate = new Date(date);
        return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
    };

    // Helper to check if appointment is nearby (today or within 2 hours)
    const isAppointmentNearby = useCallback((appointmentDateTime: string) => {
        const now = new Date();
        const apptDate = new Date(appointmentDateTime);
        const diffMs = apptDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Nearby = today OR within next 2 hours
        const isToday = apptDate.toDateString() === now.toDateString();
        const isWithinTwoHours = diffHours >= 0 && diffHours <= 2;

        return isToday || isWithinTwoHours;
    }, []);

    // Convert appointment to order-like format for display
    const appointmentToOrderFormat = useCallback((appt: any): OrdenDB & { isAppointment: true } => {
        const a = appt as any;
        return {
            id: a.id,
            patente_vehiculo: a.patente_vehiculo || 'Sin patente',
            descripcion_ingreso: a.servicio_solicitado || a.titulo || 'Cita agendada',
            estado: 'agendada',
            creado_por: a.creado_por || '',
            asignado_a: null,
            fecha_ingreso: a.fecha || a.fecha_inicio,
            fecha_actualizacion: a.fecha || a.fecha_inicio,
            isAppointment: true,
            // Add other required fields with defaults
            detalle_trabajos: a.notas,
            vehiculos: a.vehiculos, // Pass nested vehicle data
            // Use nested client data from JOIN or fallback to legacy top-level
            cliente_nombre: a.clientes?.nombre_completo || a.cliente_nombre || 'Sin Cliente',
            cliente_telefono: a.clientes?.telefono || a.cliente_telefono || '',
        } as any;
    }, []);

    // Memoizar filtrado con soporte para citas
    const filteredOrders = useMemo(() => {
        let itemsToFilter: (OrdenDB | (OrdenDB & { isAppointment: true }))[] = [];

        // Decidir qué incluir según viewFilter
        if (viewFilter === 'orders') {
            itemsToFilter = orders;
        } else if (viewFilter === 'appointments') {
            itemsToFilter = appointments.map(appointmentToOrderFormat);
        } else if (viewFilter === 'nearby') {
            const nearbyAppointments = appointments
                .filter(appt => isAppointmentNearby(appt.fecha_inicio))
                .map(appointmentToOrderFormat);
            itemsToFilter = [...orders, ...nearbyAppointments];
        } else if (viewFilter === 'all') {
            const allAppointments = appointments.map(appointmentToOrderFormat);
            itemsToFilter = [...orders, ...allAppointments];
        }

        return itemsToFilter.filter(order => {
            const vehiculo = order.vehiculos;
            const matchesSearch =
                (order.patente_vehiculo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (vehiculo?.marca?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (vehiculo?.marca?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (vehiculo?.modelo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                order.descripcion_ingreso.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (vehiculo?.clientes?.nombre_completo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (vehiculo?.clientes?.telefono?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.cliente_nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (order.precio_total?.toString() || '').includes(searchTerm);

            const matchesStatus = statusFilter === 'all' || order.estado === statusFilter;
            const matchesMechanic = mechanicFilter === 'all' || order.asignado_a === mechanicFilter;
            const matchesDebt = debtFilter === 'all' ||
                (debtFilter === 'con_deuda' && hasDebt(order)) ||
                (debtFilter === 'sin_deuda' && !hasDebt(order));

            const matchesDate =
                (!dateRange.from || new Date(order.fecha_ingreso) >= new Date(dateRange.from)) &&
                (!dateRange.to || new Date(order.fecha_ingreso) <= new Date(new Date(dateRange.to).setHours(23, 59, 59, 999)));

            return matchesSearch && matchesStatus && matchesMechanic && matchesDebt && matchesDate;
        }).sort((a, b) => {
            const key = sortConfig.key;
            const direction = sortConfig.direction === 'asc' ? 1 : -1;

            // Handle specific complex sort keys or default
            let valA: any = a[key as keyof OrdenDB];
            let valB: any = b[key as keyof OrdenDB];

            if (key === 'fecha_ingreso') {
                valA = new Date(a.fecha_ingreso).getTime();
                valB = new Date(b.fecha_ingreso).getTime();
            }

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });
    }, [orders, appointments, viewFilter, searchTerm, statusFilter, mechanicFilter, debtFilter, dateRange, sortConfig, vehiculosMap, hasDebt, appointmentToOrderFormat, isAppointmentNearby]);

    const handleSort = (key: keyof OrdenDB | 'precio_total' | 'fecha_ingreso') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-500 opacity-50" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-blue-400" />
            : <ArrowDown className="w-3 h-3 ml-1 text-blue-400" />;
    };

    const handleDeleteOrder = async (item: { id: number, isAppointment?: boolean }) => {
        try {
            if (item.isAppointment) {
                await eliminarCita(item.id);
                // Invalidar ambas queries por si acaso
                queryClient.invalidateQueries({ queryKey: APPOINTMENTS_QUERY_KEY });
                queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
            } else {
                await deleteOrder.mutateAsync(item.id);
            }
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar el elemento');
        }
    };

    // Cambiar estado de orden con auto-guardado
    const handleToggleStatus = useCallback(async (orderId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'completada' ? 'pendiente' : 'completada';

        try {
            const updateData: any = { estado: newStatus };

            // Si se marca como completada, establecer fecha de entrega
            if (newStatus === 'completada') {
                updateData.fecha_entrega = new Date().toISOString();
            }
            // Si se revierte a pendiente, limpiar fecha de entrega
            else if (newStatus === 'pendiente') {
                updateData.fecha_entrega = null;
            }

            await actualizarOrden(orderId, updateData);
            // Invalidar caché para refrescar la lista
            queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            alert('Error al cambiar el estado de la orden');
        }
    }, [queryClient]);

    const getStatusBadge = (status: string, orderId?: number, interactive: boolean = false) => {
        const config: Record<string, { class: string; label: string; icon: string }> = {
            pendiente: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pendiente', icon: '⏳' },
            en_progreso: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'En Progreso', icon: '⚙️' },
            lista: { class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Lista', icon: '✅' },
            completada: { class: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Completada', icon: '✓' },
            cancelada: { class: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Cancelada', icon: '✖' },
            agendada: { class: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Agendada', icon: '📅' },
        };
        const c = config[status] || config.pendiente;

        if (interactive && orderId) {
            return (
                <Badge
                    className={`${c.class} border cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleStatus(orderId, status);
                    }}
                >
                    {c.icon} {c.label}
                </Badge>
            );
        }

        return <Badge className={`${c.class} border`}>{c.icon} {c.label}</Badge>;
    };

    // Helper functions for data display
    const getClientInfo = (order: any) => {
        const client = order.vehiculos?.clientes;
        return {
            nombre: client?.nombre_completo || order.cliente_nombre || 'Cliente S/R',
            telefono: client?.telefono || order.cliente_telefono || 'S/T',
            email: client?.email || order.cliente_email,
            rut: client?.rut_dni || order.cliente_rut
        };
    };

    const cleanDescription = (desc: string) => {
        if (!desc) return 'Sin descripción';
        // Remove "Motor: ..." prefix if present, but keep the rest
        // Matches "Motor: [text] - " or just "Motor: [text]"
        return desc.replace(/^Motor:.*?( - |$)/i, '').trim() || desc;
    };

    const handlePrintOrder = async (order: any) => {
        try {
            // Fetch checklist on demand
            const checklist = await obtenerChecklist(String(order.id));

            await generateOrderPDF({
                order,
                vehicle: order.vehiculos,
                checklist,
                companyInfo: {
                    name: "TALLER MECÁNICO",
                    address: "Av. Principal 123",
                    phone: "+56 9 1234 5678"
                }
            });
        } catch (error) {
            console.error('Error printing order:', error);
            alert('Error al generar el PDF');
        }
    };

    const handleExportPDF = () => {
        const printContent = filteredOrders.map(order => {
            const vehiculo = order.vehiculos;
            return {
                patente: order.patente_vehiculo,
                vehiculo: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-',
                descripcion: order.descripcion_ingreso,
                creado_por: getPerfilNombre(order.creado_por),
                asignado_a: order.asignado_a ? getPerfilNombre(order.asignado_a) : '-',
                estado: order.estado,
                precio: order.precio_total || 0
            };
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Órdenes de Trabajo</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
                    .header img { height: 60px; }
                    .header h1 { color: #333; margin: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #0066FF; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="/images/logo-taller.png" alt="Logo" style="height: 120px;" />
                    <div>
                        <h1>Órdenes de Trabajo</h1>
                        <p>Total de órdenes: ${printContent.length}</p>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Patente</th>
                            <th>Vehículo</th>
                            <th>Descripción</th>
                            <th>Creado por</th>
                            <th>Asignado a</th>
                            <th>Estado</th>
                            ${canViewPrices ? '<th>Precio</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${printContent.map(o => `
                            <tr>
                                <td>${o.patente}</td>
                                <td>${o.vehiculo}</td>
                                <td>${o.descripcion}</td>
                                <td>${o.creado_por}</td>
                                <td>${o.asignado_a}</td>
                                <td>${o.estado}</td>
                                ${canViewPrices ? `<td>$${o.precio.toLocaleString('es-CL')}</td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Safety check
    console.log('Rendering orders page');

    return (
        <div className="space-y-6 px-4 md:px-0">
            {/* Header Section */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-white">Órdenes de Trabajo</h1>
                    <p className="text-xs md:text-sm text-slate-400">Gestión de órdenes del taller</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-slate-800/50 border-slate-700/50 overflow-hidden">
                <CardContent className="pt-6 px-3 sm:px-6">
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 rounded-xl text-sm"
                            />
                        </div>
                        {/* View Type Filter */}
                        <div className="space-y-1.5">
                            <div className="flex items-center">
                                <label className="text-xs text-slate-400 font-medium px-1">Tipo de Vista</label>
                            </div>
                            <Select value={viewFilter} onValueChange={setViewFilter}>
                                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-sm h-10">
                                    <SelectValue placeholder="Solo Órdenes" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="orders" className="text-slate-200">Solo Órdenes</SelectItem>
                                    <SelectItem value="appointments" className="text-slate-200">Solo Citas</SelectItem>
                                    <SelectItem value="nearby" className="text-slate-200">Órdenes + Citas Próximas</SelectItem>
                                    <SelectItem value="all" className="text-slate-200">Todo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium px-1">Estado</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-slate-200">Todos</SelectItem>
                                        <SelectItem value="pendiente" className="text-slate-200">⏳ Pendientes</SelectItem>
                                        <SelectItem value="completada" className="text-slate-200">✓ Completadas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium px-1">Mecánico</label>
                                <Select value={mechanicFilter} onValueChange={setMechanicFilter}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-slate-200">Todos</SelectItem>
                                        {perfiles.filter(p => p.rol === 'mecanico' || p.rol === 'admin').map(perfil => (
                                            <SelectItem key={perfil.id} value={perfil.id} className="text-slate-200">
                                                {perfil.nombre_completo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center">
                                    <label className="text-xs text-slate-400 font-medium px-1">Deuda</label>
                                </div>
                                <Select value={debtFilter} onValueChange={setDebtFilter}>
                                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="all" className="text-slate-200">Todas</SelectItem>
                                        <SelectItem value="con_deuda" className="text-slate-200">Con Deuda</SelectItem>
                                        <SelectItem value="sin_deuda" className="text-slate-200">Sin Deuda</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium px-1">Fecha</label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="bg-slate-700/50 border-slate-600 text-white rounded-xl text-xs sm:text-sm h-9 w-full justify-between font-normal hover:bg-slate-700 hover:text-white">
                                            <span className="truncate">
                                                {dateRange.from ? (
                                                    dateRange.to ? `${dateRange.from} - ${dateRange.to}` : `Desde ${dateRange.from}`
                                                ) : 'Todas las fechas'}
                                            </span>
                                            <Calendar className="w-3.5 h-3.5 ml-2 opacity-50" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-auto p-4 bg-slate-800 border-slate-700" align="end">
                                        <DropdownMenuLabel className="text-slate-200 mb-2">Filtrar por Rango</DropdownMenuLabel>
                                        <div className="flex flex-col gap-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-400">Desde</label>
                                                    <Input
                                                        type="date"
                                                        value={dateRange.from}
                                                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                                        className="bg-slate-900 border-slate-700 h-8 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-slate-400">Hasta</label>
                                                    <Input
                                                        type="date"
                                                        value={dateRange.to}
                                                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                                        className="bg-slate-900 border-slate-700 h-8 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="outline" className="text-xs border-slate-600 hover:bg-slate-700 h-7" onClick={() => {
                                                    const today = new Date().toISOString().split('T')[0];
                                                    setDateRange({ from: today, to: today });
                                                }}>Hoy</Button>
                                                <Button size="sm" variant="outline" className="text-xs border-slate-600 hover:bg-slate-700 h-7" onClick={() => {
                                                    const today = new Date();
                                                    const prev = new Date(today);
                                                    prev.setDate(prev.getDate() - 7);
                                                    setDateRange({ from: prev.toISOString().split('T')[0], to: today.toISOString().split('T')[0] });
                                                }}>7 Días</Button>
                                                <Button size="sm" variant="outline" className="text-xs border-slate-600 hover:bg-slate-700 h-7" onClick={() => {
                                                    const today = new Date();
                                                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                                                    setDateRange({ from: firstDay.toISOString().split('T')[0], to: today.toISOString().split('T')[0] });
                                                }}>Este Mes</Button>
                                            </div>
                                            {(dateRange.from || dateRange.to) && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 mt-1 w-full"
                                                    onClick={() => setDateRange({ from: '', to: '' })}
                                                >
                                                    <X className="w-3 h-3 mr-1" /> Limpiar Filtro
                                                </Button>
                                            )}
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleExportPDF}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl w-full sm:w-auto text-sm h-9"
                                disabled={filteredOrders.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar PDF
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Table/List */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <CardTitle className="text-white flex justify-between items-center">
                        <span>{filteredOrders.length} orden{filteredOrders.length !== 1 ? 'es' : ''} mostradas</span>
                        <span className="text-sm text-slate-400 font-normal">Total: {totalOrdersCount}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="text-slate-300 cursor-pointer hover:text-white" onClick={() => handleSort('patente_vehiculo')}>
                                        <div className="flex items-center">Patente <SortIcon column="patente_vehiculo" /></div>
                                    </TableHead>
                                    <TableHead className="text-slate-300">Vehículo</TableHead>
                                    <TableHead className="text-slate-300">Motivo</TableHead>
                                    <TableHead className="text-slate-300 cursor-pointer hover:text-white" onClick={() => handleSort('asignado_a')}>
                                        <div className="flex items-center">Asignado <SortIcon column="asignado_a" /></div>
                                    </TableHead>
                                    <TableHead className="text-slate-300 cursor-pointer hover:text-white" onClick={() => handleSort('estado')}>
                                        <div className="flex items-center">Estado <SortIcon column="estado" /></div>
                                    </TableHead>
                                    <TableHead className="text-slate-300 w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map((order) => {
                                    const isExpanded = expandedOrderId === order.id;
                                    const vehiculo = order.vehiculos;
                                    return (
                                        <Fragment key={order.id}>
                                            <TableRow
                                                className={`border-slate-700 hover:bg-slate-700/30 cursor-pointer ${hasDebt(order) ? 'bg-red-900/10 border-l-4 border-l-red-500' : ''} ${isExpanded ? 'bg-slate-700/50' : ''}`}
                                                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                            >
                                                <TableCell className="font-mono text-white">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="font-bold text-sm">{order.patente_vehiculo}</div>
                                                        {hasDebt(order) && <span className="text-red-400 text-xs">💳</span>}
                                                    </div>

                                                    <div className="text-xs text-slate-400 truncate max-w-[100px]">
                                                        {order.vehiculos?.clientes?.nombre_completo || order.cliente_nombre || 'Cliente S/R'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[100px]">
                                                        {order.vehiculos?.clientes?.telefono || order.cliente_telefono}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    <div className="text-sm truncate max-w-[140px]">
                                                        {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-300" title={getCleanMotivo(order.descripcion_ingreso)}>
                                                    <div className="text-sm truncate max-w-[180px]">
                                                        {getCleanMotivo(order.descripcion_ingreso)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    <div className="text-sm truncate max-w-[100px]">
                                                        {order.perfiles_asignado ? order.perfiles_asignado.nombre_completo : (order.perfiles_creado ? order.perfiles_creado.nombre_completo : 'Sin asignar')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {getStatusBadge(order.estado, order.id, true)}
                                                    </div>
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1">
                                                        {/* Confirm Appointment Button */}
                                                        {(order as any).isAppointment && (
                                                            <Link href={`/recepcion?citaId=${order.id}`} onClick={(e) => e.stopPropagation()}>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-purple-400 hover:text-purple-300 h-8 w-8 p-0"
                                                                    title="Confirmar Cita y Crear Orden"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </Link>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-slate-400 hover:text-slate-300 h-8 w-8 p-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newExpandedId = isExpanded ? null : order.id;
                                                                setExpandedOrderId(newExpandedId);
                                                                if (newExpandedId) {
                                                                    fetchChecklist(newExpandedId);
                                                                }
                                                            }}
                                                        >
                                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </Button>
                                                        <Link href={`/admin/ordenes/clean?id=${order.id}`} onClick={(e) => e.stopPropagation()}>
                                                            <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 h-8 w-8 p-0">
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </Link>
                                                        {isAdmin && (
                                                            deleteConfirm === order.id ? (
                                                                <div className="flex gap-0.5">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteOrder(order as any);
                                                                        }}
                                                                        disabled={deleteOrder.isPending}
                                                                    >
                                                                        ✓
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-slate-400 hover:text-slate-300 h-8 w-8 p-0"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeleteConfirm(null);
                                                                        }}
                                                                    >
                                                                        ✕
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setDeleteConfirm(order.id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {
                                                isExpanded && (
                                                    <TableRow key={`${order.id}-expanded`} className="border-slate-700">
                                                        <TableCell colSpan={6} className="bg-slate-800/80 p-0">
                                                            <div className="p-6 space-y-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {/* Información del Vehículo */}
                                                                    <div className="space-y-3">
                                                                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                            <Wrench className="w-4 h-4" />
                                                                            Información del Vehículo
                                                                        </h3>
                                                                        <div className="space-y-2 text-sm">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-slate-400">Patente:</span>
                                                                                <span className="text-white font-mono font-bold">{order.patente_vehiculo}</span>
                                                                            </div>
                                                                            {vehiculo && (
                                                                                <>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Marca:</span>
                                                                                        <span className="text-white">{vehiculo.marca}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Modelo:</span>
                                                                                        <span className="text-white">{vehiculo.modelo}</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between">
                                                                                        <span className="text-slate-400">Año:</span>
                                                                                        <span className="text-white">{vehiculo.anio}</span>
                                                                                    </div>
                                                                                    {vehiculo.motor && (
                                                                                        <div className="flex justify-between">
                                                                                            <span className="text-slate-400">Motor:</span>
                                                                                            <span className="text-white">{vehiculo.motor}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Información del Cliente */}
                                                                    <div className="space-y-3">
                                                                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                            <User className="w-4 h-4" />
                                                                            Información del Cliente
                                                                        </h3>
                                                                        <div className="space-y-2 text-sm">
                                                                            {(() => {
                                                                                const info = getClientInfo(order);
                                                                                return (
                                                                                    <>
                                                                                        <div className="flex justify-between">
                                                                                            <span className="text-slate-400">Nombre:</span>
                                                                                            <span className="text-white font-medium">{info.nombre}</span>
                                                                                        </div>
                                                                                        <div className="flex justify-between">
                                                                                            <span className="text-slate-400">Teléfono:</span>
                                                                                            <span className="text-white">{info.telefono}</span>
                                                                                        </div>
                                                                                        {info.email && (
                                                                                            <div className="flex justify-between">
                                                                                                <span className="text-slate-400">Email:</span>
                                                                                                <span className="text-white">{info.email}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {info.rut && (
                                                                                            <div className="flex justify-between">
                                                                                                <span className="text-slate-400">RUT:</span>
                                                                                                <span className="text-white">{info.rut}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>

                                                                </div>

                                                                {/* Información de la Orden */}
                                                                <div className="space-y-3">
                                                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                        <Calendar className="w-4 h-4" />
                                                                        Detalles de la Orden
                                                                    </h3>
                                                                    <div className="space-y-2 text-sm">
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-slate-400 min-w-[100px]">Fecha Ingreso:</span>
                                                                            <span className="text-white">
                                                                                {new Date(order.fecha_ingreso).toLocaleString('es-CL', {
                                                                                    day: '2-digit',
                                                                                    month: '2-digit',
                                                                                    year: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                })}
                                                                            </span>
                                                                        </div>
                                                                        {order.fecha_entrega && (
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="text-slate-400 min-w-[100px]">Fecha Entrega:</span>
                                                                                <span className="text-green-400 font-semibold">
                                                                                    {new Date(order.fecha_entrega).toLocaleString('es-CL', {
                                                                                        day: '2-digit',
                                                                                        month: '2-digit',
                                                                                        year: 'numeric',
                                                                                        hour: '2-digit',
                                                                                        minute: '2-digit'
                                                                                    })}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-slate-400 min-w-[100px]">Creado por:</span>
                                                                            <span className="text-white">{getPerfilNombre(order.creado_por)}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-slate-400 min-w-[100px]">Asignado a:</span>
                                                                            <span className="text-white">{order.asignado_a ? getPerfilNombre(order.asignado_a) : '-'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-slate-400 min-w-[100px]">Estado:</span>
                                                                            {getStatusBadge(order.estado, order.id, true)}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Información de Pago */}
                                                                {canViewPrices && (
                                                                    <div className="space-y-3">
                                                                        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                            <DollarSign className="w-4 h-4" />
                                                                            Información de Pago
                                                                        </h3>
                                                                        <div className="space-y-2 text-sm">
                                                                            {order.precio_total && (
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Total:</span>
                                                                                    <span className="text-white font-semibold">${order.precio_total.toLocaleString('es-CL')}</span>
                                                                                </div>
                                                                            )}
                                                                            {order.metodo_pago && (
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-slate-400">Método:</span>
                                                                                    <span className="text-white capitalize">{order.metodo_pago}</span>
                                                                                </div>
                                                                            )}
                                                                            {hasDebt(order) && (
                                                                                <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                                                                                    💳 Cliente tiene deuda pendiente
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Descripción Completa */}
                                                            <div className="space-y-2 mt-4">
                                                                <h3 className="text-sm font-semibold text-slate-300">Descripción del Trabajo</h3>
                                                                <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap">
                                                                    {cleanDescription(order.descripcion_ingreso)}
                                                                </div>
                                                            </div>

                                                            {/* Checklist Section Placeholder */}
                                                            <div className="mt-6 border-t border-slate-700/50 pt-4">
                                                                <div className="flex justify-between items-center mb-4">
                                                                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                                                        <ClipboardCheck className="w-4 h-4" />
                                                                        Lista de Chequeo
                                                                    </h3>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-8 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                                                                            onClick={() => handlePrintOrder(order)}
                                                                        >
                                                                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                                                                            Imprimir Orden
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {/* Checklist Content / Actions */}
                                                                <div className="bg-slate-900/30 rounded-lg p-4 border border-dashed border-slate-800">
                                                                    {loadingChecklists[order.id] ? (
                                                                        <div className="flex justify-center py-2">
                                                                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-center justify-center gap-3">
                                                                            {(() => {
                                                                                const checklist = checklists[order.id];
                                                                                // Logic: If NO checklist exists yet, create one (standard mode)
                                                                                // If checklist exists, check 'revisado_por_mecanico_at'

                                                                                if (!checklist) {
                                                                                    // Case: No checklist created yet (Receptionist didn't do it?)
                                                                                    // Mechanic or Admin can create it.
                                                                                    return (
                                                                                        <Button
                                                                                            onClick={() => handleOpenChecklist(order.id, 'checklist')}
                                                                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                                                        >
                                                                                            <Plus className="w-4 h-4 mr-2" />
                                                                                            Crear Checklist Ingreso
                                                                                        </Button>
                                                                                    );
                                                                                }

                                                                                const isReviewed = !!checklist.revisado_por_mecanico_at;

                                                                                if (isReviewed) {
                                                                                    // State 2: Informed -> Exit Checklist
                                                                                    return (
                                                                                        <div className="text-center space-y-2">
                                                                                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
                                                                                                <CheckCircle className="w-4 h-4" />
                                                                                                Ingreso Revisado
                                                                                            </div>
                                                                                            <Button
                                                                                                onClick={() => handleOpenChecklist(order.id, 'salida')}
                                                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto"
                                                                                            >
                                                                                                ✅ Checklist Salida / Editar
                                                                                            </Button>
                                                                                        </div>
                                                                                    );
                                                                                } else {
                                                                                    // State 1: Blind -> Readonly Review
                                                                                    return (
                                                                                        <div className="text-center space-y-2">
                                                                                            <div className="text-xs text-orange-400 mb-1">
                                                                                                ⚠️ Confirmación Pendiente
                                                                                            </div>
                                                                                            <Button
                                                                                                onClick={() => handleOpenChecklist(order.id, 'readonly_ingreso')}
                                                                                                className="bg-blue-600 hover:bg-blue-500 text-white w-full sm:w-auto animate-pulse"
                                                                                            >
                                                                                                👁️ Ver Ingreso para Confirmar
                                                                                            </Button>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            }
                                        </Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden space-y-3">
                        {filteredOrders.map((order) => {
                            const vehiculo = order.vehiculos;
                            return (
                                <Card key={order.id} className={`bg-slate-700/30 border-slate-600/50 ${hasDebt(order) ? 'border-l-4 border-l-red-500 bg-red-900/10' : ''}`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-14 h-10 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="text-white font-mono font-bold text-xs">
                                                    {order.patente_vehiculo}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-white font-medium truncate text-sm flex-1">
                                                        {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : order.patente_vehiculo}
                                                    </p>
                                                    {hasDebt(order) && <span className="text-red-400 text-xs flex-shrink-0">💳</span>}
                                                </div>
                                                {order.cliente_nombre && (
                                                    <p className="text-xs text-blue-400 truncate">
                                                        {order.cliente_nombre}
                                                    </p>
                                                )}
                                                {order.cliente_telefono && (
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {order.cliente_telefono}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-500 truncate">
                                                    {new Date(order.fecha_ingreso).toLocaleDateString('es-CL', {
                                                        day: '2-digit',
                                                        month: '2-digit'
                                                    })} {new Date(order.fecha_ingreso).toLocaleTimeString('es-CL', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate mt-1">
                                                    {getCleanMotivo(order.descripcion_ingreso)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex-shrink-0">
                                                {getStatusBadge(order.estado, order.id, true)}
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Link href={`/admin/ordenes/clean?id=${order.id}`}>
                                                    <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-2">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                </Link>
                                                {isAdmin && (
                                                    deleteConfirm === order.id ? (
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                                                                onClick={() => handleDeleteOrder(order as any)}
                                                                disabled={deleteOrder.isPending}
                                                            >
                                                                ✓
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-slate-400 hover:text-slate-300 h-8 px-2"
                                                                onClick={() => setDeleteConfirm(null)}
                                                            >
                                                                ✕
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                                                            onClick={() => setDeleteConfirm(order.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Loading Spinner & Sentinel */}
                    <div className="py-4 flex justify-center w-full">
                        {hasNextPage && (
                            <div
                                className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-white transition-colors"
                                onClick={() => fetchNextPage()}
                            >
                                {isFetchingNextPage ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                ) : (
                                    <div
                                        ref={lastOrderElementRef}
                                        className="h-4 w-full"
                                    />
                                )}
                            </div>
                        )}
                        {!hasNextPage && orders.length > 0 && (
                            <div className="text-xs text-slate-500 italic">No hay más órdenes para cargar</div>
                        )}
                    </div>

                    {filteredOrders.length === 0 && !isLoadingOrders && (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                            <p className="text-slate-400">No se encontraron órdenes</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CHECKLIST MODAL */}
            <Dialog open={checklistDialog.open} onOpenChange={(open) => !open && handleChecklistClose()}>
                <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 text-white p-0 overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ClipboardCheck className="w-6 h-6 text-blue-500" />
                                {checklistDialog.mode === 'salida' ? '🚗 Checklist de Salida' :
                                    checklistDialog.mode === 'readonly_ingreso' ? '👁️ Revisión de Ingreso' :
                                        '📋 Checklist de Vehículo'}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                {checklistDialog.mode === 'salida'
                                    ? 'Completa el checklist de salida antes de entregar el vehículo al cliente.'
                                    : checklistDialog.mode === 'readonly_ingreso'
                                        ? 'Confirma el estado inicial del vehículo antes de comenzar.'
                                        : 'Gestiona el estado del vehículo.'}
                            </p>
                        </div>

                        {checklistDialog.orderId && (
                            <ChecklistForm
                                orderId={checklistDialog.orderId}
                                onClose={handleChecklistClose}
                                initialData={checklists[parseInt(checklistDialog.orderId)]}
                                mode={checklistDialog.mode}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
