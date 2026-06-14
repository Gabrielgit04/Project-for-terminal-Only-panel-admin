import { createServerFn } from "@tanstack/react-start";

export const getBcvRateServer = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
      if (!res.ok) throw new Error(`BCV API error: ${res.status}`);
      const json: { promedio: number; fechaActualizacion: string } = await res.json();
      return { rate: json.promedio, date: json.fechaActualizacion };
    } catch (err: any) {
      console.error("[BCV API]", err.message);
      return { rate: null, date: null };
    }
  });
