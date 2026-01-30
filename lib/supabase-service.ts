// Servicios de Supabase para operaciones de base de datos
import { supabase, VehiculoDB, OrdenDB, PerfilDB, CitaDB, ClienteDB, ServicioDB, ClienteWithStats } from './supabase';
import { createClient } from '@supabase/supabase-js';

// ============ VEHÍCULOS ============

// Buscar vehículo por patente (la función "mágica")
export async function buscarVehiculoPorPatente(patente: string): Promise<VehiculoDB | null> {
    const patenteNormalizada = patente.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const { data, error } = await supabase
        .from('vehiculos')
        .select(`
            *,
            clientes (*)
        `)
        .eq('patente', patenteNormalizada)
        .maybeSingle();

    if (error || !data) {
        console.log('Vehículo no encontrado:', error?.message);
        return null;
    }

    return data;
}

// Crear nuevo vehículo (o actualizar si ya existe)
export async function crearVehiculo(vehiculo: Omit<VehiculoDB, 'fecha_creacion'>): Promise<VehiculoDB | null> {
    const patenteUpper = vehiculo.patente.toUpperCase();

    // Preparar datos limpios para Supabase (sin cliente_id porque no existe en la tabla)
    const vehiculoData = {
        patente: patenteUpper,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        motor: vehiculo.motor || null,
        color: vehiculo.color || '-',
    };

    console.log('📤 Enviando a Supabase:', vehiculoData);

    // Usar upsert para crear o actualizar
    const { data, error } = await supabase
        .from('vehiculos')
        .upsert([vehiculoData], {
            onConflict: 'patente',
            ignoreDuplicates: false
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Error al crear/actualizar vehículo:', error);
        console.error('❌ Detalles del error:', JSON.stringify(error, null, 2));
        return null;
    }

    console.log('✅ Vehículo guardado:', data);
    return data;
}

// Obtener todos los vehículos
export async function obtenerVehiculos(): Promise<VehiculoDB[]> {
    const { data, error } = await supabase
        .from('vehiculos')
        .select('*');

    if (error) {
        console.error('Error al obtener vehículos:', error);
        return [];
    }

    return data || [];
}

// ============ ALMACENAMIENTO ============

// Subir imagen al bucket
export async function subirImagen(file: File, carpeta: string = 'ordenes'): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${carpeta}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('imagenes')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error al subir imagen:', uploadError);
            return null;
        }

        const { data } = supabase.storage
            .from('imagenes')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error en subida de imagen:', error);
        return null;
    }
}

// ============ ÓRDENES ============

// Obtener todas las órdenes
// ============ CLIENTES (CRM) ============

