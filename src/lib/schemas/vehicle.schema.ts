import { z } from "zod";

export const placaRegex = /^[A-Z0-9-]{4,15}$/;

export const createVehicleSchema = z.object({
  placa: z
    .string({ required_error: "La placa es obligatoria", invalid_type_error: "La placa debe ser texto" })
    .min(1, "La placa no puede estar vacía")
    .regex(placaRegex, "La placa debe tener entre 4 y 15 caracteres (solo mayúsculas, números y guiones)"),
  marca: z
    .string({ required_error: "La marca es obligatoria", invalid_type_error: "La marca debe ser texto" })
    .min(1, "La marca no puede estar vacía")
    .max(50, "La marca no puede exceder 50 caracteres"),
  modelo: z
    .string({ required_error: "El modelo es obligatorio", invalid_type_error: "El modelo debe ser texto" })
    .min(1, "El modelo no puede estar vacío")
    .max(50, "El modelo no puede exceder 50 caracteres"),
  cedula_propietario: z
    .string({ required_error: "La cédula del propietario es obligatoria" })
    .min(1, "La cédula no puede estar vacía")
    .max(20, "La cédula no puede exceder 20 caracteres"),
  propietario: z
    .string({ required_error: "El propietario es obligatorio", invalid_type_error: "El propietario debe ser texto" })
    .min(1, "El propietario no puede estar vacío")
    .max(100, "El propietario no puede exceder 100 caracteres"),
  tipo: z
    .enum(["encava", "por puesto", "colectivo"], {
      required_error: "El tipo es obligatorio",
      invalid_type_error: "El tipo debe ser 'encava', 'por puesto' o 'colectivo'",
    }),
  cantidad_puestos: z
    .union([z.literal(32), z.literal(5), z.literal(60), z.literal(20)]),
  organizacion_nombre: z
    .string()
    .max(100, "El nombre de la organización no puede exceder 100 caracteres")
    .optional()
    .default(""),
  organizacion_rif: z
    .string()
    .max(50, "El RIF no puede exceder 50 caracteres")
    .optional()
    .default(""),
  id_organizacion: z
    .string()
    .nullable()
    .optional(),
});

export const updateVehicleSchema = createVehicleSchema.extend({
  id: z.number({ required_error: "El ID del vehículo es obligatorio" }).int("El ID debe ser un número entero").positive("El ID debe ser un número positivo"),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
