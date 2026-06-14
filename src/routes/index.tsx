import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bus, ShieldCheck, BarChart3, Ticket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { useEffect } from "react";
import logoSrc from "@/public/assets/Imagen1.png";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Terminal Alí Primera — Gestión de Recaudación" },
      { name: "description", content: "Sistema oficial de venta de listines, control de modalidades y reportes de auditoría del Terminal Alí Primera." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/admin" });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
              <img src={logoSrc} alt="Logo" className="h-full w-full rounded-lg object-contain" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold">Terminal Alí Primera</p>
              <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{ background: "var(--gradient-surface)" }}
        />
        <div className="container mx-auto grid gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <ShieldCheck className="h-3.5 w-3.5" /> Plataforma institucional
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground md:text-5xl">
              Recaudación moderna,{ }
              <span className="bg-[var(--gradient-accent)] bg-clip-text text-transparent">
                auditoría transparente
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Administra la venta de listines, controla las modalidades de transporte y genera
              reportes en PDF con filtros inteligentes — todo desde un panel diseñado para tu equipo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/login">
                  Acceder al sistema <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <FeatureCard icon={Ticket} title="Venta de listines" desc="4 métodos de pago, modalidades y registro vehicular." />
                <FeatureCard icon={BarChart3} title="Reportes PDF" desc="Diarios, semanales y mensuales con gráficos." />
                <FeatureCard icon={ShieldCheck} title="4 roles" desc="Administrador y recaudadores 1, 2 y 3." />
                <FeatureCard icon={Bus} title="5 modalidades" desc="Masivo, puesto, urbana, suburbana, interurbana." />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Terminal Alí Primera. Todos los derechos reservados.
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof Bus; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-secondary/40 p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
