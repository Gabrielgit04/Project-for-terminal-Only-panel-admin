import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "tap_tour_completed";

export function useTour() {
  function start() {
    const hasSeen = localStorage.getItem(TOUR_KEY);
    if (hasSeen) return;

    const driverObj = createTour();
    setTimeout(() => {
      driverObj.drive();
    }, 500);
  }

  function restart() {
    localStorage.removeItem(TOUR_KEY);
    const driverObj = createTour();
    setTimeout(() => {
      driverObj.drive();
    }, 500);
  }

  return { start, restart };
}

function createTour(): Driver {
  return driver({
    showProgress: true,
    onDestroyed: () => {
      const completed = localStorage.getItem(TOUR_KEY);
      if (!completed) {
        localStorage.setItem(TOUR_KEY, "true");
      }
    },
    steps: [
      {
        element: "[data-tour='vehicle']",
        popover: {
          title: "🚌 1. Registrar Vehículos",
          description:
            "Aquí registrarás los vehículos que operan en el terminal. Cada vehículo tiene una placa, marca, modelo, tipo y organización asociada.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "[data-tour='chofer']",
        popover: {
          title: "👤 2. Registrar Choferes",
          description:
            "Registra los choferes asociados a cada vehículo. Puedes vincular un chofer a una placa específica para que se seleccione automáticamente en garita.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "[data-tour='rutas']",
        popover: {
          title: "🛣️ 3. Registrar Rutas",
          description:
            "Define las rutas (origen → destino) que operan en el terminal. Cada ruta está asociada a una organización.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "[data-tour='entradas-salidas']",
        popover: {
          title: "🚪 4. Garita — Entradas / Salidas",
          description:
            "Registra la entrada y salida de unidades. Al seleccionar un vehículo se completan automáticamente la organización, tipología y chofer. Cada registro crea una movilización automáticamente.",
          side: "right",
          align: "start",
        },
      },
      {
        element: "[data-tour='movilizacion']",
        popover: {
          title: "📊 5. Movilizaciones",
          description:
            "Visualiza el control operativo diario con las movilizaciones creadas automáticamente desde Garita, y el control semanal con KPIs, gráficos y detalle por fecha.",
          side: "right",
          align: "start",
        },
      },
    ],
  });
}
