import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/server/db";
import type { AuthUser } from "@/lib/api";

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 3;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

async function verificarBloqueo(username: string): Promise<void> {
  try {
    const { data: user, error } = await supabase
      .from("usuario")
      .select("intentos_login, updated_at")
      .ilike("usuario", username.toLowerCase())
      .maybeSingle();

    if (error || !user) return;

    const intentos = user.intentos_login ?? 0;
    if (intentos < MAX_ATTEMPTS) return;

    const bloqueadoHasta = new Date(user.updated_at ?? Date.now()).getTime() + LOCKOUT_MS;
    const ahora = Date.now();

    if (ahora < bloqueadoHasta) {
      const segundosRestantes = Math.ceil((bloqueadoHasta - ahora) / 1000);
      const minutos = Math.floor(segundosRestantes / 60);
      const segundos = segundosRestantes % 60;
      throw new Error(
        `Demasiados intentos fallidos. Espera ${minutos}m ${segundos}s para intentar de nuevo.`,
      );
    }

    // Bloqueo expirado — reseteamos
    await supabase
      .from("usuario")
      .update({ intentos_login: 0 })
      .ilike("usuario", username.toLowerCase());
  } catch (err: any) {
    if (err.message?.startsWith("Demasiados intentos")) throw err;
    // Error silencioso — columna no existe o problema similar
  }
}

/**
 * Registra un intento fallido de forma condicional para minimizar la condición
 * de carrera: el UPDATE sólo aplica si el valor leído coincide (optimistic locking).
 * Si otro request concurrente modificó `intentos_login` entre la lectura y la
 * escritura, el UPDATE afecta 0 filas y reintentamos re-leyendo. Esto reduce la
 * ventana de carrera de "infinita" (lectura+escritura separadas) a "un round-trip".
 */
async function registrarIntentoFallido(username: string): Promise<number | null> {
  try {
    const user = username.toLowerCase();

    const { data: dbUser, error } = await supabase
      .from("usuario")
      .select("intentos_login, updated_at")
      .ilike("usuario", user)
      .maybeSingle();

    if (error || !dbUser) return null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const leido = dbUser.intentos_login ?? 0;
      const nuevo = Math.min(leido + 1, MAX_ATTEMPTS);

      const { error: updateError, count } = await (supabase as any)
        .from("usuario")
        .update({ intentos_login: nuevo, updated_at: new Date().toISOString() })
        .eq("intentos_login", leido)
        .ilike("usuario", user)
        .select("*", { count: "exact" });

      if (updateError) return null;

      // Si el UPDATE afectó filas, logramos atomicidad condicional.
      if (count && count > 0) {
        if (nuevo >= MAX_ATTEMPTS) return 0;
        return MAX_ATTEMPTS - nuevo;
      }

      // 0 filas afectadas <=> otro request concurrente ganó: re-leemos y retry.
      const { data: reload } = await supabase
        .from("usuario")
        .select("intentos_login")
        .ilike("usuario", user)
        .maybeSingle();
      if (!reload) return null;
      (dbUser as any).intentos_login = reload.intentos_login ?? 0;
    }
    // Si tras 3 intentos seguimos perdiendo la carrera, devolvemos 0 (bloqueado conservadoramente).
    return 0;
  } catch {
    return null;
  }
}

async function resetearIntentos(username: string): Promise<void> {
  try {
    await supabase
      .from("usuario")
      .update({ intentos_login: 0 })
      .ilike("usuario", username.toLowerCase());
  } catch {
    // Silencioso
  }
}

// LOGUEAR USUARIO
export const loginServer = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      const usernameLower = data.username.trim().toLowerCase();

      // 1. Verificar si el usuario está bloqueado
      await verificarBloqueo(usernameLower);

      // 2. Transformamos el username en el email virtual que guardamos en Auth
      const virtualEmail = `${usernameLower}@systemterminal.com`;

      // 3. Autenticamos directamente en el sistema de Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: data.password,
      });

      // Si las credenciales son incorrectas o no existe, manejamos el error
      if (authError || !authData.user) {
        const restantes = await registrarIntentoFallido(usernameLower);
        if (restantes === null) {
          throw new Error("Credenciales inválidas");
        }
        if (restantes === 0) {
          throw new Error(
            `Credenciales inválidas. Has agotado los ${MAX_ATTEMPTS} intentos. Espera ${LOCKOUT_MINUTES} minutos.`,
          );
        }
        throw new Error(
          `Credenciales inválidas. Te quedan ${restantes} intento${restantes === 1 ? "" : "s"}.`,
        );
      }

      // 4. Credenciales correctas — reseteamos intentos
      await resetearIntentos(usernameLower);

      const user = authData.user;
      const userRole = user.user_metadata?.role || user.app_metadata?.role || "";

      // 5. Validación estricta de rol para el panel de administración
      if (
        userRole !== "presidente" &&
        userRole !== "coordinador" &&
        userRole !== "gerente" &&
        userRole !== "asistente" &&
        userRole !== "garita"
      ) {
        await supabase.auth.signOut();
        throw new Error("No tienes permisos para acceder al sistema");
      }

      // Buscamos el nombre del usuario en la tabla local 'usuario'
      const { data: dbUser } = await supabase
        .from("usuario")
        .select("nombre")
        .ilike("usuario", usernameLower)
        .maybeSingle();

      // 6. Retornamos la sesión con el JWT seguro de Supabase y el ID tipo UUID
      return {
        token: authData.session?.access_token,
        user: {
          id: user.id,
          username: user.user_metadata?.username || data.username,
          name:
            dbUser?.nombre ||
            user.user_metadata?.nombre ||
            user.user_metadata?.name ||
            data.username,
          role: userRole as any,
        } as AuthUser,
      };
    } catch (err: any) {
      console.error("[Auth error en login]", err.message);

      if (
        err.message === "No tienes permisos para acceder al sistema" ||
        err.message.startsWith("Demasiados intentos") ||
        err.message.startsWith("Credenciales inválidas")
      ) {
        throw err;
      }

      throw new Error("Error en el proceso de autenticación");
    }
  });

export const getPerfilActualServer = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) return null;

    const emailVirtual = authUser.email || "";
    const username = emailVirtual.split("@")[0] || authUser.user_metadata?.username;

    if (!username) return null;

    const { data: dbUser } = await supabase
      .from("usuario")
      .select("nombre, usuario, rol")
      .ilike("usuario", username.toLowerCase())
      .maybeSingle();

    if (!dbUser) return null;

    return {
      id: authUser.id,
      username: dbUser.usuario || username,
      name: dbUser.nombre,
      role: (dbUser.rol ?? "") as any,
    };
  } catch (err) {
    console.error("Error en getPerfilActualServer:", err);
    return null;
  }
});
