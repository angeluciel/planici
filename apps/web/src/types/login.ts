import type { EmailLoginData } from "@planici/schemas";

export type LoginData =
	| EmailLoginData
	| { provider: "google"; idToken: string; rememberMe: boolean };

export const EMPTY_LOGIN_DATA: EmailLoginData = {
	provider: "email",
	email: "",
	password: "",
	rememberMe: false,
};
