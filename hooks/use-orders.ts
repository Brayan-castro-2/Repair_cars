import { useQuery, useQueryClient, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { obtenerOrdenes, eliminarOrden, actualizarOrden, obtenerOrdenesCount } from '@/lib/storage-adapter';
import { OrdenDB } from '@/lib/supabase';

export const ORDERS_QUERY_KEY = ['orders'];

// Hook para scroll infinito
export function useInfiniteOrders() {
    return useInfiniteQuery({
        queryKey: ['orders', 'infinite'],
        queryFn: async ({ pageParam = 0 }) => {
            const limit = 20;
            const orders = await obtenerOrdenes(limit, pageParam);
            return {
                orders,
                nextCursor: orders.length === limit ? pageParam + limit : undefined,
            };
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 0,
        gcTime: 2 * 60 * 1000,
    });
}

// Hook para obtener el total de órdenes
export function useOrdersCount() {
    return useQuery({
        queryKey: ['orders', 'count'],
        queryFn: obtenerOrdenesCount,
        staleTime: 30 * 1000, // Cache por 30 segundos
    });
}

export function useOrders() {
    // Mantener compatibilidad con uso anterior, pero ahora trae todo (sin limit)
    // O podríamos hacer que use useInfiniteOrders internamente si quisiéramos migrar todo
    return useQuery({
        queryKey: ORDERS_QUERY_KEY,
        queryFn: () => obtenerOrdenes(), // Explicitly call with no args to get all (or default)
        staleTime: 0,
        gcTime: 2 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        refetchInterval: 15000,
        refetchIntervalInBackground: true,
    });
}

export function usePrefetchOrders() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.prefetchQuery({
            queryKey: ORDERS_QUERY_KEY,
            queryFn: obtenerOrdenes,
        });
    };
}

export function useInvalidateOrders() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    };
}

export function useDeleteOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (orderId: number) => eliminarOrden(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
        },
    });
}

export function useUpdateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: number; updates: Partial<Omit<OrdenDB, 'id' | 'fecha_ingreso'>> }) =>
            actualizarOrden(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
        },
    });
}
