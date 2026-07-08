import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/use-auth";
import { auth } from "@/lib/api";
import { toast } from "sonner";
import logoSrc from "@/public/assets/Imagen1.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Terminal Alí Primera" },
      { name: "description", content: "Acceso al panel de gestión del Terminal Alí Primera." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username.trim(), password);
      const user = auth.getUser();
      toast.success(`Bienvenido, ${user?.name ?? "usuario"}`);
      if (user?.role === "garita") {
        navigate({ to: "/admin/entradas-salidas" });
      } else {
        navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-surface)" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--gradient-primary)] p-1.5 shadow-[var(--shadow-elegant)]">
            <img src={logoSrc} alt="Logo" className="h-full w-full rounded-lg object-contain" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Terminal Alí Primera</h1>
          <p className="text-sm text-muted-foreground">Sistema de gestión de operaciones</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-elegant)]"
          autoComplete="off"
        >
          <h2 className="font-display text-lg font-semibold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa tus credenciales para continuar.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="off"
                required
                maxLength={50}

              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                maxLength={100}
              />
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full gap-2" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Acceder
          </Button>

        </form>
      </div>
    </div>
  );
}
