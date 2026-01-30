'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { buscarVehiculoPorPatente, crearVehiculo, crearOrden, obtenerOrdenes, obtenerCitas, actualizarCita, subirImagen, obtenerServiciosFrecuentes, buscarClientePorRut } from '@/lib/storage-adapter';
import { consultarPatenteGetAPI, isGetAPIConfigured } from '@/lib/getapi-service';
import imageCompression from 'browser-image-compression';
import { DebtAlertModal } from '@/components/reception/debt-alert-modal';
import type { OrdenDB, CitaDB } from '@/lib/storage-adapter';
import { useQueryClient } from '@tanstack/react-query';
import {
    Loader2,
    Calendar,
    Wallet,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import ChecklistForm from '@/components/ordenes/checklist-form';

const MOCK_DB: Record<string, { marca: string; modelo: string; anio: string; motor: string }> = {
    PROFE1: { marca: 'Nissan', modelo: 'V16', anio: '2010', motor: '1.6 Twin Cam' },
    BBBB10: { marca: 'Toyota', modelo: 'Yaris', anio: '2018', motor: '1.5' },
    TEST01: { marca: 'Chevrolet', modelo: 'Sail', anio: '2020', motor: '1.4' },
};

// Eliminamos la constante estática SERVICIOS_FRECUENTES
// Se cargará desde la BD en el componente

type Servicio = { descripcion: string; precio: string };
type FocusTarget = { index: number; field: 'desc' | 'precio' } | null;

function formatMilesConPunto(value: string) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function buildKmServiceDescripcion(kmActual: string, kmNuevo: string) {
    const a = kmActual ? `${formatMilesConPunto(kmActual)} KM` : 'KM actual';
    const n = kmNuevo ? `${formatMilesConPunto(kmNuevo)} KM` : 'KM nuevo';
    return `KM: ${a} → ${n}`;
}

function normalizePatente(v: string) {
    return String(v || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6);
}

function parsePrecio(v: string) {
    const cleaned = String(v || '').replace(/[^0-9]/g, '');
    return cleaned ? Number(cleaned) : 0;
}

function moneyCL(n: number) {
    return (Number.isFinite(n) ? n : 0).toLocaleString('es-CL');
}

function nowCL() {
    return new Date().toLocaleString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

// Función para comprimir imágenes antes de subir
async function comprimirImagen(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1, // Máximo 1MB
        maxWidthOrHeight: 1920, // Máximo 1920px de ancho/alto
        useWebWorker: true,
        fileType: 'image/jpeg', // Convertir a JPEG para mejor compresión
    };

    try {
        console.log(`📸 Comprimiendo imagen: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        const compressedFile = await imageCompression(file, options);
        console.log(`✅ Imagen comprimida: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)}MB)`);
        return compressedFile;
    } catch (error) {
        console.error('❌ Error al comprimir imagen:', error);
        // Si falla la compresión, retornar el archivo original
        return file;
    }
}

function RecepcionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [fechaHora, setFechaHora] = useState(nowCL());
    const [mecanico, setMecanico] = useState('Técnico en Turno');
    const [isLoadingCita, setIsLoadingCita] = useState(false);

    // Form states - Consolidated
    const [patente, setPatente] = useState('');
    const [marca, setMarca] = useState('');
    const [modelo, setModelo] = useState('');
    const [anio, setAnio] = useState('');
    const [motor, setMotor] = useState('');

    const [kmEnabled, setKmEnabled] = useState(false);
    const [kmActual, setKmActual] = useState('');
    const [kmNuevo, setKmNuevo] = useState('');
    const [kmServiceIndex, setKmServiceIndex] = useState<number | null>(null);
    const [showAllServices, setShowAllServices] = useState(false);

    const [vehiculoLocked, setVehiculoLocked] = useState(false);
    const [estadoBusqueda, setEstadoBusqueda] = useState('');
    const [isBuscando, setIsBuscando] = useState(false);

    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteWhatsapp, setClienteWhatsapp] = useState('');
    const [clienteRut, setClienteRut] = useState('');
    const [email, setEmail] = useState('');

    const [detallesVehiculo, setDetallesVehiculo] = useState('');
    const [fotos, setFotos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const [formaPago, setFormaPago] = useState('efectivo');

    // Servicios Frecuentes V3
    const [serviciosFrecuentesDB, setServiciosFrecuentesDB] = useState<{ descripcion: string, precio_base: number }[]>([]);

    const [servicios, setServicios] = useState<Servicio[]>([
        { descripcion: '', precio: '' },
    ]);
    const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGuardando, setIsGuardando] = useState(false); // New state for saving
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Multi-step State
    const [step, setStep] = useState<'form' | 'checklist'>('form');
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

    // Debt alert modal state
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [debtData, setDebtData] = useState<{
        totalDebt: number;
        debtOrders: OrdenDB[];
        lastVisit?: { date: string; service: string };
    } | null>(null);

    // Efecto para procesar params de URL (redirección desde Clientes)
    useEffect(() => {
        const patenteParam = searchParams.get('patente');
        const rutParam = searchParams.get('rut');

        if (patenteParam && !patente) {
            setPatente(patenteParam);
            // Pequeño delay para asegurar que el estado se actualice
            setTimeout(() => buscarPatente(patenteParam), 100);
        } else if (rutParam && !clienteRut) {
            setClienteRut(rutParam);
            setTimeout(() => buscarPorRut(rutParam), 100);
        }
    }, [searchParams]);

    // Load configuration on mount
    useEffect(() => {
        const storedMecanico = localStorage.getItem('mecanico_nombre');
        if (storedMecanico) setMecanico(storedMecanico);

        // Fetch Frequent Services from DB
        const fetchServicios = async () => {
            const data = await obtenerServiciosFrecuentes();
            if (data && data.length > 0) {
                setServiciosFrecuentesDB(data);
            } else {
                // Fallback defaults if DB is empty
                setServiciosFrecuentesDB([
                    { descripcion: 'DPF Electrónico', precio_base: 0 },
                    { descripcion: 'DPF Físico', precio_base: 0 },
                    { descripcion: 'Scanner', precio_base: 0 },
                    { descripcion: 'AdBlue OFF', precio_base: 0 },
                    { descripcion: 'Regeneración', precio_base: 0 },
                ]);
            }
        };
        fetchServicios();
    }, []);
    useEffect(() => {
        const citaId = searchParams.get('citaId');
        if (citaId) {
            const loadCita = async () => {
                setIsLoadingCita(true);
                try {
                    // Fetch all appointments (temporary solution, ideally fetch by ID)
                    const citas = await obtenerCitas();
                    const cita = citas.find(c => c.id === Number(citaId));

                    if (cita) {
                        setPatente(cita.patente_vehiculo || '');
                        setClienteNombre(cita.clientes?.nombre_completo || '');
                        setClienteWhatsapp(cita.clientes?.telefono || '');

                        // Parse services/notes
                        const serviceDesc = cita.notas || cita.titulo || '';

                        // Pre-fill services
                        if (serviceDesc) {
                            // Split by comma if multiple services
                            const serviceParts = serviceDesc.split(',').map(s => s.trim());
                            const mappedServices = serviceParts.map(desc => ({ descripcion: desc, precio: '' }));
                            setServicios(mappedServices);
                        }

                        // Trigger vehicle lookup if we have a patente
                        if (cita.patente_vehiculo) {
                            // Use existing search logic (will be triggered manually or we can call search function here)
                            // For now, let's just set the state and let the user verify/search
                        }
                    }
                } catch (error) {
                    console.error("Error loading appointment:", error);
                } finally {
                    setIsLoadingCita(false);
                }
            };
            loadCita();
        }
    }, [searchParams]);




    // Ref para auto-focus en KM Actual
    const kmActualInputRef = useRef<HTMLInputElement>(null);

    const descRefs = useRef<Array<HTMLInputElement | null>>([]);
    const precioRefs = useRef<Array<HTMLInputElement | null>>([]);

    const total = useMemo(() => {
        return servicios.reduce((acc, s) => acc + parsePrecio(s.precio), 0);
    }, [servicios]);

    useEffect(() => {
        const id = window.setInterval(() => setFechaHora(nowCL()), 1000);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const raw = localStorage.getItem('usuario_actual');
        if (!raw) return;
        try {
            const u = JSON.parse(raw);
            setMecanico(u?.nombre_completo || u?.nombre || u?.email || 'Técnico en Turno');
        } catch {
            setMecanico(raw);
        }
    }, []);

    useEffect(() => {
        if (user?.name) {
            setMecanico(user.name);
        }
    }, [user?.name]);

    useEffect(() => {
        if (!focusTarget) return;
        const { index, field } = focusTarget;
        const el = field === 'precio' ? precioRefs.current[index] : descRefs.current[index];
        if (el) {
            el.focus();
            if (field === 'precio') el.select();
        }
        setFocusTarget(null);
    }, [focusTarget, servicios.length]);

    // Check for debts when phone number changes (after typing complete phone)
    useEffect(() => {
        const cleanPhone = clienteWhatsapp.replace(/\D/g, '');
        // Solo verificar si tiene al menos 8 dígitos (número chileno mínimo)
        if (cleanPhone.length >= 8) {
            const timer = setTimeout(() => {
                checkForDebts(undefined, cleanPhone);
            }, 300); // Debounce reducido a 300ms para respuesta más rápida

            return () => clearTimeout(timer);
        }
    }, [clienteWhatsapp]);


    const handleRutKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarPorRut();
        }
    };

    const buscarPorRut = async (rutOverride?: string) => {
        const r = (rutOverride || clienteRut).trim();
        if (!r) return;

        setIsBuscando(true);
        setEstadoBusqueda('🔍 Buscando cliente por RUT...');

        try {
            const cliente = await buscarClientePorRut(r);
            if (cliente) {
                setClienteNombre(cliente.nombre_completo);
                setClienteWhatsapp(cliente.telefono || '');
                setEmail(cliente.email || '');
                setClienteRut(cliente.rut_dni || '');
                setEstadoBusqueda(`✅ Cliente encontrado: ${cliente.nombre_completo}`);
            } else {
                setEstadoBusqueda('⚠️ Cliente no encontrado. Completa los datos.');
            }
        } catch (error) {
            console.error('Error buscando cliente:', error);
            setEstadoBusqueda('❌ Error al buscar cliente.');
        } finally {
            setIsBuscando(false);
        }
    };

    const buscarPatente = async (patenteOverride?: string) => {
        const pInput = patenteOverride || patente;
        const p = normalizePatente(pInput);

        if (!patenteOverride) setPatente(p);

        if (!p) {
            setEstadoBusqueda('');
            setMarca('');
            setModelo('');
            setAnio('');
            setMotor('');
            setVehiculoLocked(false);
            return;
        }

        setIsBuscando(true);
        setEstadoBusqueda('🔍 Buscando patente...');

        try {
            // 1. Primero buscar en localStorage
            console.log(`[Búsqueda] Paso 1: Buscando ${p} en localStorage...`);
            const vehiculoLocal = await buscarVehiculoPorPatente(p);
            if (vehiculoLocal) {
                console.log(`[Búsqueda] ✅ Encontrado en BD:`, vehiculoLocal);

                // Solo sobrescribir si los datos de la BD son válidos (no "Por definir")
                const marcaValida = vehiculoLocal.marca && vehiculoLocal.marca !== 'Por definir';
                const modeloValido = vehiculoLocal.modelo && vehiculoLocal.modelo !== 'Por definir';

                if (marcaValida) setMarca(vehiculoLocal.marca);
                if (modeloValido) setModelo(vehiculoLocal.modelo);
                if (vehiculoLocal.anio && vehiculoLocal.anio !== '2026') setAnio(vehiculoLocal.anio);
                if (vehiculoLocal.motor) setMotor(vehiculoLocal.motor);

                setVehiculoLocked(false);

                if (marcaValida && modeloValido) {
                    setEstadoBusqueda(`✅ Vehículo encontrado: ${vehiculoLocal.marca} ${vehiculoLocal.modelo} (${vehiculoLocal.anio})`);

                    // V3: Auto-fill client data if available
                    if (vehiculoLocal.clientes) {
                        const c = vehiculoLocal.clientes;
                        setClienteNombre(c.nombre_completo || '');
                        // Ensure we default to empty string if undefined/null
                        setClienteWhatsapp(c.telefono || '');
                        setEmail(c.email || '');
                        setClienteRut(c.rut_dni || '');
                        console.log('👤 Datos de cliente auto-completados:', c.nombre_completo);
                    }

                    // Check for debts
                    checkForDebts(p);
                } else {
                    setEstadoBusqueda(`⚠️ Vehículo encontrado pero sin datos completos. Completa manualmente.`);
                }

                setIsBuscando(false);
                return;
            }
            console.log(`[Búsqueda] ❌ No encontrado en localStorage`);

            // 2. Si no está en localStorage, consultar GetAPI
            console.log(`[Búsqueda] Paso 2: Verificando configuración de GetAPI...`);
            const apiConfigured = isGetAPIConfigured();
            console.log(`[Búsqueda] GetAPI configurada: ${apiConfigured}`);

            if (apiConfigured) {
                try {
                    console.log(`[Búsqueda] Consultando GetAPI para patente ${p}...`);
                    const vehiculoAPI = await consultarPatenteGetAPI(p);
                    if (vehiculoAPI) {
                        console.log(`[Búsqueda] ✅ Encontrado en GetAPI:`, vehiculoAPI);
                        setMarca(vehiculoAPI.marca);
                        setModelo(vehiculoAPI.modelo);
                        setAnio(vehiculoAPI.anio);
                        setMotor(vehiculoAPI.motor || '');
                        setVehiculoLocked(false);
                        setEstadoBusqueda(`✅ Vehículo encontrado en GetAPI: ${vehiculoAPI.marca} ${vehiculoAPI.modelo} (${vehiculoAPI.anio})`);

                        // Check for debts
                        checkForDebts(p);

                        setIsBuscando(false);
                        return;
                    }
                    console.log(`[Búsqueda] ❌ No encontrado en GetAPI`);
                } catch (error) {
                    // Si hay error de API (límite, key inválida, etc), mostrar mensaje pero continuar con fallback
                    console.error(`[Búsqueda] ⚠️ Error en GetAPI:`, error);
                    if (error instanceof Error) {
                        setEstadoBusqueda(`⚠️ GetAPI no disponible. Completa los datos manualmente.`);
                    }
                }
            } else {
                console.warn(`[Búsqueda] ⚠️ GetAPI no configurada.`);
                setEstadoBusqueda(`⚠️ GetAPI no configurada. Completa los datos manualmente.`);
            }

            // 3. Fallback a datos mock (para testing)
            const found = MOCK_DB[p];
            if (found) {
                setMarca(found.marca);
                setModelo(found.modelo);
                setAnio(found.anio);
                setMotor(found.motor);
                setVehiculoLocked(false);
                setEstadoBusqueda(`✅ Vehículo encontrado (datos de prueba): ${found.marca} ${found.modelo} (${found.anio})`);

                // Check for debts
                checkForDebts(p);
            } else {
                // 4. No encontrado en ningún lado
                setMarca('');
                setModelo('');
                setAnio('');
                setMotor('');
                setVehiculoLocked(false);
                setEstadoBusqueda('❌ Patente no encontrada. Completa los datos manualmente.');
            }
        } finally {
            setIsBuscando(false);
        }
    };

    // Check for debts after finding vehicle or entering phone
    const checkForDebts = async (patente?: string, phone?: string) => {
        try {
            console.log(`[Debt Check] Checking debts for patente: ${patente}, phone: ${phone}`);
            const allOrders = await obtenerOrdenes();

            // Filter orders for this patente OR phone
            const vehicleOrders = allOrders.filter(order => {
                const matchesPatente = patente && order.patente_vehiculo?.toUpperCase() === patente.toUpperCase();
                const matchesPhone = phone && order.cliente_telefono &&
                    order.cliente_telefono.replace(/\D/g, '') === phone.replace(/\D/g, '');
                return matchesPatente || matchesPhone;
            });

            // V3 Debt check
            const ordersWithDebt = vehicleOrders.filter(order => {
                // Check if 'debe' is in metodo_pago (string) or implied
                // Cast to any to avoid strict type mismatch if using legacy types locally
                const o = order as any;
                if (o.metodo_pago === 'debe') return true;
                if (o.metodos_pago && Array.isArray(o.metodos_pago)) {
                    return o.metodos_pago.some((mp: any) => mp.metodo === 'debe');
                }
                return false;
            });

            const totalDebt = ordersWithDebt.reduce((sum, order) => {
                const o = order as any;
                if (o.metodo_pago === 'debe') return sum + (o.precio_total || 0);
                // Legacy support
                if (o.metodos_pago) {
                    return sum + (o.metodos_pago.filter((mp: any) => mp.metodo === 'debe').reduce((a: number, b: any) => a + b.monto, 0) || 0);
                }
                return sum;
            }, 0);

            // Find last visit (most recent order)
            let lastVisit;
            if (vehicleOrders.length > 0) {
                const sorted = [...vehicleOrders].sort((a, b) =>
                    new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime()
                );
                const lastOrder = sorted[0];
                lastVisit = {
                    date: lastOrder.fecha_ingreso,
                    service: lastOrder.detalle_trabajos || lastOrder.descripcion_ingreso || 'Servicio no especificado'
                };
            }

            console.log(`[Debt Check] Found ${ordersWithDebt.length} orders with debt, total: $${totalDebt}`);

            // Show modal if there's debt or visit history
            if (totalDebt > 0 || lastVisit) {
                setDebtData({
                    totalDebt,
                    debtOrders: ordersWithDebt,
                    lastVisit
                });
                setIsDebtModalOpen(true);
            }
        } catch (error) {
            console.error('[Debt Check] Error checking debts:', error);
        }
    };


    const agregarFila = (prefill?: { descripcion?: string }) => {
        setServicios((prev) => {
            const next = [...prev, { descripcion: prefill?.descripcion || '', precio: '' }];
            const idx = next.length - 1;
            setFocusTarget({ index: idx, field: prefill?.descripcion ? 'precio' : 'desc' });
            return next;
        });
    };

    const activarServicioKm = () => {
        setKmEnabled(true);
        setServicios((prev) => {
            const emptyIndex = prev.findIndex((s) => {
                const d = s.descripcion.trim();
                const p = parsePrecio(s.precio);
                return !d && p === 0;
            });

            const kmDesc = buildKmServiceDescripcion(kmActual, kmNuevo);

            if (emptyIndex >= 0) {
                const next = prev.map((s, i) => (i === emptyIndex ? { ...s, descripcion: kmDesc } : s));
                setKmServiceIndex(emptyIndex);
                return next;
            }

            const next = [...prev, { descripcion: kmDesc, precio: '' }];
            const idx = next.length - 1;
            setKmServiceIndex(idx);
            return next;
        });

        // Auto-focus en KM Actual después de que el DOM se actualice
        setTimeout(() => {
            if (kmActualInputRef.current) {
                kmActualInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                kmActualInputRef.current.focus();
            }
        }, 100);
    };

    const desactivarServicioKm = () => {
        setKmEnabled(false);
        setKmActual('');
        setKmNuevo('');
        setServicios((prev) => {
            if (kmServiceIndex === null) return prev;
            const next = prev.filter((_, i) => i !== kmServiceIndex);
            return next.length ? next : [{ descripcion: '', precio: '' }];
        });
        setKmServiceIndex(null);
    };

    useEffect(() => {
        if (!kmEnabled) return;
        if (kmServiceIndex === null) return;

        setServicios((prev) => {
            if (kmServiceIndex < 0 || kmServiceIndex >= prev.length) return prev;
            const desired = buildKmServiceDescripcion(kmActual, kmNuevo);
            const current = prev[kmServiceIndex]?.descripcion || '';
            if (current === desired) return prev;
            return prev.map((s, i) => (i === kmServiceIndex ? { ...s, descripcion: desired } : s));
        });
    }, [kmEnabled, kmServiceIndex, kmActual, kmNuevo]);

    const agregarServicioFrecuente = (descripcion: string) => {
        const desc = descripcion.trim();
        if (!desc) return;

        setServicios((prev) => {
            const emptyIndex = prev.findIndex((s) => {
                const d = s.descripcion.trim();
                const p = parsePrecio(s.precio);
                return !d && p === 0;
            });

            if (emptyIndex >= 0) {
                const next = prev.map((s, i) => (i === emptyIndex ? { ...s, descripcion: desc } : s));
                setFocusTarget({ index: emptyIndex, field: 'precio' });
                return next;
            }

            const next = [...prev, { descripcion: desc, precio: '' }];
            setFocusTarget({ index: next.length - 1, field: 'precio' });
            return next;
        });
    };

    const eliminarFila = (index: number) => {
        setServicios((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length ? next : [{ descripcion: '', precio: '' }];
        });

        if (kmServiceIndex !== null) {
            if (index === kmServiceIndex) {
                setKmEnabled(false);
                setKmActual('');
                setKmNuevo('');
                setKmServiceIndex(null);
            } else if (index < kmServiceIndex) {
                setKmServiceIndex(kmServiceIndex - 1);
            }
        }
    };

    const updateServicio = (index: number, patch: Partial<Servicio>) => {
        setServicios((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    };

    const handleNextStep = async () => {
        const p = normalizePatente(patente);
        if (!user) {
            alert('Sesión no encontrada. Inicia sesión nuevamente.');
            return;
        }
        if (!p) {
            alert('Ingresa una patente.');
            return;
        }
        if (!marca || !modelo || !anio) {
            alert('Completa los datos del vehículo (Marca, Modelo, Año).');
            return;
        }
        if (kmEnabled) {
            if (!kmActual || parsePrecio(kmActual) <= 0 || !kmNuevo || parsePrecio(kmNuevo) <= 0) {
                alert('Ingresa KM actual y KM nuevo.');
                return;
            }
            if (kmServiceIndex === null) {
                alert('Activa el servicio KM para poder cobrarlo.');
                return;
            }
        }

        const serviciosForOrder = servicios
            .map((s) => ({ descripcion: s.descripcion.trim(), precio: parsePrecio(s.precio) }))
            .filter((s) => s.descripcion || s.precio);

        if (serviciosForOrder.length === 0) {
            alert('Agrega al menos un servicio.');
            return;
        }

        // Descripción concisa para la columna Motivo (Ej: "KM, DPF")
        const shortDescription = serviciosForOrder
            .map((s) => {
                const d = (s.descripcion || '').toUpperCase();
                if (d.includes('KM') || d.includes('KILOMETRAJE')) return 'KM';
                if (d.includes('DPF')) return 'DPF';
                if (d.includes('SCANNER')) return 'Scanner';
                if (d.includes('ADBLUE')) return 'AdBlue';
                if (d.includes('EGR')) return 'EGR';
                if (d.includes('REGENERACION') || d.includes('REGENERACIÓN')) return 'Regeneración';
                return s.descripcion;
            })
            // Unique values only
            .filter((value, index, self) => self.indexOf(value) === index)
            .join(', ');

        const motorInfo = motor && motor.trim() ? `Motor: ${motor}` : '';
        const descripcionIngreso = [motorInfo, shortDescription].filter(Boolean).join(' - ');

        // Detalle completo con precios para el registro interno (detalle_trabajos)
        const detalleServicios = serviciosForOrder
            .map((s) => `- ${s.descripcion || 'Servicio'}: $${moneyCL(s.precio)}`)
            .join('\n');

        // Validar campos obligatorios del vehículo
        if (!marca || marca.trim() === '' || marca === 'Por definir') {
            alert('Por favor ingresa la Marca del vehículo.');
            return;
        }
        if (!modelo || modelo.trim() === '' || modelo === 'Por definir') {
            alert('Por favor ingresa el Modelo del vehículo.');
            return;
        }
        if (!anio || anio.trim() === '') {
            alert('Por favor ingresa el Año del vehículo.');
            return;
        }

        setIsGuardando(true);
        try {
            // Construir número completo de WhatsApp con prefijo +569
            const whatsappCompleto = clienteWhatsapp ? `+569${clienteWhatsapp}` : undefined;

            console.log('📝 Creando orden con lógica V3...', { patente: p, marca, modelo });

            const orden = await crearOrden({
                patente_vehiculo: p,
                descripcion_ingreso: descripcionIngreso,
                detalle_trabajos: detalleServicios, // Descripción detallada con precios
                creado_por: user.id,
                estado: 'pendiente',
                asignado_a: user.id,

                // Client Data
                cliente_nombre: clienteNombre || undefined,
                cliente_telefono: whatsappCompleto,
                cliente_email: email || undefined,
                cliente_rut: clienteRut || undefined,

                // Vehicle Data (for auto-creation)
                vehiculo_marca: marca.trim(),
                vehiculo_modelo: modelo.trim(),
                vehiculo_anio: anio.trim(),
                vehiculo_motor: motor?.trim() || undefined,
                vehiculo_color: '-',

                precio_total: total || undefined,
                fotos: fotos.length ? fotos : undefined,
                detalles_vehiculo: detallesVehiculo.trim() || undefined,
            });

            const currentCitaId = searchParams.get('citaId');

            if (orden) {
                // Si venimos de una cita, actualizar su estado
                if (currentCitaId) {
                    try {
                        await actualizarCita(Number(currentCitaId), { estado: 'confirmada' });
                        console.log(`✅ Cita #${currentCitaId} marcada como confirmada`);
                    } catch (err) {
                        console.error('Error actualizando estado de cita:', err);
                    }
                }
            }

            if (!orden) {
                alert('No se pudo crear la orden.');
                return;
            }

            setCreatedOrderId(orden.id.toString());
            setStep('checklist');
            window.scrollTo(0, 0); // Scroll to top

            // Invalidar caché para que la nueva orden aparezca inmediatamente
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            await queryClient.invalidateQueries({ queryKey: ['appointments'] });

        } catch (error) {
            console.error('Error al crear orden:', error);
            alert('Ocurrió un error inesperado.');
        } finally {
            setIsGuardando(false);
        }
    };

    const limpiar = () => {
        setPatente('');
        setMarca('');
        setModelo('');
        setAnio('');
        setMotor('');
        setKmEnabled(false);
        setKmActual('');
        setKmNuevo('');
        setKmServiceIndex(null);
        setVehiculoLocked(true);
        setEstadoBusqueda('');
        setClienteNombre('');
        setClienteWhatsapp('');
        setClienteRut('');
        setEmail('');
        setDetallesVehiculo('');
        setFotos([]);
        setServicios([{ descripcion: '', precio: '' }]);
        setStep('form'); // Reset to form step
        setCreatedOrderId(null); // Clear created order ID
    };

    // Renderizado del Checklist
    if (step === 'checklist' && createdOrderId) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Checklist de Ingreso 📝</h2>
                    <p className="text-slate-400">Completa la inspección visual del vehículo.</p>
                </div>

                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                    <ChecklistForm
                        orderId={createdOrderId}
                        onClose={() => {
                            router.push('/admin/ordenes'); // Redirect after checklist completion
                            limpiar(); // Clear form after redirect
                        }}
                    />
                </div>
            </div>
        );
    }

    // Renderizado original (Formulario)
    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 md:px-0">
            {successMsg ? (
                <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2">
                        <span className="font-semibold">{successMsg}</span>
                    </div>
                </div>
            ) : null}

            <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 px-4 py-4 md:px-6 md:py-5 shadow">
                <div className="text-lg md:text-xl font-bold text-white">Nueva Orden de Trabajo</div>
                <div className="mt-1 text-xs md:text-sm text-blue-100">{fechaHora}</div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">RESPONSABLES</div>
                <label className="text-sm font-semibold text-slate-200">Mecánico Responsable</label>
                <input
                    value={mecanico}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white"
                />
                <div className="mt-2 text-xs text-slate-400">Se completa automáticamente con el usuario actual (si existe).</div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">VEHÍCULO</div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Patente</label>
                        <input
                            value={patente}
                            onChange={(e) => setPatente(normalizePatente(e.target.value))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    buscarPatente();
                                }
                            }}
                            placeholder="AA-BB-11"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 md:py-4 text-center font-mono text-xl md:text-2xl font-bold uppercase tracking-widest text-white"
                            maxLength={6}
                        />
                        <div className="mt-2 text-xs text-slate-400">Ejemplos: PROFE1, BBBB10, TEST01</div>
                    </div>

                    <button
                        type="button"
                        onClick={() => buscarPatente()}
                        disabled={isBuscando}
                        className="h-[50px] md:h-[54px] rounded-xl bg-blue-600 px-6 md:px-8 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isBuscando ? '🔄 Buscando...' : '🔍 Buscar'}
                    </button>
                </div>

                {estadoBusqueda ? <div className="mt-3 text-sm text-slate-300">{estadoBusqueda}</div> : null}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Marca</label>
                        <input
                            value={marca}
                            onChange={(e) => setMarca(e.target.value)}
                            placeholder="Ej: Toyota, Chevrolet"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Modelo</label>
                        <input
                            value={modelo}
                            onChange={(e) => setModelo(e.target.value)}
                            placeholder="Ej: Corolla, Sail"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Año</label>
                        <input
                            value={anio}
                            onChange={(e) => setAnio(e.target.value)}
                            placeholder="Ej: 2020"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Motor</label>
                        <input
                            value={motor}
                            onChange={(e) => setMotor(e.target.value)}
                            placeholder="Ej: 1.4, 1.6 Twin Cam"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">CLIENTE</div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Receptor (Nombre)</label>
                        <input
                            value={clienteNombre}
                            onChange={(e) => setClienteNombre(e.target.value)}
                            placeholder="Nombre del cliente"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">RUT / DNI</label>
                        <input
                            value={clienteRut}
                            onChange={(e) => setClienteRut(e.target.value)}
                            onKeyDown={handleRutKeyDown}
                            onBlur={() => buscarPorRut()}
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                            placeholder="12.345.678-9"
                        />
                        <div className="mt-1 text-xs text-slate-500 text-right">Presiona Enter para buscar</div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">WhatsApp</label>
                        <div className="relative mt-2">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                <span className="text-slate-400">+569</span>
                            </div>
                            <input
                                value={clienteWhatsapp}
                                onChange={(e) => {
                                    const numeros = e.target.value.replace(/[^0-9]/g, '');
                                    setClienteWhatsapp(numeros.slice(0, 8));
                                }}
                                inputMode="numeric"
                                placeholder="12345678"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-16 pr-4 text-white"
                            />
                        </div>
                        <div className="mt-2 text-xs text-slate-400">Usa formato internacional sin + (ej: 56912345678).</div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-200">Email (Opcional)</label>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="cliente@email.com"
                            type="email"
                            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder:text-gray-500"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">SERVICIOS</div>

                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => (kmEnabled ? desactivarServicioKm() : activarServicioKm())}
                        className={
                            kmEnabled
                                ? 'rounded-full border border-blue-500 bg-blue-600/30 px-3 py-2 text-sm font-semibold text-blue-100'
                                : 'rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700'
                        }
                    >
                        🔘 KM
                    </button>
                    {serviciosFrecuentesDB.slice(0, showAllServices ? undefined : 5).map((s) => (
                        <button
                            key={s.descripcion}
                            type="button"
                            onClick={() => agregarServicioFrecuente(s.descripcion)}
                            className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                        >
                            🔘 {s.descripcion}
                        </button>
                    ))}
                    {serviciosFrecuentesDB.length > 5 && (
                        <button
                            type="button"
                            onClick={() => setShowAllServices(!showAllServices)}
                            className="rounded-full border border-dashed border-slate-600 bg-transparent px-3 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
                        >
                            {showAllServices ? 'Ver menos' : `+${serviciosFrecuentesDB.length - 5} más`}
                        </button>
                    )}
                </div>

                {kmEnabled ? (
                    <div className="mb-4 grid gap-4 rounded-xl border border-slate-700 bg-slate-800/30 p-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-semibold text-slate-200">KM actual</label>
                            <input
                                ref={kmActualInputRef}
                                value={formatMilesConPunto(kmActual)}
                                onChange={(e) => setKmActual(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                                inputMode="numeric"
                                placeholder="Ej: 200.000"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-200">KM nuevo</label>
                            <input
                                value={formatMilesConPunto(kmNuevo)}
                                onChange={(e) => setKmNuevo(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                                inputMode="numeric"
                                placeholder="Ej: 120.000"
                                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl font-bold font-mono tracking-wide text-white"
                            />
                        </div>
                        <div className="md:col-span-2 text-xs text-slate-400">
                            Se agrega como servicio cobrable. Define el precio en la fila de KM.
                        </div>
                    </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-slate-700">
                    <table className="w-full">
                        <thead className="bg-slate-800/70">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-semibold tracking-widest text-slate-300">DESCRIPCIÓN</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold tracking-widest text-slate-300">PRECIO ($)</th>
                                <th className="px-3 py-3 text-right text-xs font-semibold tracking-widest text-slate-300">ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {servicios.map((s, idx) => (
                                <tr key={idx} className="bg-slate-900/40">
                                    <td className="px-3 py-3">
                                        <input
                                            ref={(r) => {
                                                descRefs.current[idx] = r;
                                            }}
                                            value={s.descripcion}
                                            onChange={(e) => updateServicio(idx, { descripcion: e.target.value })}
                                            placeholder="Ej: Scanner"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3 text-white"
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        <input
                                            ref={(r) => {
                                                precioRefs.current[idx] = r;
                                            }}
                                            value={s.precio}
                                            onChange={(e) => updateServicio(idx, { precio: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })}
                                            inputMode="numeric"
                                            placeholder="0"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3 text-white"
                                        />
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => eliminarFila(idx)}
                                            className="rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white hover:bg-red-700"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="text-xs font-semibold tracking-widest text-slate-300">TOTAL</div>
                        <div className="text-2xl font-extrabold text-white">${moneyCL(total)}</div>
                    </div>
                    <button
                        type="button"
                        onClick={() => agregarFila()}
                        className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                        + Agregar Servicio
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-5">
                <div className="mb-4 text-xs font-semibold tracking-widest text-slate-200">DETALLES DEL VEHÍCULO</div>
                <label className="text-sm font-semibold text-slate-200">Descripción general</label>
                <textarea
                    value={detallesVehiculo}
                    onChange={(e) => setDetallesVehiculo(e.target.value)}
                    placeholder="Ej: ruido al encender, vibración, luces de tablero, etc."
                    className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white"
                />

                <div className="mt-5">
                    <label className="text-sm font-semibold text-slate-200 block mb-2">Imágenes</label>
                    <input
                        type="file"
                        id="file-upload"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setIsUploading(true);
                            try {
                                // Comprimir imágenes antes de subir
                                const compressedFiles = await Promise.all(files.map(comprimirImagen));
                                const uploads = await Promise.all(compressedFiles.map((f) => subirImagen(f, 'ordenes')));
                                const ok = uploads.filter(Boolean) as string[];
                                setFotos((prev) => [...prev, ...ok]);
                            } finally {
                                setIsUploading(false);
                                e.target.value = '';
                            }
                        }}
                        className="hidden"
                    />
                    <input
                        type="file"
                        id="camera-capture"
                        accept="image/*"
                        capture="environment"
                        onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setIsUploading(true);
                            try {
                                // Comprimir imágenes antes de subir
                                const compressedFiles = await Promise.all(files.map(comprimirImagen));
                                const uploads = await Promise.all(compressedFiles.map((f) => subirImagen(f, 'ordenes')));
                                const ok = uploads.filter(Boolean) as string[];
                                setFotos((prev) => [...prev, ...ok]);
                            } finally {
                                setIsUploading(false);
                                e.target.value = '';
                            }
                        }}
                        className="hidden"
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                        <label
                            htmlFor="file-upload"
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 px-6 py-4 font-semibold text-slate-200 hover:bg-slate-700/50 hover:border-slate-500 cursor-pointer transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Seleccionar imágenes</span>
                        </label>
                        <label
                            htmlFor="camera-capture"
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-600 bg-blue-800/30 px-6 py-4 font-semibold text-blue-200 hover:bg-blue-700/50 hover:border-blue-500 cursor-pointer transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Tomar foto</span>
                        </label>
                    </div>
                    {isUploading ? <div className="mt-2 text-xs text-slate-400">Subiendo imágenes...</div> : null}

                    {fotos.length ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            {fotos.map((src, idx) => (
                                <div key={idx} className="rounded-xl border border-slate-700 bg-slate-800/30 p-2">
                                    <img src={src} alt={`foto-${idx}`} className="h-28 w-full rounded-lg object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFotos((prev) => prev.filter((_, i) => i !== idx))}
                                        className="mt-2 w-full rounded-lg bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                    >
                                        Quitar
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-col gap-3 pb-10 md:flex-row md:justify-end">
                <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isGuardando}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                >
                    {isGuardando ? 'Procesando...' : (
                        <>
                            Siguiente
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={limpiar}
                    className="rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-700"
                >
                    🗑️ Limpiar
                </button>
            </div>

            {/* Floating Action Button (FAB) (Top-level z-index) */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-900/95 p-4 backdrop-blur-md md:hidden ${successMsg ? 'hidden' : ''}`}>
                <div className="mx-auto max-w-2xl">
                    <button
                        onClick={handleNextStep}
                        disabled={isGuardando}
                        className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-blue-900/40 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGuardando ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <span className="flex items-center gap-2">
                                    Siguiente: Checklist
                                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </>
                        )}
                    </button>
                    <div className="w-full mt-2 text-center text-xs text-slate-500">
                        Paso 1 de 2: Recepción
                    </div>
                </div>
            </div>

            {/* Debt Alert Modal */}
            {debtData && (
                <DebtAlertModal
                    isOpen={isDebtModalOpen}
                    onClose={() => setIsDebtModalOpen(false)}
                    onProceed={() => {
                        console.log('[Debt Modal] User chose to proceed anyway');
                    }}
                    patente={patente}
                    totalDebt={debtData.totalDebt}
                    debtOrders={debtData.debtOrders}
                    lastVisit={debtData.lastVisit}
                />
            )}
        </div>
    );
}

export default function RecepcionPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-slate-400">Cargando recepción...</span>
            </div>
        }>
            <RecepcionContent />
        </Suspense>
    );
}
