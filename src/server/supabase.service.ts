import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withSpan } from "./trace";

let _supabase: SupabaseClient<Database> | null = null;

/** Tiempo máximo (en ms) que una petición a Supabase puede tardar antes de abortarse. */
export const SUPABASE_TIMEOUT_MS = 15000;

/** fetch con timeout vía AbortController para que un Supabase lento no colgue el Worker. */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  return fetch(input as RequestInfo, { ...(init ?? {}), signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/**
 * Resuelve variables de entorno de forma compatible con Node.js (dev) y
 * Cloudflare Workers (producción). En Workers, `process.env` puede no
 * exponer los secrets configurados vía `wrangler secret put`; este helper
 * intenta también los bindings del Worker como fallback.
 */
function getEnv(key: string): string | undefined {
  // 1. process.env — funciona en Node.js (dev) y en Workers con nodejs_compat
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;

  // 2. Cloudflare Workers bindings — algunos setups exponen env vía globalThis
  try {
    const g = globalThis as Record<string, unknown>;
    const cfEnv = (g.env ?? g.__env ?? (g.cf as Record<string, unknown>)?.env) as
      | Record<string, string>
      | undefined;
    if (cfEnv?.[key]) return cfEnv[key];
  } catch {
    // Ignorado: no estamos en un Worker o no hay bindings disponibles
  }

  return undefined;
}

function getSupabase(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  const supabaseUrl = getEnv("VITE_SUPABASE_URL");
  const supabaseKey = getEnv("SUPABASE_ROLE_KEY");

  if (!supabaseUrl && !supabaseKey) {
    throw new Error(
      "[Supabase] VITE_SUPABASE_URL y SUPABASE_ROLE_KEY no están disponibles. " +
        "En Cloudflare Workers, verifica que el secret esté configurado con `wrangler secret put SUPABASE_ROLE_KEY`.",
    );
  }
  if (!supabaseUrl) {
    throw new Error("[Supabase] Falta VITE_SUPABASE_URL en el entorno del servidor.");
  }
  if (!supabaseKey) {
    throw new Error(
      "[Supabase] Falta SUPABASE_ROLE_KEY en el entorno del servidor. " +
        "En Cloudflare Workers, ejecuta `wrangler secret put SUPABASE_ROLE_KEY`.",
    );
  }

  _supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout as any },
    // Reintentos limitados para no multiplicar la latencia bajo carga.
    db: { schema: "public" },
  });
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
  set(_, prop, value) {
    (getSupabase() as any)[prop] = value;
    return true;
  },
});

export interface AuthContext {
  user: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * Extrae el JWT del header Authorization del Request HTTP que TanStack Start
 * pone disponible en cada server function (ctx.request), lo valida contra
 * Supabase Auth y devuelve los datos del usuario. Si el token no existe o es
 * inválido, devuelve null. Es la única función que debería usar el cliente
 * admin (service role) para verificar la identidad real del usuario.
 */
export async function getAuthUserFromRequest(request?: Request): Promise<AuthContext | null> {
  return withSpan("getAuthUserFromRequest", async () => {
    if (!request) return null;
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return null;
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    const { data, error } = await getSupabase().auth.getUser(token);
    if (error || !data.user) {
      console.error(
        "[getAuthUserFromRequest] getUser falló:",
        error?.message ?? "usuario no encontrado",
      );
      return null;
    }

    const email = data.user.email || "";
    const username = email.split("@")[0] || data.user.user_metadata?.username || "";

    const { data: dbUser } = await getSupabase()
      .from("usuario")
      .select("usuario, rol")
      .ilike("usuario", username.toLowerCase())
      .maybeSingle();

    return {
      user: {
        id: data.user.id,
        username: dbUser?.usuario || username,
        role: dbUser?.rol || data.user.user_metadata?.role || "",
      },
    };
  });
}
