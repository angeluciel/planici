import { z } from "zod";

export const EmailSchema = z
	.string({ error: "email.required" })
	.trim()
	.min(1, { error: "email.required" })
	.pipe(z.email({ error: "email.invalid" }))
	.transform((email) => email.toLowerCase());
