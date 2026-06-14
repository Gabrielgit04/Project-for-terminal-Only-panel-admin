import { ZodError } from "zod";

export function formatZodErrors(error: ZodError): string[] {
  return error.errors.map((e) => {
    const field = e.path.length > 0 ? `"${e.path.join(".")}": ` : "";
    return `${field}${e.message}`;
  });
}

export function formatZodErrorsFlat(error: ZodError): string {
  return formatZodErrors(error).join("\n");
}

export { createVehicleSchema, updateVehicleSchema } from "./vehicle.schema";
export type { CreateVehicleInput, UpdateVehicleInput } from "./vehicle.schema";

export { createUserSchema, updateUserSchema } from "./user.schema";
export type { CreateUserInput, UpdateUserInput } from "./user.schema";
