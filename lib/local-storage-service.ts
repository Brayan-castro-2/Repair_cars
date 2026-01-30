// Servicio de almacenamiento local para reemplazar Supabase
// Todas las operaciones usan localStorage del navegador

// ============ TIPOS ============

// ============ TIPOS V3 (NORMALIZADO) ============

export interface PerfilDB {
    id: string;
    email: string;
    nombre_completo: string;
    rol: 'mecanico' | 'admin';
    activo: boolean;
}

export interface ClienteDB {
    id: string;
    nombre_completo: string;
    tipo: 'persona' | 'empresa';
    rut_dni?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
    notas?: string | null;
    fecha_creacion?: string;
}

export interface ClienteWithStats extends ClienteDB {
    total_ordenes: number;
    total_gastado: number;
    ultima_visita?: string;
    vehiculos?: (VehiculoDB & { ordenes?: OrdenDB[] })[];
}

export interface VehiculoDB {
    patente: string;
    marca: string;
    modelo: string;
    anio: string;
    motor?: string | null;
    color?: string | null;
    vin?: string | null;
    cliente_id: string; // Required to match Supabase

    // Relación anidada
    clientes?: ClienteDB | null;
}

export interface OrdenDB {
    id: number;
    patente_vehiculo: string;
    descripcion_ingreso: string;
    estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'entregada' | 'debe';

    creado_por: string;
    asignado_a?: string | null;

    fecha_ingreso: string;
    // Modificado para compatibilidad V3 (Optional)
    fecha_entrega?: string | null;
    fecha_cierre?: string | null;
    fecha_lista?: string | null;
    fecha_completada?: string | null;
    fecha_actualizacion?: string;

    precio_total: number;
    metodo_pago?: string | null;
    metodos_pago?: { metodo: string; monto: number }[] | null;

    kilometraje?: number | null;
    nivel_combustible?: string | null;
    observaciones_mecanico?: string | null;
    fotos_urls?: string[] | null;

    // Estructuras legacy para evitar romper UI (serán null en nuevos registros)
    detalle_trabajos?: string | null;
    detalles_vehiculo?: string | null;
    cliente_nombre?: string | null;
    cliente_telefono?: string | null;
    cliente_email?: string | null;
    cliente_rut?: string | null;

    // Relaciones anidadas
    vehiculos?: VehiculoDB | null;
    perfiles_creado?: PerfilDB | null;
    perfiles_asignado?: PerfilDB | null;
}

export interface CitaDB {
    id: number;
    titulo: string;
    fecha_inicio: string; // backend usa fecha_inicio/fin
    fecha_fin: string;
    fecha?: string; // Compatibilidad legacy (Optional now)

    estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'bloqueo';

    cliente_id?: string | null;
    patente_vehiculo?: string | null;
    orden_id?: number | null;
    notas?: string | null;

    servicio_solicitado?: string | null; // Added based on usage
    creado_por?: string | null; // Added audit field

    // Legacy support
    cliente_nombre?: string | null;
    cliente_telefono?: string | null;

    // Relaciones
    clientes?: ClienteDB | null;
    vehiculos?: VehiculoDB | null;
}

// ============ HELPERS ============

const KEYS = {
    VEHICULOS: 'app_vehiculos',
    ORDENES: 'app_ordenes',
    PERFILES: 'app_perfiles',
    CITAS: 'app_citas',
    CLIENTES: 'app_clientes',
    CURRENT_USER: 'app_current_user',
    ORDER_COUNTER: 'app_order_counter',
};

function getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
}

function saveToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function getNextOrderId(): number {
    const current = getFromStorage<number>(KEYS.ORDER_COUNTER, 0);
    const next = current + 1;
    saveToStorage(KEYS.ORDER_COUNTER, next);
    return next;
}

// ============ INICIALIZACIÓN ============

