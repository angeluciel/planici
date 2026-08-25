export const REGISTER_STEPS = [
	"account",
	"password",
	"terms",
	"profile",
] as const;
export type RegisterStep = (typeof REGISTER_STEPS)[number];

export type RegisterData = {
	email: string;
	password: string;
	confirmPassword: string;
	name: string;
	surname: string;
	slug: string;
	acceptedTerms: boolean;
};

export const EMPTY_REGISTER_DATA: RegisterData = {
	email: "",
	password: "",
	confirmPassword: "",
	name: "",
	surname: "",
	slug: "",
	acceptedTerms: false,
};

export type StepProps = {
	defaultValues: RegisterData;
	onNext: (values: Partial<RegisterData>) => void;
	onBack: () => void;
	isFirst: boolean;
	isLast: boolean;
};

export type StepDefinition = {
	slug: RegisterStep;
	label: string;
	Component: React.ComponentType<StepProps>;
};
