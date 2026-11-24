"use client";

import type { FormTemplateSummary, FormType } from "@planici/schemas";
import { FORM_TYPES } from "@planici/schemas";
import { EllipsisVerticalIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { archiveForm, listForms, unarchiveForm } from "@/lib/api/forms";
import { cn } from "@/lib/utils";
import { ArchiveDialog } from "./archive-dialog";
import { DeleteDialog } from "./delete-dialog";
import { EmptyState } from "./empty-state";

type Status = "loading" | "error" | "ready";
type Dialog =
	| { kind: "archive"; form: FormTemplateSummary }
	| { kind: "delete"; form: FormTemplateSummary }
	| null;

export function FormsList() {
	const t = useTranslations("forms");
	const toast = useToast();
	const { tenant } = useParams<{ tenant: string }>();
	const [includeArchived, setIncludeArchived] = useState(false);
	const [status, setStatus] = useState<Status>("loading");
	const [forms, setForms] = useState<FormTemplateSummary[]>([]);
	const [dialog, setDialog] = useState<Dialog>(null);
	const [unarchiving, setUnarchiving] = useState<ReadonlySet<string>>(
		new Set(),
	);
	const latest = useRef(0);

	const load = useCallback(
		async (quiet: boolean) => {
			latest.current += 1;
			const request = latest.current;
			if (!quiet) setStatus("loading");

			const result = await listForms({ includeArchived });
			if (request !== latest.current) return;

			if (result.ok) {
				setForms(result.forms);
				setStatus("ready");
			} else if (!quiet) {
				setStatus("error");
			}
		},
		[includeArchived],
	);

	useEffect(() => {
		void load(false);
	}, [load]);

	async function unarchive(form: FormTemplateSummary) {
		setUnarchiving((current) => new Set(current).add(form.id));
		const result = await unarchiveForm(form.id);
		setUnarchiving((current) => {
			const next = new Set(current);
			next.delete(form.id);
			return next;
		});

		if (result.ok) {
			toast.show(t("toast.unarchived"));
			void load(true);
		} else {
			toast.show(t("unarchive.failed"), "danger");
		}
	}

	const base = `/orgs/${tenant}/forms`;
	const hasForms = forms.length > 0;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-heading-md text-text-bold">{t("list.title")}</h1>
				{hasForms && (
					<Link
						href={`${base}/new`}
						className="link-button link-button-primary"
					>
						{t("actions.new")}
					</Link>
				)}
			</div>

			<Checkbox
				label={t("list.showArchived")}
				checked={includeArchived}
				onChange={(event) => setIncludeArchived(event.target.checked)}
			/>

			{status === "loading" && (
				<output
					aria-label={t("list.loading")}
					aria-busy="true"
					className="flex flex-col gap-3"
				>
					{[0, 1, 2].map((index) => (
						<Skeleton key={index} className="h-20 w-full" />
					))}
				</output>
			)}

			{status === "error" && (
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("list.error")}</Alert>
					<Button
						variant="subtle"
						text={t("actions.retry")}
						className="w-auto"
						onPress={() => void load(false)}
					/>
				</div>
			)}

			{status === "ready" &&
				(forms.length === 0 ? (
					<EmptyState base={base} />
				) : (
					FORM_TYPES.map((type) => (
						<TypeGroup
							key={type}
							type={type}
							forms={forms.filter((form) => form.type === type)}
							base={base}
							unarchiving={unarchiving}
							onArchive={(form) => setDialog({ kind: "archive", form })}
							onUnarchive={unarchive}
							onDelete={(form) => setDialog({ kind: "delete", form })}
						/>
					))
				))}

			{dialog?.kind === "archive" && (
				<ArchiveDialog
					onCancel={() => setDialog(null)}
					onArchive={async () => {
						const result = await archiveForm(dialog.form.id);
						if (!result.ok) return result.error;
						toast.show(t("toast.archived"));
						setDialog(null);
						void load(true);
						return null;
					}}
				/>
			)}
			{dialog?.kind === "delete" && (
				<DeleteDialog
					subject={dialog.form}
					onCancel={() => setDialog(null)}
					onDeleted={() => {
						setDialog(null);
						void load(true);
					}}
					onArchived={() => {
						setDialog(null);
						void load(true);
					}}
				/>
			)}
		</div>
	);
}

