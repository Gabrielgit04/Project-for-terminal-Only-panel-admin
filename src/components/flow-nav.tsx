import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { IconBus, IconUser, IconRoute, IconDoorEnter, IconReportAnalytics } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface FlowNavProps {
  next?: { label: string; to: string };
}

const steps = [
  { label: "Vehículos", to: "/admin/vehicle" },
  { label: "Choferes", to: "/admin/chofer" },
  { label: "Rutas", to: "/admin/rutas" },
  { label: "Garita", to: "/admin/entradas-salidas" },
  { label: "Movilizaciones", to: "/admin/movilizacion" },
];

export function FlowBar({ next }: FlowNavProps) {
  const currentIndex = next
    ? steps.findIndex((s) => s.to === next.to) - 1
    : steps.length - 1;

  return (
    <div className="flex items-center justify-between rounded-xl border-2 bg-card px-5 py-4 mt-6 shadow-sm">
      <div className="flex items-center gap-3 text-sm">
        {steps.map((s, i) => {
          const icons = [
            <IconBus key="bus" className="h-3.5 w-3.5" />,
            <IconUser key="user" className="h-3.5 w-3.5" />,
            <IconRoute key="route" className="h-3.5 w-3.5" />,
            <IconDoorEnter key="door" className="h-3.5 w-3.5" />,
            <IconReportAnalytics key="report" className="h-3.5 w-3.5" />,
          ];
          return (
            <span key={s.to} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/30 mx-1">→</span>}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                  i === currentIndex
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : i < currentIndex
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground/50"
                }`}
              >
                {icons[i]}
                <span>{s.label}</span>
              </span>
            </span>
          );
        })}
      </div>
      {next ? (
        <Link to={next.to}>
          <Button size="default" className="gap-2 shadow-sm">
            Ir a {next.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg px-4 py-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>Flujo completado</span>
        </div>
      )}
    </div>
  );
}