export async function obtenerClientes(busqueda?: string): Promise<ClienteWithStats[]> {
    let query = supabase
        .from('clientes')
        .select(`
            *,
            vehiculos (
                patente,
                marca,
                modelo,
                ordenes (
                    id,
                    fecha_ingreso,
                    precio_total,
                    estado,
                    descripcion_ingreso,
                    patente_vehiculo
                )
            )
        `)
        .order('nombre_completo', { ascending: true });

    if (busqueda) {
        query = query.or(`nombre_completo.ilike.%${busqueda}%,rut_dni.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('❌ Error al obtener clientes:', error);
        return [];
    }

    // Calcular estadísticas en el cliente (más eficiente que subqueries complejas en esta etapa)
    return (data || []).map((cliente: any) => {
        let totalOrdenes = 0;
        let totalGastado = 0;
        let ultimaVisitaStr: string | undefined;
        let ultimaVisitaTime = 0;

        if (cliente.vehiculos) {
            cliente.vehiculos.forEach((vehiculo: any) => {
                if (vehiculo.ordenes) {
                    vehiculo.ordenes.forEach((orden: any) => {
                        totalOrdenes++;
                        totalGastado += (orden.precio_total || 0);

                        // Encontrar la fecha más reciente
                        const fecha = new Date(orden.fecha_ingreso).getTime();
                        if (fecha > ultimaVisitaTime) {
                            ultimaVisitaTime = fecha;
                            ultimaVisitaStr = orden.fecha_ingreso;
                        }
                    });
                }
            });
        }

        return {
            ...cliente,
            total_ordenes: totalOrdenes,
            total_gastado: totalGastado,
            ultima_visita: ultimaVisitaStr
        };
    });
}

// Buscar cliente por Teléfono (Identificador Principal V3.1)
export async function buscarClientePorTelefono(telefono: string): Promise<ClienteDB | null> {
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('telefono', telefono)
        .single(); // Debería ser único ahora

    if (error) return null;
    return data;
}

export async function buscarClientePorRut(rut: string): Promise<ClienteDB | null> {
    // Mantener por compatibilidad, pero ya no es el ID principal
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('rut_dni', rut)
        .maybeSingle();

    if (error) return null;
    return data;
}

export async function crearCliente(cliente: Omit<ClienteDB, 'id' | 'fecha_creacion'>): Promise<ClienteDB | null> {
    const { data, error } = await supabase
        .from('clientes')
        .insert([cliente])
        .select()
        .single();

    if (error) {
        console.error('❌ Error al crear cliente:', error);
        return null;
    }
    return data;
}

// ============ ÓRDENES ============

// Obtener todas las órdenes
// Obtener todas las órdenes (con paginación opcional)
export async function obtenerOrdenes(limit?: number, offset?: number): Promise<OrdenDB[]> {
    let query = supabase
        .from('ordenes')
        .select(`
            *,
            vehiculos (
                *,
                clientes (*)
            ),
            perfiles_creado:perfiles!creado_por (*),
            perfiles_asignado:perfiles!asignado_a (*)
        `)
        .order('fecha_ingreso', { ascending: false });

    // Aplicar paginación si se proporciona
    if (limit !== undefined && offset !== undefined) {
        query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('❌ Error al obtener órdenes:', error);
        return [];
    }

    return data || [];
}

// Obtener conteo total de órdenes
export async function obtenerOrdenesCount(): Promise<number> {
    const { count, error } = await supabase
        .from('ordenes')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Error al obtener conteo de órdenes:', error);
        return 0;
    }

    return count || 0;
}

// Obtener órdenes optimizadas para Dashboard (Light)
export async function obtenerOrdenesLight(): Promise<OrdenDB[]> {
    const { data, error } = await supabase
        .from('ordenes')
        .select(`
            id,
            fecha_ingreso,
            fecha_entrega,
            fecha_cierre,
            estado,
            precio_total,
            metodo_pago,
            creado_por,
            asignado_a,
            patente_vehiculo,
            descripcion_ingreso,
            fotos_urls,
            vehiculos (
                marca,
                modelo,
                clientes (
                    nombre_completo
                )
            ),
            perfiles_creado:perfiles!creado_por (
                nombre_completo
            ),
            perfiles_asignado:perfiles!asignado_a (
                nombre_completo
            )
        `)
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('❌ Error al obtener órdenes light:', error);
        return [];
    }

    // Cast seguro ya que devolvemos un subset compatible
    return (data as any[]) || [];
}

// Obtener órdenes del día
export async function obtenerOrdenesHoy(): Promise<OrdenDB[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('ordenes')
        .select(`
            *,
            vehiculos (
                *,
                clientes (*)
            )
        `)
        .gte('fecha_ingreso', hoy.toISOString())
        .order('fecha_ingreso', { ascending: false });

    if (error) {
        console.error('Error al obtener órdenes de hoy:', error);
        return [];
    }

    return data || [];
}

// Obtener orden por ID
export async function obtenerOrdenPorId(id: number): Promise<OrdenDB | null> {
    const { data, error } = await supabase
        .from('ordenes')
        .select(`
            *,
            vehiculos (
                *,
                clientes (*)
            ),
            perfiles_creado:perfiles!creado_por (*),
            perfiles_asignado:perfiles!asignado_a (*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error al obtener orden:', error);
        return null;
    }

    return data;
}

// Crear nueva orden (Lógica V3 Inteligente)
export async function crearOrden(orden: {
    patente_vehiculo: string;
    descripcion_ingreso: string;
    creado_por: string;
    estado?: any;
    fotos?: string[];
    // Datos Legacy / Simplificados del Formulario
    cliente_nombre?: string;
    cliente_telefono?: string;
    cliente_email?: string;
    cliente_rut?: string;

    // Datos del Vehículo (para creación automática)
    vehiculo_marca?: string;
    vehiculo_modelo?: string;
    vehiculo_anio?: string;
    vehiculo_motor?: string;
    vehiculo_color?: string;

    precio_total?: number;
    metodo_pago?: string;
    asignado_a?: string;
    detalles_vehiculo?: string;
    detalle_trabajos?: string;
}): Promise<OrdenDB | null> {
    const patenteNormalizada = orden.patente_vehiculo.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Verificar Vehículo y Dueño
    let { data: vehiculo } = await supabase
        .from('vehiculos')
        .select('*, clientes(*)')
        .eq('patente', patenteNormalizada)
        .maybeSingle();

    // 2. Si no existe el vehículo, necesitamos un Cliente para crearlo
    if (!vehiculo) {
        console.log(`🚗 Vehículo nuevo detectado: ${patenteNormalizada}`);

        let clienteId: string | undefined;

        // PRIORIDAD 1: Buscar por Teléfono (ID Principal)
        if (orden.cliente_telefono) {
            const clienteExistente = await buscarClientePorTelefono(orden.cliente_telefono);
            if (clienteExistente) {
                console.log('✅ Cliente encontrado por teléfono:', clienteExistente.nombre_completo);
                clienteId = clienteExistente.id;
            }
        }

        // PRIORIDAD 2: Buscar por RUT si no se encontró por teléfono
        if (!clienteId && orden.cliente_rut) {
            const clienteExistente = await buscarClientePorRut(orden.cliente_rut);
            if (clienteExistente) {
                console.log('✅ Cliente encontrado por RUT:', clienteExistente.nombre_completo);
                clienteId = clienteExistente.id;
            }
        }

        // Si no tenemos ID, creamos un cliente nuevo
        if (!clienteId && orden.cliente_nombre && orden.cliente_telefono) {
            console.log('👤 Creando cliente nuevo (V3.1 - Phone ID)...');
            const nuevoCliente = await crearCliente({
                nombre_completo: orden.cliente_nombre,
                telefono: orden.cliente_telefono, // OBLIGATORIO AHORA
                email: orden.cliente_email || null,
                tipo: 'persona',
                rut_dni: orden.cliente_rut || null
            });
            if (nuevoCliente) clienteId = nuevoCliente.id;
        }

        // Si falló todo y es urgente
        if (!clienteId) {
            console.error('❌ No se pudo crear/encontrar cliente. Se requiere Nombre y Teléfono obligatorios.');
            return null;
        }

        if (clienteId) {
            // Crear el vehículo vinculado al cliente
            const { data: nuevoVehiculo, error: vError } = await supabase
                .from('vehiculos')
                .insert([{
                    patente: patenteNormalizada,
                    marca: orden.vehiculo_marca || 'Por definir',
                    modelo: orden.vehiculo_modelo || 'Por definir',
                    anio: orden.vehiculo_anio || new Date().getFullYear().toString(),
                    motor: orden.vehiculo_motor || null,
                    color: orden.vehiculo_color || '-',
                    cliente_id: clienteId
                }])
                .select()
                .single();

            if (vError) {
                console.error('❌ Error creando vehículo:', vError);
                return null;
            }
            vehiculo = nuevoVehiculo;
        }
    }

    // 3. Crear la Orden
    const { data, error } = await supabase
        .from('ordenes')
        .insert([{
            patente_vehiculo: patenteNormalizada,
            descripcion_ingreso: orden.descripcion_ingreso,
            creado_por: orden.creado_por,
            asignado_a: orden.asignado_a || orden.creado_por,
            estado: orden.estado || 'pendiente',
            fotos_urls: orden.fotos || [], // V3 usa fotos_urls
            precio_total: orden.precio_total || 0,
            metodo_pago: orden.metodo_pago,
            observaciones_mecanico: orden.detalle_trabajos, // Mapeo de legacy
        }])
        .select()
        .single();

    if (error) {
        console.error('❌ Error al crear orden:', error);
        return null;
    }

    console.log('✅ Orden V3 creada exitosamente:', data.id);
    return data;
}

// Actualizar orden
export async function actualizarOrden(
    id: number,
    updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>>
): Promise<OrdenDB | null> {
    console.log(`🔵 Actualizando orden ${id} en Supabase:`, updates);

    const { data, error } = await supabase
        .from('ordenes')
        .update({
            ...updates,
            fecha_actualizacion: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('❌ Error al actualizar orden:', error);
        return null;
    }

    console.log('✅ Orden actualizada en Supabase:', data);
    return data;
}

// Eliminar orden
export async function eliminarOrden(id: number): Promise<boolean> {
    console.log(`🗑️ Eliminando orden ${id} de Supabase`);

    const { error } = await supabase
        .from('ordenes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('❌ Error al eliminar orden:', error);
        return false;
    }

    console.log('✅ Orden eliminada de Supabase');
    return true;
}

// ============ PERFILES/USUARIOS ============

// Obtener todos los perfiles
export async function obtenerPerfiles(): Promise<PerfilDB[]> {
    const { data, error } = await supabase
        .from('perfiles')
        .select('*');

    if (error) {
        console.error('Error al obtener perfiles:', error);
        return [];
    }

    return data || [];
}

// Obtener perfil por ID
export async function obtenerPerfilPorId(id: string): Promise<PerfilDB | null> {
    console.log('🔍 Buscando perfil con ID:', id);

    const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('❌ Error al obtener perfil:', error);
        console.error('❌ ID buscado:', id);
        return null;
    }

    console.log('✅ Perfil encontrado:', data);
    return data;
}

export async function actualizarCliente(id: string, updates: Partial<ClienteDB>): Promise<ClienteDB | null> {
    const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error al actualizar cliente:', error);
        return null;
    }

    return data;
}

// Actualizar perfil
export async function actualizarPerfil(
    id: string,
    updates: Partial<Omit<PerfilDB, 'id'>>
): Promise<PerfilDB | null> {
    console.log(`🔵 Actualizando perfil ${id} en Supabase:`, updates);

    const { data, error } = await supabase
        .from('perfiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('❌ Error al actualizar perfil:', error);
        return null;
    }

    console.log('✅ Perfil actualizado en Supabase:', data);
    return data;
}

// Obtener órdenes de un usuario
export async function obtenerOrdenesPorUsuario(userId: string): Promise<{
    creadas: OrdenDB[];
    asignadas: OrdenDB[];
}> {
    const [creadasRes, asignadasRes] = await Promise.all([
        supabase.from('ordenes').select('*').eq('creado_por', userId),
        supabase.from('ordenes').select('*').eq('asignado_a', userId),
    ]);

    return {
        creadas: creadasRes.data || [],
        asignadas: asignadasRes.data || [],
    };
}

// ============ AUTENTICACIÓN ============

// Login con email/password
export async function loginConCredenciales(email: string, password: string): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
    error: string | null;
}> {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error || !data.user) {
        return { user: null, perfil: null, error: error?.message || 'Error de autenticación' };
    }

    // Obtener el perfil del usuario
    const perfil = await obtenerPerfilPorId(data.user.id);

    if (!perfil) {
        return { user: null, perfil: null, error: 'Perfil no encontrado' };
    }

    if (!perfil.activo) {
        await supabase.auth.signOut();
        return { user: null, perfil: null, error: 'Usuario desactivado' };
    }

    return {
        user: { id: data.user.id, email: data.user.email! },
        perfil,
        error: null,
    };
}

