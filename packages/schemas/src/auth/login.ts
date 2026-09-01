import { z } from "zod";
import { EmailSchema } from "../common";

export const EmailLoginSchema = z.object({
	provider: z.literal("email"),
	email: EmailSchema,
	password: z.string({ error: "password.required" }).min(1, { error: "password.required" }),
	rememberMe: z.boolean(),
});

export type EmailLoginInput = z.input<typeof EmailLoginSchema>;
export type EmailLoginData = z.output<typeof EmailLoginSchema>;
