/**
 * Error codes the API returns in { error, field? }
 *
 * They're i18n keys the web app reads
 * */

export const AUTH_ERROR_CODES = [
	// account
	"email.taken",
	"slug.taken",
	"credentials.invalid",
	"account.locked",
	"account.inactive",
	"account.no-password",

	// email verification
	"code.invalid",
	"code.expired",
	"code.attempts",
	"code.rate-limited",

	// signed tokens (email proof, password reset, refresh)
	"token.invalid",
	"token.expired",
	"session.expired",

	// google
	"google.unavailable",
	"google.invalid",

	// fallback
	"unexpected",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
export type ApiErrorBody = {
	error: AuthErrorCode | string;
	field?: string;
};