// Logout
export async function logout(): Promise<void> {
    await supabase.auth.signOut();
}

// Obtener sesión actual
export async function obtenerSesionActual(): Promise<{
    user: { id: string; email: string } | null;
    perfil: PerfilDB | null;
}> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
        return { user: null, perfil: null };
    }

    const perfil = await obtenerPerfilPorId(session.user.id);

    return {
        user: { id: session.user.id, email: session.user.email! },
        perfil,
    };
}

// Crear nuevo usuario
export async function crearUsuario(
    email: string,
    password: string,
    nombreCompleto: string,
    rol: 'admin' | 'mecanico'
): Promise<{ success: boolean; error?: string; user?: PerfilDB }> {
    try {
        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: undefined,
                data: {
                    nombre_completo: nombreCompleto,
                    rol: rol,
                    activo: true,
                },
            },
        });

        if (authError) {
            return { success: false, error: authError.message };
        }

        if (authData.user) {
            // 2. Crear perfil (Trigger should handle this, but explicit ensure)
            // Perfiles table is typically created via trigger on auth.users
            // but we can return success here.
            return {
                success: true,
                user: {
                    id: authData.user.id,
                    email: email,
                    nombre_completo: nombreCompleto,
                    rol: rol,
                    activo: true,
                }
            };
        }

        return { success: false, error: 'No se pudo crear el usuario' };
    } catch (error) {
        console.error('Error al crear usuario:', error);
        return { success: false, error: 'Error interno del servidor' };
    }
}





