import { loginServer, getPerfilActualServer } from "@/lib/services/AuthController";
export { getPerfilActualServer };
// ENTRADAS / SALIDAS SERVICES
import { CreateEntradaServer } from "@/lib/services/entradas-salidas-services/CreateEntrada";
import { CreateSalidaServer } from "@/lib/services/entradas-salidas-services/CreateSalida";
import { SelectEntradasSalidasServer } from "@/lib/services/entradas-salidas-services/SelectEntradasSalidas";
import { SelectTipologiaServer } from "@/lib/services/entradas-salidas-services/SelectTipologia";
import { UpdateEntradaServer } from "@/lib/services/entradas-salidas-services/UpdateEntrada";
import { UpdateSalidaServer } from "@/lib/services/entradas-salidas-services/UpdateSalida";
import { VincularSalidaSueltaServer } from "@/lib/services/entradas-salidas-services/VincularSalidaSuelta";
// SERVICES
import { SelectVehicleServer } from "@/lib/services/vehicle-services/SelectVehicle";
import { CreateVehicleServer } from "@/lib/services/vehicle-services/CreateVehicle";
import { UpdateVehicleServer } from "@/lib/services/vehicle-services/UpdateVehicle";
import { DeleteVehicleServer } from "@/lib/services/vehicle-services/DeleteVehicle";
import { SelectChoferServer } from "@/lib/services/chofer-services/SelectChofer";
import { CreateChoferServer } from "@/lib/services/chofer-services/CreateChofer";
import { UpdateChoferServer } from "@/lib/services/chofer-services/UpdateChofer";
import { DeleteChoferServer } from "@/lib/services/chofer-services/DeleteChofer";
import { SelectUserServer } from "./services/users-services/SelectUser";
import { UpdateUserServer } from "./services/users-services/UpdateUser";
import { DeleteUserServer } from "./services/users-services/DeleteUser";
// <---------------------------->
// LISTING SERVICES
import { listListinesServer } from "@/lib/services/listin-services/SelectListin";
import { CreateListinServer } from "@/lib/services/listin-services/CreateListin";
import { DeleteListinServer } from "@/lib/services/listin-services/DeleteListin";
import { selectListinesByMovilizacionServer } from "@/lib/services/listin-services/SelectListinByMovilizacion";
// <---------------------------->
// ORGANIZACION SERVICES
import { SelectOrganizacionServer } from "@/lib/services/organizacion-services/SelectOrganizacion";
// RUTAS SERVICES
import { SelectRutasServer } from "@/lib/services/rutas-services/SelectRutas";
import { CreateRutasServer } from "@/lib/services/rutas-services/CreateRutas";
import { UpdateRutasServer } from "@/lib/services/rutas-services/UpdateRutas";
import { DeleteRutasServer } from "@/lib/services/rutas-services/DeleteRutas";
import { MigrateRutasOrgServer } from "@/lib/services/rutas-services/MigrateRutasOrg";
// MOVILIZACION SERVICES
import { selectMovilizationServer } from "@/lib/services/movilization-services/SelectMovilization";
import { CreateMovilizationServer } from "@/lib/services/movilization-services/CreateMovilization";
import { UpdateMovilizationServer } from "@/lib/services/movilization-services/UpdateMovilization";
import { DeleteMovilizationServer } from "@/lib/services/movilization-services/DeleteMovilization";
import { getControlOperativoServer } from "@/lib/services/movilization-services/GetControlOperativo";
import type { ControlOperativoData } from "@/lib/services/movilization-services/GetControlOperativo";
import { getMovilizationKPIsServer } from "@/lib/services/movilization-services/GetMovilizationKPIs";
import { getMovilizacionDetailServer } from "@/lib/services/movilization-services/GetMovilizacionDetail";
import { getMovilizationMonthlyServer } from "@/lib/services/movilization-services/GetMovilizationMonthly";
import { getControlSemanalServer, type ControlSemanalData } from "@/lib/services/movilization-services/GetControlSemanal";
export type { ControlSemanalData };
// CIERRE DIARIO
import { getCierreDiarioServer, type CierreDiarioResponse } from "@/lib/services/cierre-services/GetCierreDiario";
export type { CierreDiarioResponse };
// DASHBOARD SERVICES
import { DashboardData, getDashboardDataServer } from "@/lib/services/dashboard-services/GetDashboardData";
export type { DashboardData, UltimaMovilizacion } from "@/lib/services/dashboard-services/GetDashboardData";
// <---------------------------->
// FINANCE SERVICES
// CAJA CHICA SERVICES

