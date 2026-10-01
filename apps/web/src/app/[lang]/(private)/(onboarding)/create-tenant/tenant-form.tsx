"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	CreateTenantRequestSchema,
	TENANT_NAME_MAX_LENGTH,
} from "@planici/schemas";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import type z from "zod";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import type { ComboboxOption as ItemsType } from "@/components/combobox";
import { Combobox } from "@/components/combobox";
import { Input } from "@/components/input";
import { Logo } from "@/components/logo";
import { useRouter } from "@/i18n/navigation";
import { createTenant } from "@/lib/api/tenants";
import { useFieldError } from "@/lib/form";

/*
type NamingData = {
	client: string;
	services: string;
	scheduling: string;
};

export const PROFESSIONS = ["therapy", "drawing"] as const;

// --- Tenant Flow ---
type TenantStep = "profession" | "naming";
type TenantData = {
	profession: ProfessionData | null;
	naming: NamingData;
};

const STEPS: TenantStep[] = ["profession", "naming"];

const STEP_META: Record<TenantStep, { title: string; subtitle: string }> = {
	profession: {
		title: "tenant.profession.title",
		subtitle: "tenant.profession.subtitle",
	},
	naming: {
		title: "tenant.naming.title",
		subtitle: "tenant.naming.subtitle",
	},
};

const _INITIAL_PROFESSION_DATA: ProfessionData = {
	label: "tenant.profession.initial.label",
	value: "tenant.profession.initial.value",
	disabled: false,
};
const _INITIAL_NAMING_DATA: NamingData = {
	client: "tenant.naming.initial.client",
	services: "enant.naming.initial.services",
	scheduling: "enant.naming.initial.scheduling",
};

const INITIAL_DATA: TenantData = {
	profession: _INITIAL_PROFESSION_DATA,
	naming: _INITIAL_NAMING_DATA,
};

type StepProps = {
	defaultValues: TenantData;
	onNext: (values: Partial<TenantData>) => void;
	onBack: () => void;
	isFirst: boolean;
	isLast: boolean;
	isSubmitting: boolean;
};

type OPTION = { value: string; label: string };
const options: OPTION[] = [
	{ label: "Terapeuta", value: "therapy" },
	{ label: "Desenhista", value: "drawing" },
];

const SUGGESTIONS: Record<string, NamingData> = {
	therapy: {
		client: "tenant.naming.therapy.client",
		services: "tenant.naming.therapy.services",
		scheduling: "tenant.naming.therapy.scheduling",
	},
	drawing: {
		client: "tenant.naming.drawing.client",
		services: "tenant.naming.drawing.services",
		scheduling: "tenant.naming.drawing.scheduling",
	},
};

function ProfessionStep({ defaultValues, onNext, isSubmitting }: StepProps) {
	const [profession, setProfession] = useState<ProfessionData | null>(
		defaultValues.profession,
	);

	return (
		<form className="flex flex-col gap-5 items-center w-full">
			<Combobox
				label="Qual sua Profissão?"
				items={options}
				value={profession}
				onValueChange={setProfession}
			/>
			<Button
				type="submit"
				text="Confirmar"
				variant="primary"
				disabled={!profession || isSubmitting}
			/>
		</form>
	);
}

function NamingStep({
	defaultValues,
	onNext,
	onBack,
	isSubmitting,
}: StepProps) {
	const suggestion = SUGGESTIONS[defaultValues.profession] ?? "clientes";
	const [label, setLabel] = useState(defaultValues.naming || suggestion);
	const [personalizing, setPersonalizing] = useState(false);
	const useSuggestion = label === suggestion;

	return (
		<form className="flex flex-col gap-5 items-center w-full">
			<div className="flex flex-col gap-4">
				<h1 className="text-text-primary font-heading-md">Sugestões</h1>
				<div className="flex flex-col">
					<div className="flex gap-1 items-center">
						<div className="flex min-w-35 gap-2 p-1">
							<UserIcon className="text-icon-disabled" />
							<span className="text-text-disabled font-body-sm font-medium">
								clientes
							</span>
						</div>
						{useSuggestion ? (
							<ArrowBigRightDash className="text-icon-brand" />
						) : (
							<ArrowBigLeftDash className="text-icon" />
						)}
						{}
						<div className="flex min-w-35 gap-2 p-1">
							<UserIcon className="text-icon" />
							<input
								className="text-text-primary font-body-sm font-medium"
								readOnly={!personalizing}
								defaultValue={"clientes"}
							/>
						</div>
					</div>
				</div>
			</div>
		</form>
	);
}

*/

const TenantFormSchema = CreateTenantRequestSchema.pick({ name: true });
type TenantFormValues = z.infer<typeof TenantFormSchema>;

export function TenantForm() {
	const t = useTranslations("tenants.create");
	const fieldError = useFieldError();
	const router = useRouter();
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting, isSubmitSuccessful },
	} = useForm<TenantFormValues>({
		resolver: zodResolver(TenantFormSchema),
		defaultValues: { name: "" },
		mode: "onBlur",
	});
	const busy = isSubmitting || isSubmitSuccessful;

	async function submit({ name }: TenantFormValues) {
		const result = await createTenant(name);

		if (!result.ok) {
			setError(
				result.field === "name" ? "name" : "root",
				{ type: "server", message: result.error },
				{ shouldFocus: result.field === "name" },
			);
			return;
		}

		router.replace(`/orgs/${encodeURIComponent(result.tenant.slug)}/clients`);
		router.refresh();
	}

	const _suggestions: ItemsType[] = [
		{
			label: "Uso pessoal",
			value: "personal",
		},
		{
			label: "Trabalho",
			value: "work",
		},
		{
			label: "Outro",
			value: "other",
		},
	];

	return (
		<div className="flex flex-col gap-8 justify-center items-center max-w-lg w-full">
			<div className="flex flex-col gap-12 items-center">
				<div className="flex flex-col gap-12 items-center">
					<Logo className="h-8 w-auto" />
				</div>
				<div className="flex flex-col gap-1 items-center">
					<h1 tabIndex={-1} className="font-heading-lg">
						{t("title")}
					</h1>
					<span className="font-body-md text-text-accent-gray text-center">
						{t("description")}
					</span>
				</div>
			</div>

			<form
				noValidate
				onSubmit={handleSubmit(submit)}
				aria-busy={busy}
				className="flex flex-col gap-5 items-center w-full"
			>
				{errors.root?.message && (
					<Alert tone="danger">{fieldError(errors.root.message)}</Alert>
				)}
				<div>
					<Input
						{...register("name")}
						label={t("name")}
						autoComplete="organization"
						maxLength={TENANT_NAME_MAX_LENGTH}
						readOnly={busy}
						required
						status={errors.name ? "error" : "default"}
						help={fieldError(errors.name?.message)}
						className="min-w-8"
					/>
					<Combobox
						items={_suggestions}
						label="Qual o propósito dessa organização?"
					/>
					<Button
						type="submit"
						text={t(busy ? "submitting" : "submit")}
						variant="primary"
						disabled={busy}
					/>
				</div>
			</form>
		</div>
	);
}