// ============ CITAS/AGENDAMIENTO ============

export async function obtenerCitas(): Promise<CitaDB[]> {
    const { data, error } = await supabase
        .from('citas')
        // select con join a vehiculos usando la patente
        .select(`
            *,
            vehiculos:vehiculos!patente_vehiculo(*)
        `)
        .order('fecha_inicio', { ascending: true });

    if (error) {
        console.error('Error al obtener citas:', error);
        return [];
    }

    return data || [];
}

// Obtener citas de hoy (con datos de cliente)
export async function obtenerCitasHoy(): Promise<CitaDB[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
        .from('citas')
        .select(`
            *,
            clientes (
                nombre_completo,
                telefono
            )
        `)
        .gte('fecha_inicio', today.toISOString())
        .lt('fecha_inicio', tomorrow.toISOString())
        .order('fecha_inicio', { ascending: true });

    if (error) {
        console.error('❌ Error al obtener citas de hoy:', error);
        return [];
    }

    return data || [];
}

// Obtener servicios frecuentes (V3.1)
export async function obtenerServiciosFrecuentes(): Promise<ServicioDB[]> {
    const { data, error } = await supabase
        .from('servicios_frecuentes')
        .select('*')
        .eq('activo', true)
        .order('descripcion', { ascending: true });

    if (error) {
        console.error('Error al obtener servicios frecuentes:', error);
        return [];
    }

    return data || [];
}

