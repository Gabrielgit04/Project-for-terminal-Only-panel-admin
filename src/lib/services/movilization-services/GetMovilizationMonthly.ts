import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";

export const getMovilizationMonthlyServer = createServerFn({ method: "GET" })
  .inputValidator((data: { year?: number }) => data)
  .handler(async ({ data }) => {
    try {
      const year = data.year ?? new Date().getFullYear();

      // Estrategia antes: descargar TODO el año de timestamps y agrupar en JS.
      // Estrategia ahora: 24 COUNT head (12 meses x 2 tablas) en paralelo.
      // Cada COUNT devuelve sólo un entero -> payload ~0, CPU ~0 en el Worker.
      const monthNames = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ];

      const countPromises: Promise<number>[] = [];
      for (let m = 1; m <= 12; m++) {
        const fromTS = `${year}-${String(m).padStart(2, "0")}-01T00:00:00-04:00`;
        const lastDay = new Date(year, m, 0).getDate();
        const toTS = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59-04:00`;

        // Conteo de entradas del mes
        countPromises.push(
          (supabase as any)
            .from("entrada")
            .select("*", { count: "exact", head: true })
            .is("deleted_at", null)
            .gte("hora", fromTS)
            .lte("hora", toTS)
            .then((r: any) => r.count ?? 0)
            .catch(() => 0),
        );

        // Conteo de salidas sueltas (sin entrada asociada) del mes
        countPromises.push(
          (supabase as any)
            .from("salida")
            .select("*", { count: "exact", head: true })
            .is("deleted_at", null)
            .is("entrada_id", null)
            .gte("hora", fromTS)
            .lte("hora", toTS)
            .then((r: any) => r.count ?? 0)
            .catch(() => 0),
        );
      }

      const counts = await Promise.all(countPromises);

      return monthNames.map((mes, i) => ({
        mes,
        total: (counts[i * 2] ?? 0) + (counts[i * 2 + 1] ?? 0),
      }));
    } catch (err: any) {
      console.error("[DB error en getMovilizacionMonthly]", err.message);
      return [];
    }
  });
