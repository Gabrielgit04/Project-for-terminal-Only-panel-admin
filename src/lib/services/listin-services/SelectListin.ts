import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import type { Listin } from "@/lib/api";

export const listListinesServer = createServerFn({ method: "GET" })
    .inputValidator((data: { from?: string; to?: string; modalidad?: string }) => data)
    .handler(async ({ data }) => {
        try {
            let query = (supabase as any).from('listines').select("*");

            if (data.from) {
                query = query.gte("fecha", data.from);
            }
            if (data.to) {
                const toVal = data.to.includes("T") ? data.to : `${data.to}T23:59:59.999Z`;
                query = query.lte("fecha", toVal);
            }
            if (data.modalidad && data.modalidad !== "all") {
                query = (query as any).eq("modalidad", data.modalidad);
            }

            query = query.order("fecha", { ascending: false });

            const { data: rows, error } = await query;

            if (error) throw error;

            return (rows ?? []) as Listin[];
        } catch (err: any) {
            console.error("[DB error en listListines]", err.message);
            throw new Error("Error al obtener listines");
        }
    });
