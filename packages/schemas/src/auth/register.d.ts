import { z } from "zod";
export declare const PASSWORD_MIN_LENGTH = 8;
export declare const PASSWORD_HAS_NUMBER: RegExp;
export declare const PASSWORD_HAS_SYMBOL: RegExp;
export declare const SLUG_PATTERN: RegExp;
export declare const CreateUser: z.ZodObject<
	{
		email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
		name: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
		surname: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
		password: z.ZodString;
		confirmPassword: z.ZodString;
		slug: z.ZodString;
	},
	z.core.$strip
>;
export declare const AccountStepSchema: z.ZodObject<
	{
		email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
	},
	z.core.$strip
>;
export declare const PasswordStepSchema: z.ZodObject<
	{
		password: z.ZodString;
		confirmPassword: z.ZodString;
	},
	z.core.$strip
>;
export declare const TermsStepSchema: z.ZodObject<
	{
		acceptedTerms: z.ZodLiteral<true>;
		marketingOptIn: z.ZodBoolean;
	},
	z.core.$strip
>;
export declare const ProfileStepSchema: z.ZodObject<
	{
		name: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
		surname: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
		slug: z.ZodString;
	},
	z.core.$strip
>;
export declare const EMAIL_CODE_LENGTH = 6;
export declare const EMAIL_CODE_PATTERN: RegExp;
export declare const VerifyEmailStepSchema: z.ZodObject<
	{
		code: z.ZodString;
	},
	z.core.$strip
>;
export type CreateUserInput = z.infer<typeof CreateUser>;
export type AccountStepValues = z.infer<typeof AccountStepSchema>;
export type PasswordStepValues = z.infer<typeof PasswordStepSchema>;
export type TermsStepValues = z.infer<typeof TermsStepSchema>;
export type ProfileStepValues = z.infer<typeof ProfileStepSchema>;
export type VerifyEmailStepValues = z.infer<typeof VerifyEmailStepSchema>;
//# sourceMappingURL=register.d.ts.map
