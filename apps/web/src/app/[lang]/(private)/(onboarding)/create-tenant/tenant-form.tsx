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

		router.replace(`/orgs/${result.tenant.id}/clients`);
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
