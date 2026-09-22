export const REGISTER_STEPS = [
	"account",
	"verify",
	"password",
	"terms",
	"profile",
] as const;
export type RegisterStep = (typeof REGISTER_STEPS)[number];

export type RegisterProvider = "email" | "google";

export type GoogleProfile = {
	email: string;
	name: string;
	surname: string;
	idToken: string;
	expiresAt: string;
};

export type RegisterData = {
	email: string;
	password: string;
	confirmPassword: string;
	name: string;
	surname: string;
	slug: string;

	provider: RegisterProvider;

	confirmedEmail: boolean;
	verifiedEmail: string | null;
	emailVerificationToken: string | null;
	emailVerificationExpiresAt: string | null;
	idToken: string | null;
	idTokenExpiresAt: string | null;
	codeRequestedAt: string | null;
	codeResendAt: string | null;

	acceptedTerms: boolean;
	marketingOptIn: boolean;
	termsVersion: string;
	acceptedTermsAt: string | null;
};

export const EMPTY_REGISTER_DATA: RegisterData = {
	email: "",
	password: "",
	confirmPassword: "",
	name: "",
	surname: "",
	slug: "",
	provider: "email",
	confirmedEmail: false,
	verifiedEmail: null,
	emailVerificationToken: null,
	emailVerificationExpiresAt: null,
	idToken: null,
	idTokenExpiresAt: null,
	codeRequestedAt: null,
	codeResendAt: null,
	acceptedTerms: false,
	marketingOptIn: false,
	termsVersion: "",
	acceptedTermsAt: null,
};

export type StepProps = {
	defaultValues: RegisterData;
	onNext: (values: Partial<RegisterData>) => void;
	onBack: () => void;
	isFirst: boolean;
	isLast: boolean;
	isSubmitting: boolean;
	serverError?: { error: string; field?: string } | null;
};

export type StepDefinition = {
	slug: RegisterStep;
	label: string;
	Component: React.ComponentType<StepProps>;
};

export type VerifyStepProps = StepProps & {
	onResend: () => void;
	isSending: boolean;
	sendError: string | null;
};