export async function obtenerCitasSemana(startDate: Date, endDate: Date): Promise<CitaDB[]> {
    const { data, error } = await supabase
        .from('citas')
        .select(`
            *,
            clientes (
                nombre_completo,
                telefono
            )
        `)
        .gte('fecha_inicio', startDate.toISOString())
        .lte('fecha_inicio', endDate.toISOString())
        .order('fecha_inicio', { ascending: true });

    if (error) {
        console.error('Error al obtener citas de la semana:', error);
        return [];
    }

    return data || [];
}

export async function crearCita(cita: Omit<CitaDB, 'id' | 'creado_en' | 'actualizado_en'>): Promise<CitaDB | null> {
    console.log('📅 Creando cita (Smart Logic V3)...', cita);

    let clienteId = cita.cliente_id;
    let patenteNormalizada = cita.patente_vehiculo?.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. Buscar Cliente si no viene ID
    const citaAny = cita as any;
    if (!clienteId && citaAny.cliente_telefono) {
        const telefonoLimpio = citaAny.cliente_telefono.replace(/\D/g, '');
        const telefono = telefonoLimpio.length > 0 ? `+569${telefonoLimpio.slice(-8)}` : '';

        if (telefono) {
            const existe = await buscarClientePorTelefono(telefono);
            if (existe) {
                clienteId = existe.id;
            } else if (citaAny.cliente_nombre) {
                const nuevo = await crearCliente({
                    nombre_completo: citaAny.cliente_nombre,
                    telefono: telefono,
                    tipo: 'persona'
                });
                if (nuevo) clienteId = nuevo.id;
            }
        }
    }

    // 2. Asegurar Vehículo si viene patente
    if (patenteNormalizada && !cita.patente_vehiculo) {
        // Ya debería estar creado por el modal, pero aseguramos
        // El modal llama a crearVehiculo antes, así que confiamos en que existe o se creó.
    }

    // 2. Sanitize Payload for V3 Schema (Strict)
    const dbPayload = {
        titulo: cita.titulo,
        fecha_inicio: cita.fecha_inicio,
        fecha_fin: cita.fecha_fin,
        estado: cita.estado,
        cliente_id: clienteId || null,
        patente_vehiculo: patenteNormalizada || null,
        orden_id: cita.orden_id || null,
        notas: cita.notas || null
    };

    const { data, error } = await supabase
        .from('citas')
        .insert([dbPayload])
        .select()
        .single();

    if (error) {
        console.error('Error al crear cita:', error);
        return null;
    }

    console.log('✅ Cita creada:', data.id);
    return data;
}

