import { z } from "zod";
import { EmailSchema } from "../common.js";
export const EmailLoginSchema = z.object({
	provider: z.literal("email"),
	email: EmailSchema,
	password: z.string({ error: "password.required" }).min(1, { error: "password.required" }),
	rememberMe: z.boolean(),
});
//# sourceMappingURL=login.js.map
