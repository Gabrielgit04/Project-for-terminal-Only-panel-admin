# Registro de Cambios — Terminal Alí Primera

## Roles de usuario

- Renombrados: `admin` → `gerente`, `gerente` → `asistente`
- Agregados: `presidente`, `coordinador`
- Eliminado el mapeo inverso (`ROLE_MAP`) en `AuthController.ts` y `SelectUser.ts` (la BD ya almacena los valores nuevos directamente)
- Actualizadas todas las validaciones de rol en: sidebar, página de vehículos, gestión de usuarios, gate de autenticación
- Corregidos identificadores en navegación del sidebar: `"gerente_operaciones"` → `"gerente"`, `"asistente_operaciones"` → `"asistente"`

## Gestión de usuarios

- `UpdateUser.ts`: coordinador/gerente no pueden modificar la contraseña de presidente
- `admin.users.tsx`: botones de editar/eliminar ocultos para presidente cuando el usuario actual es coordinador o gerente
- El campo de nombre capitaliza automáticamente la primera letra de cada palabra (ej. `"juan perez"` → `"Juan Perez"`)
- Valores del selector de roles actualizados para usar los nuevos identificadores

## Entradas / Salidas

- Eliminado el campo `serial_listin` del formulario de entrada (creación y edición); se conserva solo en salida
- Select de tipología reemplazado por `<Input type="number">` en los diálogos de creación y edición
- Agregado estado `puestosInput` para mostrar el valor numérico de puestos
- Al escribir un número, busca automáticamente la tipología que coincida con `cantidad_puestos` y asigna el `id_tipologia` correcto
- Al editar, precarga `puestosInput` desde el valor actual

## Vehículos — valores de tipología

Agregados los valores `23`, `24`, `15`, `4`, `28` al tipo `TipologyValue` en:
- `admin.vehicle.tsx`
- `SelectVehicle.ts`
- `api.ts` (interfaz `Vehicle`, parámetros `createVehicle`/`updateVehicle`)
- `UpdateVehicle.ts` (validador de input)