const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

export type Role = "admin" | "gerente" | "garita";


export interface AuthUser {
  id?: string;
  name: string;
  username: string;
  role: Role;
}

export type VehicleType = "encava" | "por puesto" | "colectivo";

export type VehicleState = "activo" | "inactivo" | "mantenimiento";

export interface Vehicle {
  placa: string;
  marca: string;
  modelo: string;
  cedula_propietario: string;
  propietario: string;
  tipo: VehicleType;
  cantidad_puestos: 32 | 5 | 60 | 20 | null;
  id_organizacion?: string | null;
  organizacion_nombre?: string | null;
}

//USER
export interface Users {
  id: string | null;
  nombre: string;
  usuario: string;
  rol: string;
}

export type Modalidad = "masivo" | "puesto" | "urbana" | "suburbana" | "interurbana";
export type MetodoPago = "pago_movil" | "efectivo" | "transferencia" | "punto_venta";

export type DIA_RESTRICT = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";

export interface Movilizacion {
  id: number
  dia: string
  fecha: string
  hora: string
  id_ruta: number
  placa_vehiculo: string
  unidades_despachadas: number | null
  entrada_id: number | null
  tipo_servicio: string | null
  total_pasajeros: number | null
  total_tasas: number | null
  estado: string | null
  ruta_nombre?: string | null
  ruta_origen?: string | null
  ruta_destino?: string | null
  hora_entrada?: string | null
  hora_salida?: string | null
}

export interface MovilizacionKPI {
  totalMovilizado: number
  totalDespachados: number
  totalSuspendidos: number
  totalPuestos: number
  totalPuestosEntrada: number
  totalPuestosSalida: number
  totalPasajesHoy: number
  vehiculoMasUsado: string
}

export interface MovilizacionMonthly {
  mes: string
  total: number
}

export interface Listin {
  id?: number;
  fecha?: string;
  modalidad: Modalidad;
  metodoPago: MetodoPago;
  monto: number;
  organizacion: string;
  propietario: string;
  cedula: string;
  chofer: string;
  placa: string;
  marca: string;
  modelo: string;
  capacidad: number;
  recaudadorId?: number;
  recaudadorNombre?: string;
}