export function initializeLocalStorage(): void {
    if (typeof window === 'undefined') return;

    // Crear usuarios por defecto si no existen
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    if (perfiles.length === 0) {
        const defaultUsers: PerfilDB[] = [
            {
                id: 'admin-juan',
                nombre_completo: 'Juan',
                rol: 'admin',
                activo: true,
                email: 'juan@taller.cl',
            },
            {
                id: 'admin-rodrigo',
                nombre_completo: 'Rodrigo',
                rol: 'admin',
                activo: true,
                email: 'rodrigo@taller.cl',
            },
            {
                id: 'mecanico-francisco',
                nombre_completo: 'Francisco',
                rol: 'mecanico',
                activo: true,
                email: 'francisco@taller.cl',
            },
            {
                id: 'mecanico-javier',
                nombre_completo: 'Javier',
                rol: 'mecanico',
                activo: true,
                email: 'javier@taller.cl',
            },
        ];
        saveToStorage(KEYS.PERFILES, defaultUsers);
        console.log('✅ Usuarios creados: Juan (1989), Rodrigo (1986), Francisco (2001), Javier (2280)');
    }

    // Inicializar arrays vacíos si no existen
    if (!localStorage.getItem(KEYS.VEHICULOS)) {
        saveToStorage(KEYS.VEHICULOS, []);
    }
    if (!localStorage.getItem(KEYS.ORDENES)) {
        saveToStorage(KEYS.ORDENES, []);
    }
    if (!localStorage.getItem(KEYS.CLIENTES)) {
        saveToStorage(KEYS.CLIENTES, []);
    }
    if (!localStorage.getItem(KEYS.ORDER_COUNTER)) {
        saveToStorage(KEYS.ORDER_COUNTER, 0);
    }
}

// ============ VEHÍCULOS ============

export async function buscarVehiculoPorPatente(patente: string): Promise<VehiculoDB | null> {
    const patenteNormalizada = patente.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const vehiculos = getFromStorage<VehiculoDB[]>(KEYS.VEHICULOS, []);
    const vehiculo = vehiculos.find(v => v.patente === patenteNormalizada);

    if (!vehiculo) {
        console.log('Vehículo no encontrado en localStorage');
        return null;
    }

    return vehiculo;
}

export async function crearVehiculo(vehiculo: Omit<VehiculoDB, 'fecha_creacion'>): Promise<VehiculoDB | null> {
    const vehiculos = getFromStorage<VehiculoDB[]>(KEYS.VEHICULOS, []);

    const nuevoVehiculo: VehiculoDB = {
        ...vehiculo,
        patente: vehiculo.patente.toUpperCase(),
        // Mock default cliente_id for local storage
        cliente_id: 'mock-client-id',
    };

    vehiculos.push(nuevoVehiculo);
    saveToStorage(KEYS.VEHICULOS, vehiculos);

    console.log('✅ Vehículo creado:', nuevoVehiculo.patente);
    return nuevoVehiculo;
}

export async function obtenerVehiculos(): Promise<VehiculoDB[]> {
    return getFromStorage<VehiculoDB[]>(KEYS.VEHICULOS, []);
}

// ============ ÓRDENES ============

export async function obtenerOrdenes(limit?: number, offset?: number): Promise<OrdenDB[]> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    const sorted = ordenes.sort((a, b) =>
        new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime()
    );

    if (limit !== undefined && offset !== undefined) {
        return sorted.slice(offset, offset + limit);
    }

    return sorted;
}

export async function obtenerOrdenesCount(): Promise<number> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    return ordenes.length;
}

export async function obtenerOrdenesLight(): Promise<OrdenDB[]> {
    return obtenerOrdenes();
}

export async function obtenerOrdenesHoy(): Promise<OrdenDB[]> {
    const ordenes = await obtenerOrdenes();
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
    const finDelDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

    return ordenes.filter(orden => {
        const fechaOrden = new Date(orden.fecha_ingreso);
        return fechaOrden >= inicioDelDia && fechaOrden <= finDelDia;
    });
}

export async function obtenerOrdenPorId(id: number): Promise<OrdenDB | null> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    return ordenes.find(o => o.id === id) || null;
}

