import { z } from "zod";

export const CreateUser = z.object({
	email: z
		.string({
			error: (issue) => (issue.input === undefined ? "Email is required." : "Invalid input."),
		})
		.min(1, { error: "Email is required." })
		.pipe(z.email({ error: "Invalid email." }))
		.transform((val) => val.toLowerCase().trim()),
	name: z
		.string({
			error: (issue) => (issue.input === undefined ? "Name is missing." : "Invalid name."),
		})
		.min(1, { error: "Name is required." }),
	password: z
		.string({
			error: (issue) => (issue.input === undefined ? "Password is missing." : "Invalid password."),
		})
		.min(8, { error: "Password is too weak." }),
	slug: z
		.string({
			error: (issue) => (issue.input === undefined ? "Slug is missing." : "Invalid slug."),
		})
		.min(1, { error: "Slug is required." })
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
			error: "Slug can only contain lowercase letters, numbers and hyphens.",
		}),
});

export const AccountStepSchema = CreateUser.pick({ email: true });
export const PasswordStepSchema = CreateUser.pick({ password: true });
export const TermsStepSchema = z.object({
	acceptedTerms: z.literal(true, { error: "You must accept the terms to continue." }),
});
export const ProfileStepSchema = CreateUser.pick({ name: true, slug: true });
