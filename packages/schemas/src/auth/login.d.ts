import { z } from "zod";
export declare const EmailLoginSchema: z.ZodObject<
	{
		provider: z.ZodLiteral<"email">;
		email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
		password: z.ZodString;
		rememberMe: z.ZodBoolean;
	},
	z.core.$strip
>;
export type EmailLoginInput = z.input<typeof EmailLoginSchema>;
export type EmailLoginData = z.output<typeof EmailLoginSchema>;
//# sourceMappingURL=login.d.ts.map