function TypeGroup({
	type,
	forms,
	base,
	unarchiving,
	onArchive,
	onUnarchive,
	onDelete,
}: Readonly<{
	type: FormType;
	forms: FormTemplateSummary[];
	base: string;
	unarchiving: ReadonlySet<string>;
	onArchive: (form: FormTemplateSummary) => void;
	onUnarchive: (form: FormTemplateSummary) => void;
	onDelete: (form: FormTemplateSummary) => void;
}>) {
	const t = useTranslations("forms");

	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-heading-xs text-text-bold">
				{type === "client" ? t("list.groupClient") : t("list.groupService")}
			</h2>

			{forms.length === 0 ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-sunken p-4">
					<p className="font-body-sm text-text-secondary">
						{t("list.empty", { type })}
					</p>
					<Link
						href={`${base}/new?type=${type}`}
						className="link-button link-button-primary"
					>
						{t("actions.new")}
					</Link>
				</div>
			) : (
				<ul className="flex flex-col gap-3">
					{forms.map((form) => {
						const archived = form.status === "archived";
						return (
							<li
								key={form.id}
								className="relative flex items-start gap-3 rounded-md bg-surface-raised hover:bg-surface-raised-hovered p-4 shadow-raised"
							>
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<div className="flex flex-wrap items-center gap-2">
										{/* the ::after overlay makes the whole card open the template */}
										<Link
											href={`${base}/${form.id}`}
											className="font-body-sm font-medium text-text-link after:absolute after:inset-0 after:rounded-md hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
										>
											{form.name}
										</Link>
										{archived && (
											<span className="rounded-sm bg-background-accent-gray-subtler px-2 font-body-xs text-text-accent-gray-bolder">
												{t("list.archivedBadge")}
											</span>
										)}
									</div>

									{/* lozenges */}
									<div className="flex gap-1">
										<span
											className={cn(
												"font-body-xs font-semibold rounded-xs py-0.5 px-1 w-fit",
												form.fieldCount
													? "bg-background-accent-green-bold text-text-inverse"
													: "border border-border-disabled text-text-disabled",
											)}
										>
											{t("list.fieldCount", { count: form.fieldCount })}
										</span>
										<span
											className={cn(
												"font-body-xs font-semibold rounded-xs py-0.5 px-1 w-fit text-text-inverse",
												form.fieldCount
													? "bg-background-accent-green-subtle text-text-inverse"
													: "border border-border-disabled text-text-disabled",
											)}
										>
											{t("list.recordCount", { count: form.recordCount })}
										</span>
									</div>

									{form.description && (
										<p className="line-clamp-2 font-body-sm text-text-secondary">
											{form.description}
										</p>
									)}
								</div>

								{/* above the link's overlay, so the menu gets the click */}
								<div className="relative z-10">
									<Menu
										label={t("list.actionsFor", { name: form.name })}
										trigger={
											<EllipsisVerticalIcon
												aria-hidden="true"
												className="size-4"
											/>
										}
									>
										{archived ? (
											<MenuItem
												disabled={unarchiving.has(form.id)}
												onSelect={() => onUnarchive(form)}
											>
												{t("actions.unarchive")}
											</MenuItem>
										) : (
											<MenuItem onSelect={() => onArchive(form)}>
												{t("actions.archive")}
											</MenuItem>
										)}
										<MenuItem onSelect={() => onDelete(form)}>
											{t("actions.delete")}
										</MenuItem>
									</Menu>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
