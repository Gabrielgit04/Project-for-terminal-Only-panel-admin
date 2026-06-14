import { z } from "zod";

const passwordMinLength = 6;
const passwordMaxLength = 100;

export const createUserSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es obligatorio", invalid_type_error: "El nombre debe ser texto" })
    .min(1, "El nombre no puede estar vacío")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  usuario: z
    .string({ required_error: "El usuario es obligatorio", invalid_type_error: "El usuario debe ser texto" })
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(50, "El usuario no puede exceder 50 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos"),
  contrasena: z
    .string({ required_error: "La contraseña es obligatoria", invalid_type_error: "La contraseña debe ser texto" })
    .min(passwordMinLength, `La contraseña debe tener al menos ${passwordMinLength} caracteres`)
    .max(passwordMaxLength, `La contraseña no puede exceder ${passwordMaxLength} caracteres`),
  rol: z
    .enum(["admin", "gerente", "garita", "recaudador"], {
      required_error: "El rol es obligatorio",
      invalid_type_error: "El rol debe ser 'admin', 'gerente', 'garita' o 'recaudador'",
      message: "El rol debe ser 'admin', 'gerente', 'garita' o 'recaudador'",
    }),
});

export const updateUserSchema = z.object({
  id: z.number({ required_error: "El ID del usuario es obligatorio" }).int("El ID debe ser un número entero").positive("El ID debe ser un número positivo"),
  nombre: z
    .string({ required_error: "El nombre es obligatorio", invalid_type_error: "El nombre debe ser texto" })
    .min(1, "El nombre no puede estar vacío")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  usuario: z
    .string({ required_error: "El usuario es obligatorio", invalid_type_error: "El usuario debe ser texto" })
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(50, "El usuario no puede exceder 50 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos"),
  contrasena: z
    .string()
    .max(passwordMaxLength, `La contraseña no puede exceder ${passwordMaxLength} caracteres`)
    .optional()
    .default(""),
  rol: z
    .enum(["admin", "gerente", "garita", "recaudador"], {
      required_error: "El rol es obligatorio",
      invalid_type_error: "El rol debe ser 'admin', 'gerente', 'garita' o 'recaudador'",
      message: "El rol debe ser 'admin', 'gerente', 'garita' o 'recaudador'",
    }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
