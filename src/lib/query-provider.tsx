import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Provider global de React Query.
 *
 * staleTime por defecto generoso (60s) para que las queries de referencia
 * (vehículos, organizaciones, rutas, choferes) NO se re-disparen en cada
 * navegacion o cambio de estado. Es la capa de cache mas impactante: si 30
 * usuarios abren /admin/movilizacion a la vez, en vez de 7 server-fn por
 * usuario (210 llamadas) solo el primero pisa la DB; el resto consume cache.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