export async function crearOrden(orden: {
    patente_vehiculo: string;
    descripcion_ingreso: string;
    creado_por: string;
    estado?: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'entregada' | 'debe';
    fotos?: string[];
    cliente_nombre?: string;
    cliente_telefono?: string;
    precio_total?: number;
    metodo_pago?: string;
    asignado_a?: string;
    detalles_vehiculo?: string;
}): Promise<OrdenDB | null> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);

    const nuevaOrden: OrdenDB = {
        id: getNextOrderId(),
        patente_vehiculo: orden.patente_vehiculo.toUpperCase(),
        descripcion_ingreso: orden.descripcion_ingreso,
        creado_por: orden.creado_por,
        estado: (orden.estado as any) || 'pendiente',
        asignado_a: orden.asignado_a || orden.creado_por, // Asignar al especificado o al creador
        fecha_ingreso: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        fotos_urls: orden.fotos || [], // Map legacy 'fotos' to 'fotos_urls'
        cliente_nombre: orden.cliente_nombre,
        cliente_telefono: orden.cliente_telefono,
        precio_total: orden.precio_total || 0,
        metodo_pago: orden.metodo_pago,
        // Legacy fields ignored or mapped if needed
    };

    ordenes.push(nuevaOrden);
    saveToStorage(KEYS.ORDENES, ordenes);

    console.log('✅ Orden creada:', nuevaOrden.id);
    return nuevaOrden;
}

export async function actualizarOrden(
    id: number,
    updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>>
): Promise<OrdenDB | null> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    const index = ordenes.findIndex(o => o.id === id);

    if (index === -1) {
        console.error('Orden no encontrada:', id);
        return null;
    }

    ordenes[index] = {
        ...ordenes[index],
        ...updates,
        fecha_actualizacion: new Date().toISOString(),
    };

    saveToStorage(KEYS.ORDENES, ordenes);
    console.log('✅ Orden actualizada:', id);
    return ordenes[index];
}

export async function eliminarOrden(id: number): Promise<boolean> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);
    const filtered = ordenes.filter(o => o.id !== id);

    if (filtered.length === ordenes.length) {
        console.error('Orden no encontrada:', id);
        return false;
    }

    saveToStorage(KEYS.ORDENES, filtered);
    console.log('✅ Orden eliminada:', id);
    return true;
}

// ============ PERFILES/USUARIOS ============

export async function obtenerPerfiles(): Promise<PerfilDB[]> {
    return getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
}

export async function obtenerPerfilPorId(id: string): Promise<PerfilDB | null> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    return perfiles.find(p => p.id === id) || null;
}

export async function actualizarPerfil(
    id: string,
    updates: Partial<Omit<PerfilDB, 'id'>>
): Promise<PerfilDB | null> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);
    const index = perfiles.findIndex(p => p.id === id);

    if (index === -1) {
        console.error('Perfil no encontrado:', id);
        return null;
    }

    perfiles[index] = {
        ...perfiles[index],
        ...updates,
    };

    saveToStorage(KEYS.PERFILES, perfiles);
    return perfiles[index];
}

export async function crearUsuario(
    email: string,
    password: string,
    nombreCompleto: string,
    rol: 'admin' | 'mecanico'
): Promise<{ success: boolean; error?: string }> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);

    // Verificar si el email ya existe
    if (perfiles.some(p => p.email === email)) {
        return { success: false, error: 'El email ya está registrado' };
    }

    const nuevoPerfil: PerfilDB = {
        id: `user-${Date.now()}`,
        nombre_completo: nombreCompleto,
        rol,
        activo: true,
        email,
    };

    perfiles.push(nuevoPerfil);
    saveToStorage(KEYS.PERFILES, perfiles);

    console.log('✅ Usuario creado:', email);
    return { success: true };
}

export async function obtenerOrdenesPorUsuario(userId: string): Promise<{
    creadas: OrdenDB[];
    asignadas: OrdenDB[];
}> {
    const ordenes = getFromStorage<OrdenDB[]>(KEYS.ORDENES, []);

    return {
        creadas: ordenes.filter(o => o.creado_por === userId),
        asignadas: ordenes.filter(o => o.asignado_a === userId),
    };
}

// ============ AUTENTICACIÓN ============

const CREDENTIALS: Record<string, string> = {
    'juan': '1989',
    'rodrigo': '1986',
    'francisco': '2001',
    'javier': '2280',
    'juan@taller.cl': '1989',
    'rodrigo@taller.cl': '1986',
    'francisco@taller.cl': '2001',
    'javier@taller.cl': '2280',
};