const TOKEN_KEY = "tap_token";
const USER_KEY = "tap_user";

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setSession: (token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = auth.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

// --- Demo / mock fallback so the UI works before Flask is connected ---
// const DEMO_USERS: Array<AuthUser & { password: string }> = [
//   { id: 1, username: "admin", password: "admin123", name: "Administrador General", role: "admin" },
//   { id: 2, username: "recaudador", password: "rec123", name: "Recaudador", role: "recaudador" },
// ];

const LISTINES_KEY = "tap_listines_demo";
function readListines(): Listin[] {
  try {
    return JSON.parse(localStorage.getItem(LISTINES_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeListines(items: Listin[]) {
  localStorage.setItem(LISTINES_KEY, JSON.stringify(items));
}

const USE_MOCK = !import.meta.env.VITE_API_URL;

export const api = {
  // POST /auth/login -> { token, user }
  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    return loginServer({ data: { username, password } });
  },

  // GET /listines?from=&to=&modalidad=
  async listListines(params: { from?: string; to?: string; modalidad?: Modalidad | "all" } = {}): Promise<Listin[]> {
    return listListinesServer({
      data: {
        from: params.from,
        to: params.to,
        modalidad: params.modalidad,
      },
    });
  },

  async createListin(data: {
    id_movilizacion: number;
    asiento_numero: number;
    cedula: string;
    nombres: string;
    telefono?: string;
    destino?: string;
    monto: number;
    id_organizacion?: string;
  }) {
    return CreateListinServer({ data });
  },

  async deleteListin(id: number) {
    return DeleteListinServer({ data: { id } });
  },

  async selectListinesByMovilizacion(id_movilizacion: number) {
    return selectListinesByMovilizacionServer({ data: { id_movilizacion } });
  },

  // MOVILIZACIONES
  async selectMovilizacion(params: {
    month?: number; year?: number; filterDate?: string; page?: number; pageSize?: number;
  } = {}): Promise<{ rows: any[]; count: number }> {
    return selectMovilizationServer({ data: params });
  },

  async createMovilization(data: {
    id_ruta: number;
    placa_vehiculo: string;
    id_organizacion?: string | null;
    id_chofer_cedula?: number | null;
    anden?: string | null;
    entrada_id?: number | null;
  }) {
    return CreateMovilizationServer({ data });
  },
  async updateMovilizacion(data: { id: number; estado?: string }) {
    return UpdateMovilizationServer({ data });
  },
  async deleteMovilizacion(data: { id: number; tipo?: string }) {
    return DeleteMovilizationServer({ data });
  },
  async getMovilizacionDetail(data: { id: number }) {
    return getMovilizacionDetailServer({ data });
  },
  async getControlOperativo(data: { from: string; to: string }): Promise<ControlOperativoData> {
    return getControlOperativoServer({ data });
  },
  async getControlSemanal(data: { from: string; to: string }): Promise<ControlSemanalData> {
    return getControlSemanalServer({ data });
  },
  async getMovilizacionKPIs(): Promise<MovilizacionKPI> {
    return getMovilizationKPIsServer();
  },
  async getMovilizacionMonthly(params: { year?: number } = {}): Promise<MovilizacionMonthly[]> {
    return getMovilizationMonthlyServer({ data: params });
  },

  // DASHBOARD
  async getDashboardData(): Promise<DashboardData> {
    return getDashboardDataServer();
  },

  // CIERRE DIARIO
  async getCierreDiario(fecha: string): Promise<CierreDiarioResponse> {
    return getCierreDiarioServer({ data: { fecha } });
  },

  // GET /usuario
  async selectUser(): Promise<Users[]> {
    return SelectUserServer();
  },

  // POST /usuario/update
  async updateUser(data: {
    userId: string;
    nombre: string;
    usuario: string;
    contrasena: string;
    rol: string;
  }) {
    return UpdateUserServer({ data });
  },

  // POST /usuario/delete
  async deleteUser(id: string) {
    return DeleteUserServer({ data: { id } });
  },


  // ORGANIZACIONES
  async selectOrganizaciones() {
    return SelectOrganizacionServer();
  },

  // RUTAS
  async selectRutas(): Promise<any[]> {
    return SelectRutasServer();
  },
  async createRutas(data: {
    origen?: string | null;
    destino?: string | null;
    distancia_km?: number | null;
    id_organizacion?: string;
  }): Promise<any> {
    return CreateRutasServer({ data });
  },
  async updateRutas(data: {
    id: number;
    origen?: string | null;
    destino?: string | null;
    distancia_km?: number | null;
    id_organizacion?: string;
  }): Promise<any> {
    return UpdateRutasServer({ data });
  },
  async deleteRutas(id: number): Promise<{ success: boolean }> {
    return DeleteRutasServer({ data: { id } });
  },
  async migrateRutasOrg(): Promise<{ updated: number; skipped: number }> {
    return MigrateRutasOrgServer();
  },

  // GET /vehiculos
  async selectVehicle(): Promise<Vehicle[]> {
    return SelectVehicleServer();
  },

  // POST /vehiculos
  async createVehicle(data: {
    placa: string;
    marca: string;
    modelo: string;
    cedula_propietario: string;
    propietario: string;
    tipo: VehicleType;
    cantidad_puestos: 32 | 5 | 60 | 20;
    organizacion_nombre?: string;
    organizacion_rif?: string;
    id_organizacion?: string | null;
  }) {
    return CreateVehicleServer({ data });
  },

  // POST /vehiculos/update
  async updateVehicle(data: {
    placa: string;
    marca: string;
    modelo: string;
    cedula_propietario: string;
    propietario: string;
    tipo: VehicleType;
    cantidad_puestos: 32 | 5 | 60 | 20;
    id_organizacion?: string | null;
    organizacion_nombre?: string | null;
    organizacion_rif?: string | null;
  }) {
    return UpdateVehicleServer({ data });
  },

  // POST /vehiculos/delete (soft delete)
  async deleteVehicle(placa: string) {
    return DeleteVehicleServer({ data: { placa } });
  },

  // CHOFER
  async selectChofer(): Promise<any[]> {
    return SelectChoferServer();
  },
  async createChofer(data: {
    nombres: string;
    cedula?: number | null;
    placa_unidad?: string | null;
  }) {
    return CreateChoferServer({ data });
  },
  async updateChofer(data: { id: number } & any): Promise<any> {
    return UpdateChoferServer({ data });
  },
  async deleteChofer(id: number) {
    return DeleteChoferServer({ data: { id } });
  },

  // ENTRADAS / SALIDAS
  async selectTipologias(): Promise<any[]> {
    return SelectTipologiaServer();
  },

  async createEntrada(data: {
    id_tipologia: number;
    id_organizacion: string;
    id_ruta?: number | null;
    id_chofer: number;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    serial_listin?: string | null;
  }) {
    return CreateEntradaServer({ data });
  },

  async createSalida(data: {
    id_tipologia: number;
    id_organizacion: string;
    id_ruta?: number | null;
    id_chofer: number;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    total_tasas: number;
    serial_listin?: string | null;
    tipo_servicio_salida?: string | null;
  }) {
    return CreateSalidaServer({ data });
  },

  async selectEntradasSalidas(params: { from?: string; to?: string } = {}): Promise<any[]> {
    return SelectEntradasSalidasServer({ data: params });
  },

  async vincularSalidaSuelta(data: { salidaId: number; horaEntrada: string }) {
    return VincularSalidaSueltaServer({ data });
  },

  async updateEntrada(data: {
    id: number;
    id_tipologia?: number | null;
    id_organizacion?: string | null;
    id_ruta?: number | null;
    id_chofer?: number | null;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    tipo_servicio?: string | null;
    serial_listin?: string | null;
  }) {
    return UpdateEntradaServer({ data });
  },

  async updateSalida(data: {
    id: number;
    id_tipologia?: number | null;
    id_organizacion?: string | null;
    id_ruta?: number | null;
    id_chofer?: number | null;
    placa_vehiculo?: string | null;
    puestos_ocupados?: number | null;
    total_tasas?: number | null;
    serial_listin?: string | null;
    tipo_servicio_salida?: string | null;
  }) {
    return UpdateSalidaServer({ data });
  },

};

export const MODALIDADES: { value: Modalidad; label: string }[] = [
  { value: "masivo", label: "Masivo" },
  { value: "puesto", label: "Por Puesto" },
  { value: "urbana", label: "Urbana" },
  { value: "suburbana", label: "Suburbana" },
  { value: "interurbana", label: "Interurbana" },
];

export const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "punto_venta", label: "Punto de Venta" },
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  gerente: "Gerente de Operaciones",
  garita: "Garita",
};
