import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HAS_NUMBER = /\d/;
export const PASSWORD_HAS_SYMBOL = /[^A-Za-z0-9]/;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateUser = z.object({
	email: z
		.string({ error: "email.required" })
		.min(1, { error: "email.required" })
		.pipe(z.email({ error: "email.invalid" }))
		.transform((val) => val.toLowerCase().trim()),
	name: z
		.string({ error: "name.required" })
		.min(1, { error: "name.required" })
		.transform((val) => val.trim()),
	surname: z
		.string({ error: "surname.required" })
		.min(1, { error: "surname.required" })
		.transform((val) => val.trim()),
	password: z
		.string({ error: "password.required" })
		.min(PASSWORD_MIN_LENGTH, { error: "password.min" })
		.regex(PASSWORD_HAS_NUMBER, { error: "password.number" })
		.regex(PASSWORD_HAS_SYMBOL, { error: "password.symbol" }),
	confirmPassword: z.string({ error: "confirmPassword.required" }).min(1, { error: "confirmPassword.required" }),
	slug: z
		.string({ error: "slug.required" })
		.min(1, { error: "slug.required" })
		.regex(SLUG_PATTERN, { error: "slug.pattern" }),
});

export const AccountStepSchema = CreateUser.pick({ email: true });

export const PasswordStepSchema = CreateUser.pick({
	password: true,
	confirmPassword: true,
}).refine((d) => d.password === d.confirmPassword, {
	message: "confirmPassword.mismatch",
	path: ["confirmPassword"],
});

export const TermsStepSchema = z.object({
	acceptedTerms: z.literal(true, { error: "terms.required" }),
	marketingOptIn: z.boolean(),
});

export const ProfileStepSchema = CreateUser.pick({
	name: true,
	surname: true,
	slug: true,
});

export type CreateUserInput = z.infer<typeof CreateUser>;
export type AccountStepValues = z.infer<typeof AccountStepSchema>;
export type PasswordStepValues = z.infer<typeof PasswordStepSchema>;
export type TermsStepValues = z.infer<typeof TermsStepSchema>;
export type ProfileStepValues = z.infer<typeof ProfileStepSchema>;
