/**
 * Error codes the API returns in { error, field? }
 *
 * They're i18n keys the web app reads
 * */
export declare const AUTH_ERROR_CODES: readonly [
	"email.taken",
	"slug.taken",
	"credentials.invalid",
	"account.locked",
	"account.inactive",
	"account.no-password",
	"code.invalid",
	"code.expired",
	"code.attempts",
	"code.rate-limited",
	"token.invalid",
	"token.expired",
	"session.expired",
	"google.unavailable",
	"google.invalid",
	"unexpected",
];
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
export type ApiErrorBody = {
	error: AuthErrorCode | string;
	field?: string;
};
//# sourceMappingURL=errors.d.ts.map
