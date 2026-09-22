import {
	AccountStepSchema,
	PasswordStepSchema,
	ProfileStepSchema,
	TermsStepSchema,
} from "@planici/schemas";
import {
	type GoogleProfile,
	REGISTER_STEPS,
	type RegisterData,
	type RegisterStep,
} from "@/types/register";
import { TERMS_VERSION } from "./legal";

type StepMeta = {
	translationKey: string;
	inStepper: boolean;
	isSkipped: (data: RegisterData) => boolean;
	isComplete: (data: RegisterData) => boolean;
};

const isGoogle = (data: RegisterData) => data.provider === "google";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function hasEmailProof(data: RegisterData, now = Date.now()): boolean {
	return (
		data.provider === "email" &&
		Boolean(
			data.emailVerificationToken &&
				data.emailVerificationExpiresAt &&
				data.verifiedEmail === normalizeEmail(data.email) &&
				Date.parse(data.emailVerificationExpiresAt) > now,
		)
	);
}

export function hasGoogleCredential(
	data: RegisterData,
	now = Date.now(),
): boolean {
	return (
		isGoogle(data) &&
		Boolean(
			data.idToken &&
				data.idTokenExpiresAt &&
				data.verifiedEmail === normalizeEmail(data.email) &&
				Date.parse(data.idTokenExpiresAt) > now,
		)
	);
}

export const CLEARED_PROOF = {
	confirmedEmail: false,
	verifiedEmail: null,
	emailVerificationToken: null,
	emailVerificationExpiresAt: null,
	idToken: null,
	idTokenExpiresAt: null,
} as const;

export const STEP_META: Record<RegisterStep, StepMeta> = {
	account: {
		translationKey: "first",
		inStepper: true,
		isSkipped: () => false,
		isComplete: (data) =>
			AccountStepSchema.safeParse(data).success &&
			(!isGoogle(data) || hasGoogleCredential(data)),
	},
	verify: {
		translationKey: "verify",
		inStepper: false,
		isSkipped: (data) => isGoogle(data) || hasEmailProof(data),
		isComplete: () => false,
	},
	password: {
		translationKey: "second",
		inStepper: true,
		isSkipped: isGoogle,
		isComplete: (data) => PasswordStepSchema.safeParse(data).success,
	},
	terms: {
		translationKey: "third",
		inStepper: true,
		isSkipped: () => false,
		isComplete: (data) =>
			TermsStepSchema.safeParse(data).success &&
			data.termsVersion === TERMS_VERSION &&
			Boolean(data.acceptedTermsAt),
	},
	profile: {
		translationKey: "fourth",
		inStepper: true,
		isSkipped: () => false,
		isComplete: (data) => ProfileStepSchema.safeParse(data).success,
	},
};

export function activeSteps(data: RegisterData): RegisterStep[] {
	return REGISTER_STEPS.filter((slug) => !STEP_META[slug].isSkipped(data));
}

export function stepperSteps(data: RegisterData): RegisterStep[] {
	return activeSteps(data).filter((slug) => STEP_META[slug].inStepper);
}

function furthestReachable(data: RegisterData): number {
	const active = activeSteps(data);
	const firstIncomplete = active.findIndex(
		(slug) => !STEP_META[slug].isComplete(data),
	);

	return firstIncomplete === -1 ? active.length - 1 : firstIncomplete;
}

export function resolveStep(
	data: RegisterData,
	requested: string | null,
): RegisterStep {
	const active = activeSteps(data);
	const furthest = furthestReachable(data);
	const requestedIndex = active.indexOf(requested as RegisterStep);
	const index =
		requestedIndex === -1 ? furthest : Math.min(requestedIndex, furthest);

	return active[index] ?? active[0];
}

export function nextStep(
	data: RegisterData,
	current: RegisterStep,
): RegisterStep | null {
	const from = REGISTER_STEPS.indexOf(current);

	return (
		activeSteps(data).find((slug) => REGISTER_STEPS.indexOf(slug) > from) ??
		null
	);
}

export function previousStep(
	data: RegisterData,
	current: RegisterStep,
): RegisterStep | null {
	const from = REGISTER_STEPS.indexOf(current);

	return (
		activeSteps(data).findLast((slug) => REGISTER_STEPS.indexOf(slug) < from) ??
		null
	);
}

export function stepperPosition(
	data: RegisterData,
	current: RegisterStep,
): number {
	const from = REGISTER_STEPS.indexOf(current);
	const passed = stepperSteps(data).filter(
		(slug) => REGISTER_STEPS.indexOf(slug) <= from,
	).length;

	return Math.max(1, passed);
}

export function stampStep(
	slug: RegisterStep,
	previous: RegisterData,
	values: Partial<RegisterData>,
): Partial<RegisterData> {
	if (slug === "terms") {
		return {
			...values,
			termsVersion: TERMS_VERSION,
			acceptedTermsAt: new Date().toISOString(),
		};
	}

	if (
		slug === "account" &&
		values.provider !== "google" &&
		(normalizeEmail(values.email ?? previous.email) !==
			normalizeEmail(previous.email) ||
			previous.provider !== "email")
	) {
		return {
			...values,
			...CLEARED_PROOF,
			provider: "email",
			codeRequestedAt: null,
			codeResendAt: null,
		};
	}

	return values;
}

export function applyGoogleProfile(
	profile: GoogleProfile,
): Partial<RegisterData> {
	return {
		...CLEARED_PROOF,
		provider: "google",
		email: normalizeEmail(profile.email),
		verifiedEmail: normalizeEmail(profile.email),
		name: profile.name,
		surname: profile.surname,
		confirmedEmail: true,
		idToken: profile.idToken,
		idTokenExpiresAt: profile.expiresAt,
		password: "",
		confirmPassword: "",
		codeRequestedAt: null,
		codeResendAt: null,
	};
}
