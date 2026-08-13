export type RegisterData = {
  email: string;
  password: string;
  fullName: string;
  slug: string;
  acceptedTerms: boolean;
};

export const EMPTY_REGISTER_DATA: RegisterData = {
  email: "",
  password: "",
  fullName: "",
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
  slug: string;
  label: string;
  Component: React.ComponentType<StepProps>;
};