export async function actualizarCita(id: number, updates: Partial<Omit<CitaDB, 'id' | 'creado_en'>>): Promise<CitaDB | null> {
    const validCols = ['titulo', 'fecha_inicio', 'fecha_fin', 'estado', 'cliente_id', 'patente_vehiculo', 'orden_id', 'notas'];

    const dbPayload: any = {};
    for (const key of Object.keys(updates)) {
        if (validCols.includes(key)) {
            dbPayload[key] = (updates as any)[key];
        }
    }

    const { data, error } = await supabase
        .from('citas')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error al actualizar cita:', error);
        return null;
    }

    return data;
}

export async function eliminarCita(id: number): Promise<boolean> {
    const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error al eliminar cita:', error);
        return false;
    }

    return true;
}


// ============ CHECKLISTS ============

export async function guardarChecklist(checklist: {
    orden_id: string;
    detalles: any; // Changed from items to match DB
    fotos: any;
}): Promise<any> {
    const { data, error } = await supabase
        .from('listas_chequeo') // Changed table name
        .upsert([{
            orden_id: checklist.orden_id,
            detalles: checklist.detalles,
            fotos: checklist.fotos
        }], { onConflict: 'orden_id' })
        .select()
        .single();

    if (error) {
        console.error('❌ Error al guardar checklist:', error);
        throw error;
    }

    return data;
}

export async function obtenerChecklist(orderId: string): Promise<any> {
    const { data, error } = await supabase
        .from('listas_chequeo')
        .select('*')
        .eq('orden_id', orderId)
        .maybeSingle();

    if (error) {
        console.error('❌ Error al obtener checklist:', error);
        return null;
    }

    // Map back to expected structure if needed, or consume as is
    if (data) {
        return {
            ...data,
            items: data.detalles, // Compatible alias
        };
    }

    return data;
}

// Helper specific to checklist photos
export async function subirImagenChecklist(file: File, ordenId: string, tipo: string): Promise<string | null> {
    try {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        // Path format: {orden_id}/checklist/{tipo}_timestamp.jpg
        const filePath = `${ordenId}/checklist/${tipo}_${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('ordenes-fotos') // Specific bucket
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error al subir imagen checklist:', uploadError);
            return null;
        }

        const { data } = supabase.storage
            .from('ordenes-fotos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error) {
        console.error('Error en subida de imagen checklist:', error);
        return null;
    }
}
