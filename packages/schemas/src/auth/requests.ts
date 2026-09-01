import { z } from "zod";
import { EmailSchema } from "../common";
import {
	CreateUser,
	EMAIL_CODE_PATTERN,
	PASSWORD_HAS_NUMBER,
	PASSWORD_HAS_SYMBOL,
	PASSWORD_MIN_LENGTH,
} from "./register";

export const PasswordSchema = z
	.string({ error: "password.required " })
	.min(PASSWORD_MIN_LENGTH, { error: "password.min" })
	.regex(PASSWORD_HAS_NUMBER, { error: "password.number" })
	.regex(PASSWORD_HAS_SYMBOL, { error: "password.symbol" });

export const CodeSchema = z.string({ error: "code.required" }).regex(EMAIL_CODE_PATTERN, { error: "code.length" });

// POST /auth/email/code
export const RequestEmailCodeSchema = z.object({
	email: EmailSchema,
});
// POST /auth/email/verify
export const VerifyEmailCodeSchema = z.object({
	email: EmailSchema,
	code: CodeSchema,
});

export const ConsentSchema = z.object({
	acceptedTerms: z.literal(true, { error: "terms.required" }),
	marketingOptIn: z.boolean(),
	termsVersion: z.string().min(1),
	acceptedAt: z.iso.datetime(),
});

// POST /auth/register
export const RegisterRequestSchema = z
	.object({
		email: EmailSchema,
		name: CreateUser.shape.name,
		surname: CreateUser.shape.surname,
		slug: CreateUser.shape.slug,
		consent: ConsentSchema,
	})
	.and(
		z.discriminatedUnion("provider", [
			z.object({
				provider: z.literal("email"),
				password: PasswordSchema,
				emailVerificationToken: z.string({ error: "token.invalid" }).min(1, { error: "token.invalid" }),
			}),
			z.object({
				provider: z.literal("google"),
				idToken: z.string({ error: "google.invalid" }).min(1, { error: "google.invalid" }),
			}),
		]),
	);

// POST /auth/login
export const LoginRequestSchema = z.discriminatedUnion("provider", [
	z.object({
		provider: z.literal("email"),
		email: EmailSchema,
		password: z.string({ error: "password.required" }).min(1, { error: "password.required" }),
		rememberMe: z.boolean().optional(),
	}),
	z.object({
		provider: z.literal("google"),
		idToken: z.string({ error: "google.invalid" }).min(1, { error: "google.invalid" }),
		rememberMe: z.boolean().optional(),
	}),
]);

// POST /auth/refresh and POST /auth/logout
export const RefreshRequestSchema = z.object({
	refreshToken: z.string({ error: "token.invalid" }).min(1, { error: "token.invalid" }),
});

// POST /auth/password/forgot
export const ForgotPasswordSchema = z.object({
	email: EmailSchema,
});

// POST /auth/password/reset
export const ResetPasswordSchema = z.object({
	token: z.string({ error: "token.invalid" }).min(1, { error: "token.invalid" }),
	password: PasswordSchema,
});

// GET /auth/availability?Email= | ?slug=
export const AvailabilityQuerySchema = z
	.object({
		email: EmailSchema.optional(),
		slug: CreateUser.shape.slug.optional(),
	})
	.refine((q) => Boolean(q.email) !== Boolean(q.slug), {
		message: "unexpected",
	});

export type RequestEmailCodeInput = z.infer<typeof RequestEmailCodeSchema>;
export type VerifyEmailCodeInput = z.infer<typeof VerifyEmailCodeSchema>;
export type RegisterRequestInput = z.infer<typeof RegisterRequestSchema>;
export type LoginRequestInput = z.infer<typeof LoginRequestSchema>;
export type RefreshRequestInput = z.infer<typeof RefreshRequestSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type AvailabilityQueryInput = z.infer<typeof AvailabilityQuerySchema>;
export type ConsentInput = z.infer<typeof ConsentSchema>;
