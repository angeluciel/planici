// Error keys that mean the session is gone and cannot be renewed: the caller
// should send the user to sign in again (SPEC-0008 §6).
const SIGNED_OUT = new Set([
	"session.expired",
	"token.invalid",
	"token.expired",
]);

export function isSignedOut(error: string): boolean {
	return SIGNED_OUT.has(error);
}
