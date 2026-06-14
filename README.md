# Terminal Alí Primera — Sistema de Gestión

Sistema para administrar las operaciones diarias del **Terminal de Pasajeros Alí Primera**. Controla la entrada y salida de unidades, registra pasajeros, gestiona rutas, conductores y vehículos, y genera reportes operativos.

> Construido con **React + TypeScript** y **Supabase** como base de datos.

---

## Que hace este sistema

- **Registrar cada autobus que entra y sale** del terminal, con su placa, conductor, ruta y cantidad de pasajeros.
- **Saber en todo momento que unidades estan** en espera, en anden o en transito.
- **Clasificar los viajes** como suburbanos (cortos, locales) o interurbanos (larga distancia, otros estados).
- **Llevar la cuenta de pasajeros** que llegan (desembarque) y los que salen, junto con las tasas cobradas.
- **Administrar conductores, vehiculos y rutas**, dandolos de alta, editandolos o eliminandolos.
- **Visualizar reportes** diarios, semanales y mensuales con graficos y totales.
- **Controlar quien accede** al sistema mediante roles de usuario.

Todo desde una interfaz web moderna, rapida y accesible desde cualquier computadora con internet.

---

## Como funciona (para no programadores)

Piensa en el sistema como un **libro de control digital** con varias secciones:

### Garita (Entradas y Salidas)
Es como un **cuaderno de bitacora**. Cada vez que un autobus llega al terminal, el operador de garita **registra una entrada**: anota la placa, el conductor, cuantos pasajeros trajo (desembarque), la ruta que hizo y si el servicio es suburbano (local) o interurbano (larga distancia). Cuando el autobus se va, **registra una salida**: anota los mismos datos mas las tasas cobradas.

El sistema intenta emparejar automaticamente cada salida con una entrada que tenga la misma placa, para llevar la trazabilidad del viaje. Pero tambien se puede registrar una salida sin entrada previa (por ejemplo, un autobus que inicia su ruta desde el terminal).

### Movilizaciones
Es el **panel de control operativo**. Aqui se ve una lista combinada de todas las entradas y salidas del dia o del mes. Cada fila tiene un badge que indica si es una **E** (Entrada, el bus llego) o una **S** (Salida, el bus se fue). Tambien se muestran indicadores como:
- **Total hoy**: cuantos eventos (entradas + salidas) han ocurrido.
- **Despachados**: cuantos buses han salido.
- **Usuarios totales**: la suma de pasajeros que llegaron (entrada) y los que se fueron (salida).
- **Vehiculo mas usado**: la placa del bus que mas viajes ha hecho.

Ademas, hay una pestana **Control Semanal** que agrupa los datos por fecha y muestra unidades, usuarios, desembarques y tasas recaudadas.

### Rutas
Es el **catalogo de destinos**. Aqui se configuran las rutas que operan en el terminal: origen, destino y a que organizacion (empresa de transporte) pertenecen.

### Conductores
Es el **registro de choferes**. Se almacena su nombre completo, cedula y la placa de la unidad que manejan.

### Vehiculos
Es el **inventario de autobuses**. Cada vehiculo tiene placa, marca, modelo, tipo (encava, por puesto, colectivo) y capacidad de puestos.

### Usuarios
Son las **personas que pueden usar el sistema**: administradores (acceso total), gerentes y personal de garita. Cada uno tiene su nombre de usuario y contrasena.

---

## Modulos del Sistema

### Garita — Entradas y Salidas

Control de acceso de unidades al terminal. Permite:

- **Registrar entrada**: cuando un autobus llega, se registra con tipologia (cantidad de puestos), organizacion, ruta, chofer, placa, desembarque (pasajeros que bajan), serial de listin y tipo de servicio (suburbano/interurbano).
- **Registrar salida**: cuando un autobus se va, se registran los mismos datos mas las tasas cobradas. Si existe una entrada con la misma placa en estado "en espera", se vinculan automaticamente.
- **Editar registros**: cada fila tiene un boton para corregir datos.
- **Resumen operativo**: panel lateral que muestra totales de unidades, pasajeros y tasas, separados por suburbanos e interurbanos.
- **Cierre de turno**: tarjeta con totales consolidados del periodo seleccionado.

### Movilizaciones

Panel de control y monitoreo. Dos vistas:

**Control Operativo:**
- Lista combinada de entradas y salidas, identificadas con badge **E** (azul) o **S** (naranja).
- KPIs del dia: total movilizado, despachados, suspendidos, usuarios totales (entrada + salida), vehiculo mas usado.
- Filtro por hoy o por mes/ano.
- Detalle de cada registro al hacer clic (ID, numero de listin, hora de salida).
- Grafico mensual de flujo de movilizaciones.

**Control Semanal:**
- KPIs consolidados del rango seleccionado: unidades, usuarios, desembarques, recaudacion.
- Tabla detallada agrupada por fecha con desglose por unidad.
- Graficos por tipologia y tendencia semanal.
- Exportacion a PDF.

### Rutas

Catalogo de destinos. CRUD completo con busqueda de organizacion por RIF.

### Conductores

Registro de choferes con busqueda por nombre o cedula. CRUD completo.

### Vehiculos

Inventario de autobuses con asignacion automatica de puestos segun el tipo. CRUD completo.

### Usuarios

Gestion de acceso al sistema. CRUD completo con asignacion de rol.

### Dashboard

Resumen operativo con tarjetas de movilizaciones activas, vehiculos operativos, choferes disponibles y rutas cubiertas. Graficos de rutas mas demandadas y horas pico. Ultimas movilizaciones registradas.

---

## Flujo de Operaciones

### Ciclo tipico de un autobus

```
1. El autobus llega al terminal
2. Se registra una ENTRADA en Garita
   - Placa, conductor, ruta, pasajeros que bajan (desembarque)
   - Tipo de servicio: suburbano o interurbano
   - Serial de listin (opcional)
   - Estado: "en_espera"
3. El autobus espera en el terminal
4. El autobus sale del terminal
5. Se registra una SALIDA en Garita
   - Mismos datos que la entrada, mas tasas cobradas
   - Se vincula automaticamente con la entrada (por placa)
   - La entrada cambia a estado: "despachado"
6. Aparece en Movilizaciones como "despachado"
```

Tambien es posible registrar una **salida sin entrada** (autobus que inicia su recorrido desde el terminal). En ese caso, aparece en movilizaciones como un registro tipo **S** (salida suelta).

### Clasificacion suburbano / interurbano

| Tipo | Descripcion | Ejemplos |
|------|-------------|----------|
| **Suburbano** | Rutas locales dentro del estado Falcon | Judibana, Santa Elena, Cardon, Las Piedras, Los Taques, Adicora, Pueblo Nuevo, La Vela |
| **Interurbano** | Rutas a otros estados o ciudades lejanas | Caracas, Maracaibo, Valencia, Barquisimeto, Portuguesa, Lara, etc. |

El usuario puede seleccionar manualmente el tipo de servicio en el formulario. Si no se selecciona, el sistema lo deduce segun el destino.

---

## Zona Horaria

Todo el sistema opera en la zona horaria **America/Caracas** (UTC -4). Las horas se muestran siempre en hora de Venezuela, independientemente de la ubicacion del servidor o del navegador.

---

## Autenticacion y Roles

El sistema cuenta con autenticacion por usuario y contrasena, con tres niveles de acceso:

| Rol | Acceso |
|-----|--------|
| **admin** | Acceso completo a todas las secciones |
| **gerente** | Acceso operativo (dashboard, movilizaciones, reportes) |
| **garita** | Solo registro de entradas y salidas |

---

## Stack Tecnologico

| Tecnologia | Uso |
|------------|-----|
| **React 19 + TypeScript** | Interfaz de usuario |
| **TanStack Start / Router** | Framework full-stack y navegacion |
| **Tailwind CSS + shadcn/ui** | Estilos y componentes visuales |
| **Recharts** | Graficos |
| **jsPDF** | Generacion de reportes PDF |
| **Supabase (PostgreSQL)** | Base de datos |
| **Bun / Node.js** | Entorno de ejecucion |

---

## Instalacion

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd al-primera-terminal-manager-main

# Instalar dependencias
bun install

# Configurar variables de entorno en el archivo .env

# Iniciar en modo desarrollo
bun run dev
```

### Construir para produccion

```bash
bun run build
```

El resultado se genera en la carpeta `dist/`.

---

## Licencia

Uso interno — Terminal de Pasajeros Ali Primera.
