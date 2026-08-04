/**
 * Utilidad de tracing para Cloudflare Workers (observability).
 *
 * Crea spans personalizados que aparecen en Workers Trace Logs y se
 * correlacionan con cada request. Fuera de Workers (dev en Node o tests)
 * no hace nada: ejecuta la función recibida sin cambios de comportamiento.
 */

import type { RequestContext, TraceSpan } from "cloudflare:workers";

let getRequestContextFn: (() => RequestContext | undefined) | null | undefined;

async function getTraceContext(): Promise<RequestContext | null> {
  if (getRequestContextFn === undefined) {
    try {
      const mod = await import("cloudflare:workers");
      getRequestContextFn = mod.getRequestContext ?? null;
    } catch {
      getRequestContextFn = null;
    }
  }
  if (!getRequestContextFn) return null;
  try {
    return getRequestContextFn() ?? null;
  } catch {
    return null;
  }
}

/**
 * Ejecuta `fn` dentro de un span de trace con el nombre dado y atributos
 * opcionales. Si la plataforma no soporta tracing (dev en Node, tests) o el
 * span no se pudo crear, ejecuta `fn` directamente.
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  let span: TraceSpan | null | undefined;
  try {
    const ctx = await getTraceContext();
    span = ctx?.traces?.newSpan?.(name);
  } catch {
    span = null;
  }

  if (!span) return fn();

  if (attributes) {
    try {
      span.setAttributes(attributes);
    } catch {
      // Atributos opcionales — ignorar errores
    }
  }

  try {
    if (typeof span.async === "function") {
      return await span.async(fn);
    }
    return await fn();
  } finally {
    try {
      span.end();
    } catch {
      // El span ya fue finalizado por async — ignorar
    }
  }
}
