import { z } from "zod";
export declare const PasswordSchema: z.ZodString;
export declare const CodeSchema: z.ZodString;
export declare const RequestEmailCodeSchema: z.ZodObject<
	{
		email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
	},
	z.core.$strip
>;
export declare const VerifyEmailCodeSchema: z.ZodObject<
	{
		email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
		code: z.ZodString;
	},
	z.core.$strip
>;
export declare const ConsentSchema: z.ZodObject<
	{
		acceptedTerms: z.ZodLiteral<true>;
		marketingOptIn: z.ZodBoolean;
		termsVersion: z.ZodString;
		acceptedAt: z.ZodISODateTime;
	},
	z.core.$strip
>;
export declare const RegisterRequestSchema: z.ZodIntersection<
	z.ZodObject<
		{
			email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
			name: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
			surname: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
			slug: z.ZodString;
			consent: z.ZodObject<
				{
					acceptedTerms: z.ZodLiteral<true>;
					marketingOptIn: z.ZodBoolean;
					termsVersion: z.ZodString;
					acceptedAt: z.ZodISODateTime;
				},
				z.core.$strip
			>;
		},
		z.core.$strip
	>,
	z.ZodDiscriminatedUnion<
		[
			z.ZodObject<
				{
					provider: z.ZodLiteral<"email">;
					password: z.ZodString;
					emailVerificationToken: z.ZodString;
				},
				z.core.$strip
			>,
			z.ZodObject<
				{
					provider: z.ZodLiteral<"google">;
					idToken: z.ZodString;
				},
				z.core.$strip
			>,
		],
		"provider"
	>
>;
export declare const LoginRequestSchema: z.ZodDiscriminatedUnion<
	[
		z.ZodObject<
			{
				provider: z.ZodLiteral<"email">;
				email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
				password: z.ZodString;
				rememberMe: z.ZodOptional<z.ZodBoolean>;
			},
			z.core.$strip
		>,
		z.ZodObject<
			{
				provider: z.ZodLiteral<"google">;
				idToken: z.ZodString;
				rememberMe: z.ZodOptional<z.ZodBoolean>;
			},
			z.core.$strip
		>,
	],
	"provider"
>;
export declare const RefreshRequestSchema: z.ZodObject<
	{
		refreshToken: z.ZodString;
	},
	z.core.$strip
>;
export declare const ForgotPasswordSchema: z.ZodObject<
	{
		email: z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>;
	},
	z.core.$strip
>;
export declare const ResetPasswordSchema: z.ZodObject<
	{
		token: z.ZodString;
		password: z.ZodString;
	},
	z.core.$strip
>;
export declare const AvailabilityQuerySchema: z.ZodObject<
	{
		email: z.ZodOptional<z.ZodPipe<z.ZodPipe<z.ZodString, z.ZodEmail>, z.ZodTransform<string, string>>>;
		slug: z.ZodOptional<z.ZodString>;
	},
	z.core.$strip
>;
export type RequestEmailCodeInput = z.infer<typeof RequestEmailCodeSchema>;
export type VerifyEmailCodeInput = z.infer<typeof VerifyEmailCodeSchema>;
export type RegisterRequestInput = z.infer<typeof RegisterRequestSchema>;
export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;
export type RefreshRequestInput = z.infer<typeof RefreshRequestSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type AvailabilityQueryInput = z.infer<typeof AvailabilityQuerySchema>;
export type ConsentInput = z.infer<typeof ConsentSchema>;
//# sourceMappingURL=requests.d.ts.map
