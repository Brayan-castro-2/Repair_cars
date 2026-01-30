'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { crearCliente, actualizarCliente, ClienteWithStats } from '@/lib/storage-adapter';
import { Loader2, Plus, Phone, Mail, FileText, Calendar, ExternalLink } from 'lucide-react';

interface ClienteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    cliente?: ClienteWithStats;
    defaultTab?: string;
}

export function ClienteModal({ isOpen, onClose, onSave, cliente, defaultTab = 'datos' }: ClienteModalProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Form State
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');
    const [rut, setRut] = useState('');
    const [tipo, setTipo] = useState<'persona' | 'empresa'>('persona');
    const [direccion, setDireccion] = useState('');
    const [notas, setNotas] = useState('');

    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab || 'datos');
        }
    }, [isOpen, defaultTab]);

    useEffect(() => {
        if (cliente) {
            setNombre(cliente.nombre_completo);
            setTelefono(cliente.telefono?.replace('+569', '') || '');
            setEmail(cliente.email || '');
            setRut(cliente.rut_dni || '');
            setTipo((cliente.tipo as 'persona' | 'empresa') || 'persona');
            setDireccion(cliente.direccion || '');
            setNotas(cliente.notas || '');
            setActiveTab('datos'); // Default to datos when opening
        } else {
            // Reset for new client
            setNombre('');
            setTelefono('');
            setEmail('');
            setRut('');
            setTipo('persona');
            setDireccion('');
            setNotas('');
            setActiveTab('datos');
        }
    }, [cliente, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre || !telefono) return;

        setIsSubmitting(true);
        try {
            const cleanPhone = telefono.replace(/\D/g, '');
            const finalPhone = cleanPhone.length > 0 ? `+569${cleanPhone}` : '';

            const payload = {
                nombre_completo: nombre,
                telefono: finalPhone,
                email: email || undefined,
                rut_dni: rut || undefined,
                tipo,
                direccion: direccion || undefined,
                notas: notas || undefined,
            };

            if (cliente) {
                await actualizarCliente(cliente.id, payload);
            } else {
                await crearCliente(payload);
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving client:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate History for Display
    const history = cliente?.vehiculos?.flatMap(v =>
        (v.ordenes || []).map(o => ({
            ...o,
            vehiculo_str: `${v.marca} ${v.modelo} (${v.patente})`
        }))
    ).sort((a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime()) || [];

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('es-CL');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{cliente ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
                    <DialogDescription>
                        {cliente ? 'Modifica los datos del cliente o revisa su historial.' : 'Ingresa los datos del nuevo cliente.'}
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-slate-900 border-slate-800 w-full justify-start">
                        <TabsTrigger value="datos">Datos Personales</TabsTrigger>
                        {cliente && <TabsTrigger value="historial">Historial de Órdenes</TabsTrigger>}
                        {cliente && <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="datos" className="space-y-4 py-4">
                        <form id="cliente-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre Completo *</Label>
                                    <Input
                                        id="nombre"
                                        value={nombre}
                                        onChange={e => setNombre(e.target.value)}
                                        required
                                        className="bg-slate-900/50 border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefono">Teléfono (WhatsApp)</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500 text-sm">
                                            +569
                                        </div>
                                        <Input
                                            id="telefono"
                                            value={telefono}
                                            onChange={e => setTelefono(e.target.value)}
                                            required
                                            className="bg-slate-900/50 border-slate-800 pl-12"
                                            placeholder="12345678"
                                            maxLength={8}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="bg-slate-900/50 border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rut">RUT/DNI</Label>
                                    <Input
                                        id="rut"
                                        value={rut}
                                        onChange={e => setRut(e.target.value)}
                                        className="bg-slate-900/50 border-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de Cliente</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="persona"
                                            checked={tipo === 'persona'}
                                            onChange={() => setTipo('persona')}
                                            className="accent-blue-500"
                                        />
                                        <span>Persona</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="empresa"
                                            checked={tipo === 'empresa'}
                                            onChange={() => setTipo('empresa')}
                                            className="accent-blue-500"
                                        />
                                        <span>Empresa</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="direccion">Dirección</Label>
                                <Input
                                    id="direccion"
                                    value={direccion}
                                    onChange={e => setDireccion(e.target.value)}
                                    className="bg-slate-900/50 border-slate-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notas">Notas Internas</Label>
                                <Textarea
                                    id="notas"
                                    value={notas}
                                    onChange={e => setNotas(e.target.value)}
                                    className="bg-slate-900/50 border-slate-800 min-h-[100px]"
                                />
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="historial" className="py-4">
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-lg">
                                No hay órdenes registradas para este cliente.
                            </div>
                        ) : (
                            <div className="rounded-md border border-slate-800 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-900">
                                        <TableRow>
                                            <TableHead className="text-slate-300">Fecha</TableHead>
                                            <TableHead className="text-slate-300">Vehículo</TableHead>
                                            <TableHead className="text-slate-300">Servicio</TableHead>
                                            <TableHead className="text-right text-slate-300">Total</TableHead>
                                            <TableHead className="text-right text-slate-300">Acción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((order: any) => (
                                            <TableRow key={order.id} className="hover:bg-slate-900/50">
                                                <TableCell className="font-mono text-xs">{formatDate(order.fecha_ingreso)}</TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-semibold">{order.vehiculo_str}</div>
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[150px] truncate" title={order.descripcion_ingreso}>
                                                    {order.descripcion_ingreso || 'Mantención General'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-emerald-400">
                                                    {formatCurrency(order.precio_total)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            onClose();
                                                            router.push(`/admin/ordenes/editar/${order.id}`);
                                                        }}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <ExternalLink className="w-4 h-4 text-blue-400" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="vehiculos" className="py-4">
                        <div className="rounded-md border border-slate-800">
                            <Table>
                                <TableHeader className="bg-slate-900">
                                    <TableRow>
                                        <TableHead>Patente</TableHead>
                                        <TableHead>Vehículo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cliente?.vehiculos?.map((v: any) => (
                                        <TableRow key={v.patente}>
                                            <TableCell className="font-mono font-bold">{v.patente}</TableCell>
                                            <TableCell>{v.marca} {v.modelo} ({v.anio})</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                    {activeTab === 'datos' && (
                        <>
                            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="border-slate-700">
                                Cancelar
                            </Button>
                            <Button form="cliente-form" type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </Button>
                        </>
                    )}
                    {activeTab !== 'datos' && (
                        <Button variant="outline" onClick={onClose} className="border-slate-700">
                            Cerrar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