export async function loginConCredenciales(email: string, password: string): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
    error: string | null;
}> {
    const perfiles = getFromStorage<PerfilDB[]>(KEYS.PERFILES, []);

    const emailLower = email.toLowerCase().trim();
    const passwordTrim = password.trim();

    const correctPassword = CREDENTIALS[emailLower];
    if (!correctPassword || correctPassword !== passwordTrim) {
        console.log('❌ Credenciales incorrectas para:', emailLower);
        return { user: null, perfil: null, error: 'Credenciales incorrectas' };
    }

    const perfil = perfiles.find(p =>
        p.email?.toLowerCase() === emailLower ||
        p.nombre_completo.toLowerCase() === emailLower
    );

    if (!perfil) {
        return { user: null, perfil: null, error: 'Usuario no encontrado' };
    }

    if (!perfil.activo) {
        return { user: null, perfil: null, error: 'Usuario desactivado' };
    }

    const user = { id: perfil.id, email: perfil.email || email };
    saveToStorage(KEYS.CURRENT_USER, { user, perfil });

    console.log('✅ Login exitoso:', perfil.nombre_completo);
    return { user, perfil, error: null };
}

export async function logout(): Promise<void> {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(KEYS.CURRENT_USER);
    }
    console.log('✅ Logout exitoso');
}

export async function obtenerSesionActual(): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
}> {
    const session = getFromStorage<{ user: { id: string; email: string }; perfil: PerfilDB } | null>(
        KEYS.CURRENT_USER,
        null
    );

    if (!session) {
        return { user: null, perfil: null };
    }

    return { user: session.user, perfil: session.perfil };
}

// ============ ALMACENAMIENTO DE IMÁGENES ============

export async function subirImagen(file: File, carpeta: string = 'ordenes'): Promise<string | null> {
    // En localStorage, convertimos la imagen a base64
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            console.log('✅ Imagen guardada en base64');
            resolve(base64);
        };
        reader.onerror = () => {
            console.error('Error al leer imagen');
            resolve(null);
        };
        reader.readAsDataURL(file);
    });
}

// ============ CITAS/AGENDAMIENTO ============

export async function obtenerCitas(): Promise<CitaDB[]> {
    const stored = localStorage.getItem(KEYS.CITAS);
    if (!stored) return [];
    try {
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

export async function obtenerCitasHoy(): Promise<CitaDB[]> {
    const citas = await obtenerCitas();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return citas.filter(cita => {
        const citaDate = new Date(cita.fecha || '');
        return citaDate >= today && citaDate < tomorrow;
    });
}

export async function obtenerCitasSemana(startDate: Date, endDate: Date): Promise<CitaDB[]> {
    const citas = await obtenerCitas();
    return citas.filter(cita => {
        const citaDate = new Date(cita.fecha || '');
        return citaDate >= startDate && citaDate <= endDate;
    });
}

export async function crearCita(cita: Omit<CitaDB, 'id'>): Promise<CitaDB | null> {
    const citas = await obtenerCitas();
    const newId = citas.length > 0 ? Math.max(...citas.map(c => c.id)) + 1 : 1;

    const newCita: CitaDB = {
        id: newId,
        ...cita,
        // Mock default fields
        fecha: cita.fecha_inicio,
    };

    citas.push(newCita);
    localStorage.setItem(KEYS.CITAS, JSON.stringify(citas));
    return newCita;
}

export async function actualizarCita(id: number, updates: Partial<Omit<CitaDB, 'id'>>): Promise<CitaDB | null> {
    const citas = await obtenerCitas();
    const index = citas.findIndex(c => c.id === id);

    if (index === -1) return null;

    const updated = {
        ...citas[index],
        ...updates,
    };

    citas[index] = updated;
    localStorage.setItem(KEYS.CITAS, JSON.stringify(citas));
    return updated;
}

export async function eliminarCita(id: number): Promise<boolean> {
    const citas = await obtenerCitas();
    const filtered = citas.filter(c => c.id !== id);

    if (filtered.length === citas.length) return false;

    localStorage.setItem(KEYS.CITAS, JSON.stringify(filtered));
    return true;
}
