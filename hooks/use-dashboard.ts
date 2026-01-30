import { useQuery } from '@tanstack/react-query';
import { obtenerOrdenesLight, type OrdenDB } from '@/lib/storage-adapter';

export const DASHBOARD_ORDERS_KEY = ['dashboard_orders'];

export function useDashboardOrders() {
    return useQuery<OrdenDB[]>({
        queryKey: DASHBOARD_ORDERS_KEY,
        queryFn: obtenerOrdenesLight,
        staleTime: 0,
        gcTime: 2 * 60 * 1000, // 2 minutos en caché
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchInterval: 15000, // Auto-actualizar cada 15 segundos
        refetchIntervalInBackground: true,
    });
}
