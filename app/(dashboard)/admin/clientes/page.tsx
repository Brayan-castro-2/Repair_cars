'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Users,
    Search,
    Plus,
    MoreHorizontal,
    Phone,
    Mail,
    Building2,
    User,
    Loader2,
    Calendar,
    Wallet,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Car,
    FileText,
    Wrench,
    Crown,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { obtenerClientes } from '@/lib/storage-adapter';
import type { ClienteWithStats, VehiculoDB } from '@/lib/storage-adapter';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ClienteModal } from '@/components/clientes/cliente-modal';

// Helper for formatting currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
};

export default function ClientesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';

    // State
    const [clientes, setClientes] = useState<ClienteWithStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(query);

    const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<ClienteWithStats | undefined>(undefined);
    const [modalTab, setModalTab] = useState('datos');

    // Order Creation State
    const [orderingCliente, setOrderingCliente] = useState<ClienteWithStats | null>(null);

    const handleNewCliente = () => {
        setSelectedCliente(undefined);
        setModalTab('datos');
        setIsModalOpen(true);
    };

    const handleEditCliente = (cliente: ClienteWithStats, tab = 'datos') => {
        setSelectedCliente(cliente);
        setModalTab(tab);
        setIsModalOpen(true);
    };

    const toggleRow = (id: string) => {
        setExpandedClientId(expandedClientId === id ? null : id);
    };

    const handleCreateOrder = (cliente: ClienteWithStats) => {
        // If multiple vehicles, show selector
        if (cliente.vehiculos && cliente.vehiculos.length > 1) {
            setOrderingCliente(cliente);
        } else if (cliente.vehiculos && cliente.vehiculos.length === 1) {
            // If single vehicle, go directly
            router.push(`/recepcion?patente=${cliente.vehiculos[0].patente}`);
        } else {
            // No vehicle, go with RUT
            router.push(`/recepcion?rut=${cliente.rut_dni}`);
        }
    };

    // Sorting Logic
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedClientes = useMemo(() => {
        let sorted = [...clientes];
        if (sortConfig) {
            sorted.sort((a: any, b: any) => {
                // Handle nested properties if needed, here mostly flat or we check
                const aValue = a[sortConfig.key] ?? '';
                const bValue = b[sortConfig.key] ?? '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sorted;
    }, [clientes, sortConfig]);

    // Premium Client Logic
    const premiumClientId = useMemo(() => {
        if (clientes.length === 0) return null;
        const maxOrders = Math.max(...clientes.map(c => c.total_ordenes));
        if (maxOrders === 0) return null;
        const topClients = clientes.filter(c => c.total_ordenes === maxOrders);
        return topClients.length === 1 ? topClients[0].id : null;
    }, [clientes]);

    const confirmOrderVehicle = (patente: string) => {
        router.push(`/recepcion?patente=${patente}`);
        setOrderingCliente(null);
    };

    // Fetch clients
    const fetchClientes = async () => {
        setIsLoading(true);
        try {
            const data = await obtenerClientes(query);
            setClientes(data as unknown as ClienteWithStats[]);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchClientes();
        }, 300);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const total = clientes.length;
        const active = clientes.filter(c => c.total_ordenes > 0).length;
        const totalRevenue = clientes.reduce((acc, c) => acc + c.total_gastado, 0);

        return { total, active, totalRevenue };
    }, [clientes]);

    // Handle Search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);
        if (searchTerm) {
            params.set('q', searchTerm);
        } else {
            params.delete('q');
        }
        router.replace(`/admin/clientes?${params.toString()}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-500" />
                        Gestión de Clientes
                    </h1>
                    <p className="text-slate-400">Administra tu base de datos de clientes CRM</p>
                </div>

                <Button
                    onClick={handleNewCliente}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto shadow-lg shadow-blue-600/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Cliente
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/50 border-slate-800 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Total Clientes</p>
                        <p className="text-2xl font-bold text-white">{kpis.total}</p>
                    </div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Clientes Activos</p>
                        <p className="text-2xl font-bold text-white">{kpis.active}</p>
                    </div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Ingresos Totales (CRM)</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(kpis.totalRevenue)}</p>
                    </div>
                </Card>
            </div>

            {/* Search */}
            <Card className="bg-slate-900/50 border-slate-800 p-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            placeholder="Buscar por nombre, RUT, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-950 border-slate-800 pl-9 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                        />
                    </div>
                    <Button type="submit" variant="secondary" className="border-slate-700 hover:bg-slate-800">
                        Buscar
                    </Button>
                </form>
            </Card>

            {/* CONTENT AREA */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : clientes.length === 0 ? (
                    <div className="text-center p-12 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron clientes</p>
                        <p className="text-sm">Intenta con otra búsqueda o crea uno nuevo.</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE VIEW (CARDS) */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {clientes.map((cliente) => (
                                <Card key={cliente.id} className="bg-slate-900/50 border-slate-800 p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold border border-slate-700">
                                                {cliente.nombre_completo.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{cliente.nombre_completo}</p>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cliente.tipo === 'empresa'
                                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                    {cliente.tipo === 'empresa' ? 'Empresa' : 'Particular'}
                                                </span>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                                                <DropdownMenuItem onClick={() => handleEditCliente(cliente, 'datos')} className="hover:bg-slate-800">Editar Cliente</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEditCliente(cliente, 'historial')} className="hover:bg-slate-800 text-blue-400">Ver Historial de Órdenes</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 py-2 border-t border-slate-800/50 border-b">
                                        <div>
                                            <p className="text-xs text-slate-500">Gastado</p>
                                            <p className="text-sm font-mono text-emerald-400">{formatCurrency(cliente.total_gastado)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Visitas</p>
                                            <p className="text-sm font-mono text-white">{cliente.total_ordenes}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {cliente.telefono || '---'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Active
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* DESKTOP VIEW (TABLE) */}
                        <div className="hidden md:block bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-[#0f172a] text-slate-200 uppercase font-medium border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 cursor-pointer hover:text-blue-400 group" onClick={() => handleSort('nombre_completo')}>
                                                <div className="flex items-center gap-1">
                                                    Cliente
                                                    <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-blue-400" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:text-blue-400 group" onClick={() => handleSort('telefono')}>
                                                <div className="flex items-center gap-1">
                                                    Contacto
                                                    <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-blue-400" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:text-blue-400 group" onClick={() => handleSort('total_gastado')}>
                                                <div className="flex items-center gap-1">
                                                    Estadísticas
                                                    <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-blue-400" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:text-blue-400 group" onClick={() => handleSort('tipo')}>
                                                <div className="flex items-center gap-1">
                                                    Tipo
                                                    <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-blue-400" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {sortedClientes.map((cliente) => (
                                            <Fragment key={cliente.id}>
                                                <tr
                                                    className={`hover:bg-slate-800/30 transition-colors group cursor-pointer border-b border-slate-800/50 ${expandedClientId === cliente.id ? 'bg-slate-800/20' : ''}`}
                                                    onClick={(e) => {
                                                        // Prevent toggle if clicking dropdown or buttons
                                                        if ((e.target as HTMLElement).closest('[role="menuitem"], button')) return;
                                                        toggleRow(cliente.id);
                                                    }}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <div className={`w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors border ${premiumClientId === cliente.id ? 'border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-transparent'}`}>
                                                                    {cliente.nombre_completo.charAt(0).toUpperCase()}
                                                                </div>
                                                                {premiumClientId === cliente.id && (
                                                                    <div className="absolute -top-3 -right-2 animate-bounce">
                                                                        <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500 drop-shadow-md" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-white flex items-center gap-2">
                                                                    {cliente.nombre_completo}
                                                                    {premiumClientId === cliente.id && (
                                                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 font-bold tracking-wider animate-pulse">VIP</span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs text-slate-500 font-mono">{cliente.rut_dni || 'Sin RUT'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-slate-300">
                                                                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                                                {cliente.telefono || '-'}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-500 text-xs">
                                                                <Mail className="w-3.5 h-3.5" />
                                                                {cliente.email || 'Sin email'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2 text-emerald-400 font-mono font-medium">
                                                                <span>{formatCurrency(cliente.total_gastado)}</span>
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {cliente.total_ordenes} {cliente.total_ordenes === 1 ? 'visita' : 'visitas'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${cliente.tipo === 'empresa'
                                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                            }`}>
                                                            {cliente.tipo === 'empresa' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                            {cliente.tipo === 'empresa' ? 'Empresa' : 'Particular'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20 inline-flex items-center gap-1.5">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                            </span>
                                                            Activo
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className={`h-8 w-8 p-0 ${expandedClientId === cliente.id ? 'text-blue-400 rotate-180' : 'text-slate-500'}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleRow(cliente.id);
                                                                }}
                                                            >
                                                                <ChevronDown className="w-4 h-4 transition-transform" />
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700">
                                                                        <span className="sr-only">Abrir menú</span>
                                                                        <MoreHorizontal className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => handleEditCliente(cliente, 'datos')} className="hover:bg-slate-800 cursor-pointer">
                                                                        Editar Cliente
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleCreateOrder(cliente)} className="hover:bg-slate-800 cursor-pointer text-blue-400 font-medium">
                                                                        Crear Orden
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedClientId === cliente.id && (
                                                    <tr className="bg-slate-950/50">
                                                        <td colSpan={6} className="p-0 border-b border-slate-800">
                                                            <div className="p-6 border-l-2 border-blue-500 ml-6 mr-6 mb-6 mt-2 rounded-r-xl bg-slate-900/50">
                                                                <Tabs defaultValue="vehiculos" className="w-full">
                                                                    <TabsList className="bg-slate-800/50 border border-slate-700/50 mb-4">
                                                                        <TabsTrigger value="datos">Datos Personales</TabsTrigger>
                                                                        <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
                                                                        <TabsTrigger value="historial">Historial ({cliente.total_ordenes})</TabsTrigger>
                                                                    </TabsList>

                                                                    <TabsContent value="datos" className="space-y-4">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div>
                                                                                <label className="text-xs text-slate-500 uppercase tracking-wider">Email</label>
                                                                                <p className="text-slate-300">{cliente.email || 'No registrado'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs text-slate-500 uppercase tracking-wider">Teléfono</label>
                                                                                <p className="text-slate-300">{cliente.telefono || 'No registrado'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs text-slate-500 uppercase tracking-wider">Dirección</label>
                                                                                <p className="text-slate-300">{cliente.direccion || 'No registrada'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs text-slate-500 uppercase tracking-wider">Notas</label>
                                                                                <p className="text-slate-300">{cliente.notas || '-'}</p>
                                                                            </div>
                                                                        </div>
                                                                    </TabsContent>

                                                                    <TabsContent value="vehiculos">
                                                                        <div className="space-y-3">
                                                                            <div className="flex justify-between items-center mb-2">
                                                                                <h4 className="text-sm font-semibold text-slate-400">Vehículos Registrados</h4>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="h-8 border-dashed border-slate-600 text-slate-400 hover:text-white"
                                                                                    onClick={() => handleEditCliente(cliente, 'vehiculos')}
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                                                                    Agregar Vehículo
                                                                                </Button>
                                                                            </div>

                                                                            {!cliente.vehiculos || cliente.vehiculos.length === 0 ? (
                                                                                <p className="text-sm text-slate-500 italic">No hay vehículos registrados</p>
                                                                            ) : (
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {cliente.vehiculos.map((v: any) => (
                                                                                        <div key={v.id} className="flex items-center p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                                                                            <Car className="w-8 h-8 text-slate-500 p-1.5 bg-slate-700/30 rounded-md mr-3" />
                                                                                            <div>
                                                                                                <p className="text-sm font-medium text-white">{v.marca} {v.modelo}</p>
                                                                                                <p className="text-xs font-mono text-blue-400">{v.patente}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </TabsContent>

                                                                    <TabsContent value="historial">
                                                                        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                                                            <div>
                                                                                <p className="text-sm text-slate-300">Para ver el historial detallado, usa la opción de editar.</p>
                                                                            </div>
                                                                            <Button variant="secondary" size="sm" onClick={() => handleEditCliente(cliente, 'historial')}>
                                                                                Ver Historial Completo
                                                                            </Button>
                                                                        </div>
                                                                    </TabsContent>
                                                                </Tabs>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <ClienteModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedCliente(undefined);
                }}
                onSave={fetchClientes}
                cliente={selectedCliente}
                defaultTab={modalTab}
            />

            <Dialog open={!!orderingCliente} onOpenChange={(open) => !open && setOrderingCliente(null)}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Seleccionar Vehículo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-slate-400">
                            El cliente {orderingCliente?.nombre_completo} tiene varios vehículos. Selecciona uno para crear la orden.
                        </p>
                        <div className="grid gap-3">
                            {orderingCliente?.vehiculos?.map((v: any) => (
                                <button
                                    key={v.id}
                                    onClick={() => confirmOrderVehicle(v.patente)}
                                    className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-blue-600/20 hover:border-blue-500/50 transition-all text-left group"
                                >
                                    <div>
                                        <p className="font-semibold text-white group-hover:text-blue-200">{v.marca} {v.modelo}</p>
                                        <p className="text-xs font-mono text-slate-500 group-hover:text-blue-300">{v.patente}</p>
                                    </div>
                                    <ChevronUp className="w-5 h-5 text-slate-500 group-hover:text-blue-400 rotate-90" />
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
