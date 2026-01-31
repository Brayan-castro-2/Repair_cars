import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dccymmnjzhxneexscboo.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY3ltbW5qemh4bmVleHNjYm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxODA0MjIsImV4cCI6MjA4Mzc1NjQyMn0.IKpjys-3Rqqv2omj0LtFKowzQi5Z_M99JkhOgR29sx8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==========================================
// TIPOS V3 - ESQUEMA NORMALIZADO (CRM)
// ==========================================

export interface PerfilDB {
    id: string; // UUID
    email: string;
    nombre_completo: string;
    rol: 'mecanico' | 'admin';
    activo: boolean;
}

export interface ClienteDB {
    id: string; // UUID
    nombre_completo: string;
    tipo: 'persona' | 'empresa';
    rut_dni?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
    notas?: string | null;
    created_at?: string;
}

export interface ClienteWithStats extends ClienteDB {
    total_ordenes: number;
    total_gastado: number;
    ultima_visita?: string;
    vehiculos?: (VehiculoDB & { ordenes?: OrdenDB[] })[];
}

export interface VehiculoDB {
    patente: string; // PK
    marca: string;
    modelo: string;
    anio: string;
    motor?: string | null;
    color?: string | null;
    vin?: string | null;
    cliente_id: string; // FK -> Cliente

    // Relación anidada (al hacer select *, clientes(*))
    clientes?: ClienteDB | null;
}

export interface OrdenDB {
    id: number;
    patente_vehiculo: string; // FK -> Vehiculo

    descripcion_ingreso: string;
    estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'entregada' | 'debe';

    creado_por: string; // UUID
    asignado_a?: string | null; // UUID

    fecha_ingreso: string;
    fecha_entrega?: string | null;
    fecha_cierre?: string | null;
    fecha_lista?: string | null;
    fecha_completada?: string | null;

    precio_total: number;
    metodo_pago?: string | null;
    metodos_pago?: { metodo: string; monto: number }[] | null;

    kilometraje?: number | null;
    nivel_combustible?: string | null;
    observaciones_mecanico?: string | null;
    fotos_urls?: string[] | null;

    // Legacy / UI Support fields
    detalle_trabajos?: string | null;
    detalles_vehiculo?: string | null;
    cliente_nombre?: string | null;
    cliente_telefono?: string | null;
    cliente_email?: string | null;
    cliente_rut?: string | null;

    // Vehiculo flatten/legacy
    vehiculo_marca?: string | null;
    vehiculo_modelo?: string | null;
    vehiculo_anio?: string | null;
    vehiculo_motor?: string | null;
    vehiculo_color?: string | null;

    // Relaciones anidadas
    vehiculos?: VehiculoDB | null; // Incluye al cliente dentro: vehiculos.clientes
    perfiles_creado?: PerfilDB | null;
    perfiles_asignado?: PerfilDB | null;
}

export interface CitaDB {
    id: number;
    titulo: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'bloqueo';

    cliente_id?: string | null;
    patente_vehiculo?: string | null;
    orden_id?: number | null;
    notas?: string | null;

    // Legacy support / UI fields
    cliente_nombre?: string | null;
    cliente_telefono?: string | null;
    servicio_solicitado?: string | null;

    // Relaciones
    clientes?: ClienteDB | null;
    vehiculos?: VehiculoDB | null;
}

export interface ServicioDB {
    id: number;
    descripcion: string;
    precio_base: number;
    categoria?: string | null;
    activo: boolean;
}
