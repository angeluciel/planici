import { z } from "zod";
import { EmailSchema } from "../common";

export const LoginSchema = z.object({
	email: EmailSchema,
	password: z.string({ error: "password.required" }).min(1, { error: "password.required" }),
});

export type LoginInput = z.input<typeof LoginSchema>;
export type LoginData = z.output<typeof LoginSchema>;
